import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * Thin wrapper around Wasabi (S3-compatible) object storage. Presigned URLs
 * let the browser upload/download directly to Wasabi — file bytes never pass
 * through this API.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.WASABI_BUCKET ?? "";
    this.client = new S3Client({
      endpoint: process.env.WASABI_ENDPOINT,
      region: process.env.WASABI_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY ?? "",
      },
    });
  }

  /** Builds a storage key namespaced by org, so listing/cleanup can scope by prefix. */
  buildKey(organizationId: string, fileName: string): string {
    return `org/${organizationId}/${randomUUID()}-${fileName}`;
  }

  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  }

  async getDownloadUrl(key: string, downloadName?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: downloadName
        ? `attachment; filename="${downloadName}"`
        : undefined,
    });
    return getSignedUrl(this.client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
  }

  /** Best-effort delete — storage being briefly unavailable shouldn't block removing the DB record. */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete storage object ${key}: ${(err as Error).message}`);
    }
  }
}
