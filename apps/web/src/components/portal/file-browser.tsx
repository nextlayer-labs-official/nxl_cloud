"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  File as FileIcon,
  Folder as FolderIcon,
  FolderPlus,
  Loader2,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { BreadcrumbEntry, FileItem, FolderItem } from "@/types/portal";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

interface FileBrowserProps {
  folderId?: string;
}

export function FileBrowser({ folderId }: FileBrowserProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = folderId ? `?parentId=${folderId}` : "";
      const [contents, crumb] = await Promise.all([
        api.get<{ folders: FolderItem[]; files: FileItem[] }>(`/folders${query}`),
        folderId
          ? api.get<BreadcrumbEntry[]>(`/folders/${folderId}/breadcrumb`)
          : Promise.resolve([]),
      ]);
      setFolders(contents.folders);
      setFiles(contents.files);
      setBreadcrumb(crumb);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this folder.");
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setCreatingFolder(false);
      return;
    }
    setActionError(null);
    try {
      await api.post("/folders", { name, parentId: folderId });
      setNewFolderName("");
      setCreatingFolder(false);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't create the folder.");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setActionError(null);
    setUploading(true);
    try {
      const { uploadUrl, storageKey } = await api.post<{ uploadUrl: string; storageKey: string }>(
        "/files/upload-url",
        {
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          folderId,
        },
      );

      const uploadFailedMessage =
        "Upload to storage failed. If Wasabi credentials aren't configured yet (or the bucket's CORS policy doesn't allow this origin), this is expected.";
      let putRes: Response;
      try {
        putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
      } catch {
        // A CORS rejection or network failure throws before a response exists at all.
        throw new Error(uploadFailedMessage);
      }
      if (!putRes.ok) {
        throw new Error(uploadFailedMessage);
      }

      await api.post("/files", {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        folderId,
        storageKey,
      });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file: FileItem) {
    setActionError(null);
    try {
      const { downloadUrl } = await api.get<{ downloadUrl: string }>(
        `/files/${file.id}/download-url`,
      );
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't get a download link.");
    }
  }

  async function handleShare(file: FileItem) {
    setActionError(null);
    try {
      const { url } = await api.post<{ url: string }>(`/files/${file.id}/share`);
      setShareUrl(url);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't create a share link.");
    }
  }

  async function handleDeleteFile(file: FileItem) {
    if (!window.confirm(`Delete "${file.name}"? This can't be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/files/${file.id}`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete the file.");
    }
  }

  async function handleDeleteFolder(folder: FolderItem) {
    if (!window.confirm(`Delete "${folder.name}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/folders/${folder.id}`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete the folder.");
    }
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/portal" className="text-ink-700 font-medium">
          Home
        </Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-2">
            <span className="text-ink-400">/</span>
            <Link href={`/portal/folder/${crumb.id}`} className="text-ink-700 font-medium">
              {crumb.name}
            </Link>
          </span>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-3">
        {creatingFolder ? (
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") {
                setCreatingFolder(false);
                setNewFolderName("");
              }
            }}
            placeholder="Folder name"
            className="border-input rounded-lg border px-3.5 py-2 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="border-input text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            <FolderPlus className="h-4 w-4" />
            New folder
          </button>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={handleUpload} />
      </div>

      {(error || actionError) && (
        <div className="border-error-border bg-error-bg text-error-text mb-6 rounded-lg border p-3.5 text-[13px]">
          {error ?? actionError}
        </div>
      )}

      {shareUrl && (
        <div className="border-border-subtle bg-surface-muted mb-6 flex items-center gap-3 rounded-lg border p-3.5 text-[13px]">
          <span className="text-ink-700 flex-1 truncate">{shareUrl}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="text-primary cursor-pointer font-semibold"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => setShareUrl(null)}
            className="text-ink-450 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground py-16 text-center text-sm">Loading…</div>
      ) : isEmpty ? (
        <div className="text-muted-foreground py-16 text-center text-sm">This folder is empty.</div>
      ) : (
        <div className="border-border overflow-hidden rounded-xl border">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between border-b border-[oklch(0.94_0.005_260)] px-5 py-3.5 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => router.push(`/portal/folder/${folder.id}`)}
                className="flex flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <FolderIcon className="text-accent-foreground h-5 w-5" />
                <span className="text-[15px] font-medium">{folder.name}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFolder(folder)}
                className="text-ink-400 hover:text-error-text cursor-pointer"
                aria-label={`Delete ${folder.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between border-b border-[oklch(0.94_0.005_260)] px-5 py-3.5 last:border-b-0"
            >
              <div className="flex flex-1 items-center gap-3">
                <FileIcon className="text-ink-400 h-5 w-5" />
                <div>
                  <div className="text-[15px] font-medium">{file.name}</div>
                  <div className="text-ink-450 text-[13px]">{formatBytes(file.sizeBytes)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  className="text-ink-400 hover:text-foreground cursor-pointer"
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(file)}
                  className="text-ink-400 hover:text-foreground cursor-pointer"
                  aria-label={`Share ${file.name}`}
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFile(file)}
                  className="text-ink-400 hover:text-error-text cursor-pointer"
                  aria-label={`Delete ${file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
