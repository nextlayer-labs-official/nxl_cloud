"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Download, Share2, Star, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/types/portal";
import { FilePreviewModal } from "./file-preview-modal";
import { ShareModal } from "./share-modal";

/** "Recently touched" (org-wide, ordered by last modified), not "recently opened by me" — there's no per-user open-tracking, so this mirrors upload/modify recency rather than a personal history. */
export function RecentView() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<FileItem[]>("/files/recent");
      setFiles(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load recent files.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownload(file: FileItem) {
    setActionError(null);
    try {
      const { downloadUrl } = await api.get<{ downloadUrl: string }>(`/files/${file.id}/download-url`);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't get a download link.");
    }
  }

  async function handleToggleStar(file: FileItem) {
    setActionError(null);
    const path = `/files/${file.id}/star`;
    try {
      if (file.isStarred) await api.delete(path);
      else await api.post(path);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, isStarred: !f.isStarred } : f)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't update starred status.");
    }
  }

  const isEmpty = !loading && files.length === 0;

  return (
    <div>
      <h1 className="text-foreground mb-1.5 text-[26px] font-bold tracking-[-0.01em]">Recent</h1>
      <p className="text-ink-450 mb-8 text-sm">Files recently uploaded or modified across your organization.</p>

      {(error || actionError) && (
        <div className="border-error-border bg-error-bg text-error-text mb-6 flex items-center justify-between gap-3 rounded-xl border p-3.5 text-[13px]">
          <span>{error ?? actionError}</span>
          {!error && (
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="shrink-0 cursor-pointer opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-surface-muted h-56 animate-pulse rounded-xl" />
      ) : isEmpty ? (
        <div className="border-border-subtle flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <Clock className="text-ink-400 h-6 w-6" />
          </div>
          <p className="text-foreground text-[15px] font-semibold">Nothing recent yet</p>
          <p className="text-ink-450 mt-1 text-sm">Files you upload or edit will show up here.</p>
        </div>
      ) : (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border-subtle bg-surface-muted-2 border-b">
                <th className="text-ink-450 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase">Name</th>
                <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase sm:table-cell">
                  Size
                </th>
                <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase md:table-cell">
                  Modified
                </th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <tr
                    key={file.id}
                    className="group border-border-subtle hover:bg-surface-muted-2 border-b last:border-b-0"
                  >
                    <td className="cursor-pointer px-5 py-3" onClick={() => setPreviewFile(file)}>
                      <div className="flex items-center gap-3">
                        <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
                        <span className="text-foreground truncate text-[14px] font-medium hover:underline">
                          {file.name}
                        </span>
                        {file.isStarred && (
                          <Star className="fill-current text-warn h-3.5 w-3.5 shrink-0" aria-label="Starred" />
                        )}
                      </div>
                    </td>
                    <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap sm:table-cell">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap md:table-cell">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleToggleStar(file)}
                          className={cn(
                            "hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5",
                            file.isStarred ? "text-warn" : "text-ink-400",
                          )}
                          aria-label={file.isStarred ? `Remove ${file.name} from starred` : `Star ${file.name}`}
                        >
                          <Star className={cn("h-4 w-4", file.isStarred && "fill-current")} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShareTarget({ id: file.id, name: file.name })}
                          className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                          aria-label={`Share ${file.name}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                          aria-label={`Download ${file.name}`}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => handleDownload(previewFile)}
        />
      )}

      {shareTarget && (
        <ShareModal
          resourceType="file"
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onClose={() => setShareTarget(null)}
          onRevoked={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
