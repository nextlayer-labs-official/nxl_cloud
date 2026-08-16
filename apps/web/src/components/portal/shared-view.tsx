"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Folder as FolderIcon, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes, formatDate } from "@/lib/format";
import type { FileItem, SharedWithMeResults } from "@/types/portal";
import { FilePreviewModal } from "./file-preview-modal";
import { NavIcon } from "./nav-icon";

/** Mirrors starred-view.tsx's folder-grid + file-table layout, sourced from GET /folders/shared-with-me — items other people have granted this user direct access to. No share/delete affordances here; managing access stays with the owner. */
export function SharedView() {
  const [data, setData] = useState<SharedWithMeResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SharedWithMeResults>("/folders/shared-with-me");
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load shared items.");
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

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];
  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <h1 className="text-foreground mb-1.5 text-[26px] font-bold tracking-[-0.01em]">
        Shared with you
      </h1>
      <p className="text-ink-450 mb-8 text-sm">Files and folders other people share with you.</p>

      {(error || actionError) && (
        <div className="border-error-border bg-error-bg text-error-text mb-6 rounded-xl border p-3.5 text-[13px]">
          {error ?? actionError}
        </div>
      )}

      {loading ? (
        <div className="bg-surface-muted h-56 animate-pulse rounded-xl" />
      ) : isEmpty ? (
        <div className="border-border-subtle flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <Users className="text-ink-400 h-6 w-6" />
          </div>
          <p className="text-foreground text-[15px] font-semibold">Nothing shared with you yet</p>
          <p className="text-ink-450 mt-1 max-w-sm text-sm">
            Files and folders someone shares directly with your email will show up here.
          </p>
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">Folders</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {folders.map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/portal/folder/${folder.id}`}
                    className="border-border-subtle bg-background hover:border-border-strong flex items-center gap-3 rounded-xl border p-4 transition"
                  >
                    <div className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <NavIcon icon={FolderIcon} className="text-accent-foreground h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-foreground truncate text-[14px] font-medium">{folder.name}</span>
                      <div className="text-ink-450 truncate text-[12px]">shared by {folder.sharedByOrgName}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">Files</h2>
              <div className="border-border-subtle overflow-hidden rounded-xl border">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-border-subtle bg-surface-muted-2 border-b">
                      <th className="text-ink-450 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase">
                        Name
                      </th>
                      <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase sm:table-cell">
                        Shared by
                      </th>
                      <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase md:table-cell">
                        Size
                      </th>
                      <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase lg:table-cell">
                        Last modified
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
                            </div>
                          </td>
                          <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap sm:table-cell">
                            {file.sharedByOrgName}
                          </td>
                          <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap md:table-cell">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap lg:table-cell">
                            {formatDate(file.updatedAt)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
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
            </div>
          )}
        </>
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => handleDownload(previewFile)}
        />
      )}
    </div>
  );
}
