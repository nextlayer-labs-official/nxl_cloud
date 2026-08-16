"use client";

import { useCallback, useEffect, useState } from "react";
import { Folder as FolderIcon, RotateCcw, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes, formatDate } from "@/lib/format";
import type { TrashedFile, TrashedFolder } from "@/types/portal";
import { NavIcon } from "./nav-icon";

export function TrashView() {
  const [folders, setFolders] = useState<TrashedFolder[]>([]);
  const [files, setFiles] = useState<TrashedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [folderData, fileData] = await Promise.all([
        api.get<TrashedFolder[]>("/folders/trash"),
        api.get<TrashedFile[]>("/files/trash"),
      ]);
      setFolders(folderData);
      setFiles(fileData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load trash.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestoreFile(file: TrashedFile) {
    setActionError(null);
    try {
      await api.post(`/files/${file.id}/restore`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't restore the file.");
    }
  }

  async function handlePermanentDeleteFile(file: TrashedFile) {
    if (!window.confirm(`Permanently delete "${file.name}"? This can't be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/files/${file.id}/permanent`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete the file.");
    }
  }

  async function handleRestoreFolder(folder: TrashedFolder) {
    setActionError(null);
    try {
      await api.post(`/folders/${folder.id}/restore`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't restore the folder.");
    }
  }

  async function handlePermanentDeleteFolder(folder: TrashedFolder) {
    if (!window.confirm(`Permanently delete "${folder.name}" and everything inside it? This can't be undone.`))
      return;
    setActionError(null);
    try {
      await api.delete(`/folders/${folder.id}/permanent`);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete the folder.");
    }
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <div>
      <h1 className="text-foreground mb-1.5 text-[26px] font-bold tracking-[-0.01em]">Trash</h1>
      <p className="text-ink-450 mb-8 text-sm">
        Deleted files and folders stay here until you permanently delete them.
      </p>

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
            <Trash2 className="text-ink-400 h-6 w-6" />
          </div>
          <p className="text-foreground text-[15px] font-semibold">Trash is empty</p>
          <p className="text-ink-450 mt-1 text-sm">Deleted files and folders will show up here.</p>
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">Folders</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {folders.map((folder) => (
                  <div key={folder.id} className="group border-border-subtle relative rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                        <NavIcon icon={FolderIcon} className="text-accent-foreground h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate text-[14px] font-medium">{folder.name}</div>
                        <div className="text-ink-450 truncate text-[12px]">
                          Deleted {formatDate(folder.deletedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleRestoreFolder(folder)}
                        aria-label={`Restore ${folder.name}`}
                        className="text-ink-400 hover:text-primary bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDeleteFolder(folder)}
                        aria-label={`Permanently delete ${folder.name}`}
                        className="text-ink-400 hover:text-error-text bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
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
                        Size
                      </th>
                      <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase md:table-cell">
                        Deleted
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
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
                              <span className="text-foreground truncate text-[14px] font-medium">
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap sm:table-cell">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap md:table-cell">
                            {formatDate(file.deletedAt)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleRestoreFile(file)}
                                className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                                aria-label={`Restore ${file.name}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDeleteFile(file)}
                                className="text-ink-400 hover:text-error-text hover:bg-background cursor-pointer rounded-md p-1.5"
                                aria-label={`Permanently delete ${file.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
