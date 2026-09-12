import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { getPlatformSettings } from "../platform-settings/platform-settings.util";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

interface StorageProviderConfig {
  client: S3Client;
  bucket: string;
}

/** One provider's env var prefix + the S3Client options built from it. */
function loadProvider(envPrefix: string): StorageProviderConfig | null {
  const bucket = process.env[`${envPrefix}_BUCKET`];
  if (!bucket) return null;
  return {
    bucket,
    client: new S3Client({
      endpoint: process.env[`${envPrefix}_ENDPOINT`],
      region: process.env[`${envPrefix}_REGION`] ?? "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env[`${envPrefix}_ACCESS_KEY_ID`] ?? "",
        secretAccessKey: process.env[`${envPrefix}_SECRET_ACCESS_KEY`] ?? "",
      },
    }),
  };
}

/**
 * Thin wrapper around one or more S3-compatible object storage providers.
 * Presigned URLs let the browser upload/download directly to storage — file
 * bytes never pass through this API.
 *
 * Supports switching which provider NEW uploads go to — live, from the admin
 * panel (PlatformSettings.defaultStorageProvider), no API restart required —
 * without stranding files already sitting in a different provider: every
 * File/FileVersion row records which provider it was actually uploaded to
 * (File.storageProvider), and downloads/deletes are resolved against that
 * file's own provider, not whatever the current default happens to be. This
 * is what let us fail over off a provider with a broken CORS policy without
 * migrating any existing files.
 *
 * "zata" is the original/default provider id (ZATA_* env vars) — every
 * existing row was uploaded here, back when the env vars were still named
 * WASABI_* even though the actual endpoint was always Zata; renamed for
 * clarity (see the migration that relabels existing rows). A second
 * provider, "wasabi" (an actual Wasabi bucket), is entirely optional: it
 * only exists if WASABI_BUCKET is set.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly providers = new Map<string, StorageProviderConfig>();

  constructor() {
    const zata = loadProvider("ZATA");
    if (zata) this.providers.set("zata", zata);
    const wasabi = loadProvider("WASABI");
    if (wasabi) this.providers.set("wasabi", wasabi);
  }

  /** Every provider id actually configured right now — what the admin panel offers as choices. */
  getAvailableProviderIds(): string[] {
    return [...this.providers.keys()];
  }

  /**
   * The provider id new uploads are currently signed against — stamp this
   * onto new File/FileVersion rows. Reads the live admin-set value on every
   * call (not cached) so a change in the admin panel takes effect
   * immediately, with no restart. If it points at a provider that isn't
   * actually configured, the resolveProvider() call right after this
   * (in getUploadUrl) throws a clear error rather than silently guessing.
   */
  async getDefaultProviderId(): Promise<string> {
    const settings = await getPlatformSettings();
    return settings.defaultStorageProvider;
  }

  private resolveProvider(providerId: string): StorageProviderConfig {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new BadRequestException(
        `Storage provider "${providerId}" isn't configured — check its env vars haven't been removed while files still reference it.`,
      );
    }
    return provider;
  }

  /**
   * Builds a storage key namespaced by the org's own slug, so each account
   * shows up as its own clearly-named top-level folder when browsing the
   * bucket directly (e.g. in the storage provider's own console) — not
   * nested under one shared "org/" prefix with an opaque id.
   */
  buildKey(orgSlug: string, fileName: string): string {
    return `${orgSlug}/${randomUUID()}-${fileName}`;
  }

  /** Always signs against the current default provider — the id returned must be persisted alongside the key so later downloads/deletes resolve the right provider. */
  async getUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; storageProvider: string }> {
    const storageProvider = await this.getDefaultProviderId();
    const provider = this.resolveProvider(storageProvider);
    const command = new PutObjectCommand({
      Bucket: provider.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(provider.client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
    return { uploadUrl, storageProvider };
  }

  async getDownloadUrl(
    storageProvider: string,
    key: string,
    downloadName?: string,
    inline = false,
  ): Promise<string> {
    const provider = this.resolveProvider(storageProvider);
    const command = new GetObjectCommand({
      Bucket: provider.bucket,
      Key: key,
      ResponseContentDisposition: downloadName
        ? `${inline ? "inline" : "attachment"}; filename="${downloadName}"`
        : undefined,
    });
    return getSignedUrl(provider.client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
  }

  /** Best-effort delete — storage being briefly unavailable shouldn't block removing the DB record. */
  async deleteObject(storageProvider: string, key: string): Promise<void> {
    try {
      const provider = this.resolveProvider(storageProvider);
      await provider.client.send(new DeleteObjectCommand({ Bucket: provider.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete storage object ${key} (provider ${storageProvider}): ${(err as Error).message}`);
    }
  }
}
