import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type {
  BreadcrumbEntry,
  CurrentUser,
  FileItem,
  FolderContents,
  FolderItem,
} from "../shared/types";

const API_URL = process.env.SKYLYER_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

async function readErrorMessage(res: Response): Promise<string | null> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return null;
}

/**
 * The only thing in this app that talks to the API. Runs in the Electron
 * main process (plain Node, not a browser) so CORS never applies here —
 * the renderer never makes an HTTP request itself, it goes through IPC to
 * this class instead. Holds the single session cookie manually since the
 * API only ever issues an httpOnly cookie, never a bearer token.
 */
export class ApiClient {
  private sessionToken: string | null = null;

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(this.sessionToken ? { Cookie: `session_token=${this.sessionToken}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new ApiError((await readErrorMessage(res)) ?? `Request failed (${res.status})`, res.status);
    }
    return (await res.json()) as T;
  }

  async login(email: string, password: string): Promise<CurrentUser> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new ApiError((await readErrorMessage(res)) ?? "Login failed.");
    }
    const setCookie = res.headers.get("set-cookie");
    const match = setCookie?.match(/session_token=([^;]+)/);
    if (!match) throw new ApiError("Login succeeded but no session was returned.");
    this.sessionToken = match[1];
    const body = (await res.json()) as { user: CurrentUser };
    return body.user;
  }

  async logout(): Promise<void> {
    if (this.sessionToken) {
      await this.request("/auth/logout", { method: "POST" }).catch(() => {});
    }
    this.sessionToken = null;
  }

  async getCurrentUser(): Promise<CurrentUser | null> {
    if (!this.sessionToken) return null;
    try {
      const body = await this.request<{ user: CurrentUser }>("/auth/me");
      return body.user;
    } catch {
      return null;
    }
  }

  async listFolder(parentId: string | null): Promise<FolderContents> {
    const query = parentId ? `?parentId=${parentId}` : "";
    return this.request<FolderContents>(`/folders${query}`);
  }

  async getBreadcrumb(folderId: string): Promise<BreadcrumbEntry[]> {
    return this.request<BreadcrumbEntry[]>(`/folders/${folderId}/breadcrumb`);
  }

  async listRecent(): Promise<FileItem[]> {
    return this.request<FileItem[]>("/files/recent");
  }

  async createFolder(name: string, parentId: string | null): Promise<FolderItem> {
    return this.request<FolderItem>("/folders", {
      method: "POST",
      body: JSON.stringify(parentId ? { name, parentId } : { name }),
    });
  }

  async renameFolder(id: string, name: string): Promise<FolderItem> {
    return this.request<FolderItem>(`/folders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  async renameFile(id: string, name: string): Promise<FileItem> {
    return this.request<FileItem>(`/files/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  async moveFolder(id: string, parentId: string | null): Promise<FolderItem> {
    return this.request<FolderItem>(`/folders/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify({ parentId }),
    });
  }

  async moveFile(id: string, folderId: string | null): Promise<FileItem> {
    return this.request<FileItem>(`/files/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify({ folderId }),
    });
  }

  async trashFolder(id: string): Promise<void> {
    await this.request(`/folders/${id}`, { method: "DELETE" });
  }

  async trashFile(id: string): Promise<void> {
    await this.request(`/files/${id}`, { method: "DELETE" });
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const body = await this.request<{ downloadUrl: string }>(`/files/${fileId}/download-url`);
    return body.downloadUrl;
  }

  /** Streams a presigned URL straight to disk without buffering the whole file in memory. */
  async downloadToPath(fileId: string, destPath: string): Promise<void> {
    const url = await this.getDownloadUrl(fileId);
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new ApiError(`Download failed (${res.status})`);
    await pipeline(res.body as unknown as Readable, createWriteStream(destPath));
  }

  async requestUploadUrl(
    name: string,
    mimeType: string,
    sizeBytes: number,
    folderId: string | null,
  ): Promise<{ uploadUrl: string; storageKey: string; storageProvider: string }> {
    return this.request("/files/upload-url", {
      method: "POST",
      body: JSON.stringify(folderId ? { name, mimeType, sizeBytes, folderId } : { name, mimeType, sizeBytes }),
    });
  }

  async putFile(uploadUrl: string, fileStream: Readable, mimeType: string): Promise<void> {
    // Node's fetch (undici) accepts a Readable body given `duplex: "half"`, which
    // isn't part of the DOM-lib RequestInit type this Node-only tsconfig has
    // available — cast to `any` rather than pulling in the DOM lib for one call.
    const init: any = {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: fileStream,
      duplex: "half",
    };
    const res = await fetch(uploadUrl, init);
    if (!res.ok) throw new ApiError(`Upload failed (${res.status})`);
  }

  async confirmUpload(params: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    folderId: string | null;
    storageKey: string;
    storageProvider: string;
  }): Promise<FileItem> {
    const { folderId, ...rest } = params;
    return this.request<FileItem>("/files", {
      method: "POST",
      body: JSON.stringify(folderId ? { ...rest, folderId } : rest),
    });
  }
}
