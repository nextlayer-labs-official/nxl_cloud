"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Folder as FolderIcon,
  Inbox,
  SearchX,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BreadcrumbEntry, FileItem, FolderItem, SearchResults } from "@/types/portal";
import { useRegisterBrowserActions } from "./browser-actions-context";
import { FilePreviewModal } from "./file-preview-modal";
import { NavIcon } from "./nav-icon";
import { NewFolderModal } from "./new-folder-modal";
import { ShareModal } from "./share-modal";

const UPLOAD_FAILED_MESSAGE =
  "Upload to storage failed. If Wasabi credentials aren't configured yet (or the bucket's CORS policy doesn't allow this origin), this is expected.";

interface UploadTask {
  id: string;
  name: string;
  mimeType: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

/** Uses XHR (not fetch) because it's the only API that exposes upload progress events. */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(UPLOAD_FAILED_MESSAGE));
    };
    xhr.onerror = () => reject(new Error(UPLOAD_FAILED_MESSAGE));
    xhr.send(file);
  });
}

function summarizeUploads(uploads: UploadTask[]): string {
  const active = uploads.filter((u) => u.status === "uploading").length;
  if (active > 0) return `Uploading ${active} item${active === 1 ? "" : "s"}`;
  const errored = uploads.filter((u) => u.status === "error").length;
  if (errored > 0) return `${errored} upload${errored === 1 ? "" : "s"} failed`;
  return `${uploads.length} upload${uploads.length === 1 ? "" : "s"} complete`;
}

interface FileBrowserProps {
  folderId?: string;
}

export function FileBrowser({ folderId }: FileBrowserProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [uploadsCollapsed, setUploadsCollapsed] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFolderSubmitting, setCreatingFolderSubmitting] = useState(false);
  const [creatingFolderError, setCreatingFolderError] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<
    { type: "file" | "folder"; id: string; name: string } | null
  >(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<{ key: "name" | "size" | "date"; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const dragCounter = useRef(0);

  // Search lives in the global top bar (PortalTopBar) — it drives navigation to
  // /portal?q=..., and this component just reacts to the URL, no local input.
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const isSearching = searchQuery.trim().length > 0;

  const openUploadPicker = useCallback(() => fileInputRef.current?.click(), []);
  const startNewFolder = useCallback(() => setCreatingFolder(true), []);
  useRegisterBrowserActions({ openUploadPicker, startNewFolder });

  const runSearch = useCallback((q: string) => {
    if (!q) return;
    setSearching(true);
    api
      .get<SearchResults>(`/folders/search?q=${encodeURIComponent(q)}`)
      .then(setSearchResults)
      .catch(() => setSearchResults({ folders: [], files: [] }))
      .finally(() => setSearching(false));
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    runSearch(q);
  }, [searchQuery, runSearch]);

  useEffect(() => {
    if (uploads.length === 0) return;
    const settled = uploads.every((u) => u.status !== "uploading");
    const hasError = uploads.some((u) => u.status === "error");
    if (settled && !hasError) {
      const timer = setTimeout(() => setUploads([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploads]);

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

  async function handleCreateFolder(name: string) {
    setCreatingFolderError(null);
    setCreatingFolderSubmitting(true);
    try {
      await api.post("/folders", { name, parentId: folderId });
      setCreatingFolder(false);
      load();
    } catch (err) {
      setCreatingFolderError(err instanceof ApiError ? err.message : "Couldn't create the folder.");
    } finally {
      setCreatingFolderSubmitting(false);
    }
  }

  const uploadFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const mimeType = file.type || "application/octet-stream";
      setUploadsCollapsed(false);
      setUploads((prev) => [...prev, { id, name: file.name, mimeType, progress: 0, status: "uploading" }]);
      try {
        const { uploadUrl, storageKey } = await api.post<{
          uploadUrl: string;
          storageKey: string;
        }>("/files/upload-url", {
          name: file.name,
          mimeType,
          sizeBytes: file.size,
          folderId,
        });

        await putWithProgress(uploadUrl, file, (percent) => {
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: percent } : u)));
        });

        await api.post("/files", {
          name: file.name,
          mimeType,
          sizeBytes: file.size,
          folderId,
          storageKey,
        });

        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: 100, status: "done" } : u)),
        );
        load();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: message } : u)));
      }
    },
    [folderId, load],
  );

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    selected.forEach((file) => uploadFile(file));
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setDragActive(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    Array.from(e.dataTransfer.files ?? []).forEach((file) => uploadFile(file));
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

  async function handleDeleteFile(file: FileItem) {
    if (!window.confirm(`Delete "${file.name}"? This can't be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/files/${file.id}`);
      load();
      if (isSearching) runSearch(searchQuery.trim());
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
      if (isSearching) runSearch(searchQuery.trim());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete the folder.");
    }
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0;
  const pageTitle = breadcrumb.length ? breadcrumb[breadcrumb.length - 1].name : "My Files";

  const sortedFiles = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...files].sort((a, b) => {
      if (sort.key === "size") return (a.sizeBytes - b.sizeBytes) * dir;
      if (sort.key === "date")
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
  }, [files, sort]);

  function toggleSort(key: "name" | "size" | "date") {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm">
            <Link
              href="/portal"
              className={cn(
                breadcrumb.length
                  ? "text-ink-450 hover:text-foreground"
                  : "text-foreground font-semibold",
              )}
            >
              My Files
            </Link>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <ChevronRight className="text-ink-300 h-3.5 w-3.5" />
                {i === breadcrumb.length - 1 ? (
                  <span className="text-foreground font-semibold">{crumb.name}</span>
                ) : (
                  <Link
                    href={`/portal/folder/${crumb.id}`}
                    className="text-ink-450 hover:text-foreground"
                  >
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-foreground text-[26px] font-bold tracking-[-0.01em]">
              {isSearching ? `Search results for "${searchQuery.trim()}"` : pageTitle}
            </h1>
            {isSearching && (
              <Link
                href="/portal"
                className="border-input text-ink-600 hover:bg-surface-muted flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              >
                <X className="h-3 w-3" />
                Clear
              </Link>
            )}
          </div>
        </div>

        <input ref={fileInputRef} type="file" hidden multiple onChange={handleUpload} />
      </div>

      {creatingFolder && (
        <NewFolderModal
          onCancel={() => {
            setCreatingFolder(false);
            setCreatingFolderError(null);
          }}
          onCreate={handleCreateFolder}
          creating={creatingFolderSubmitting}
          error={creatingFolderError}
        />
      )}

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


      {isSearching ? (
        searching && !searchResults ? (
          <div className="bg-surface-muted h-56 animate-pulse rounded-xl" />
        ) : !searchResults ||
          (searchResults.folders.length === 0 && searchResults.files.length === 0) ? (
          <div className="border-border-subtle flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
            <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              <SearchX className="text-ink-400 h-6 w-6" />
            </div>
            <p className="text-foreground text-[15px] font-semibold">No results found</p>
            <p className="text-ink-450 mt-1 text-sm">Try a different name or check your spelling.</p>
          </div>
        ) : (
          <>
            {searchResults.folders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">
                  Folders
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {searchResults.folders.map((folder) => (
                    <div key={folder.id} className="group relative">
                      <Link
                        href={`/portal/folder/${folder.id}`}
                        className="border-border-subtle bg-background hover:border-border-strong flex items-center gap-3 rounded-xl border p-4 transition"
                      >
                        <div className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <NavIcon icon={FolderIcon} className="text-accent-foreground h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-foreground truncate text-[14px] font-medium">
                            {folder.name}
                          </div>
                          <div className="text-ink-450 truncate text-[12px]">
                            in {folder.parentName}
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShareTarget({ type: "folder", id: folder.id, name: folder.name });
                        }}
                        aria-label={`Share ${folder.name}`}
                        className="text-ink-400 hover:text-primary bg-background border-border-subtle absolute -top-2 -right-2 cursor-pointer rounded-full border p-1 opacity-0 shadow-sm transition group-hover:opacity-100"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.files.length > 0 && (
              <div>
                <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">
                  Files
                </h2>
                <div className="border-border-subtle overflow-hidden rounded-xl border">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-border-subtle bg-surface-muted-2 border-b">
                        <th className="text-ink-450 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase">
                          Name
                        </th>
                        <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase sm:table-cell">
                          Location
                        </th>
                        <th className="text-ink-450 hidden px-5 py-2.5 text-xs font-semibold tracking-wide uppercase md:table-cell">
                          Size
                        </th>
                        <th className="px-5 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.files.map((file) => {
                        const Icon = getFileIcon(file.mimeType);
                        return (
                          <tr
                            key={file.id}
                            className="group border-border-subtle hover:bg-surface-muted-2 border-b last:border-b-0"
                          >
                            <td
                              className="cursor-pointer px-5 py-3"
                              onClick={() => setPreviewFile(file)}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
                                <span className="text-foreground truncate text-[14px] font-medium hover:underline">
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap sm:table-cell">
                              {file.parentName}
                            </td>
                            <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap md:table-cell">
                              {formatBytes(file.sizeBytes)}
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShareTarget({ type: "file", id: file.id, name: file.name })
                                  }
                                  className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                                  aria-label={`Share ${file.name}`}
                                >
                                  <Share2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file)}
                                  className="text-ink-400 hover:text-error-text hover:bg-background cursor-pointer rounded-md p-1.5"
                                  aria-label={`Delete ${file.name}`}
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
        )
      ) : loading ? (
        <div>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-muted h-[76px] animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="bg-surface-muted h-56 animate-pulse rounded-xl" />
        </div>
      ) : isEmpty ? (
        <div className="border-border-subtle flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <Inbox className="text-ink-400 h-6 w-6" />
          </div>
          <p className="text-foreground text-[15px] font-semibold">This folder is empty</p>
          <p className="text-ink-450 mt-1 text-sm">
            Drag and drop files here, or use the buttons above.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Upload a file
          </button>
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">
                Folders
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {folders.map((folder) => (
                  <div key={folder.id} className="group relative">
                    <Link
                      href={`/portal/folder/${folder.id}`}
                      className="border-border-subtle bg-background hover:border-border-strong hover:shadow-[0_8px_20px_-12px_oklch(0.22_0.02_260_/_0.2)] flex items-center gap-3 rounded-xl border p-4 transition"
                    >
                      <div className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                        <NavIcon icon={FolderIcon} className="text-accent-foreground h-5 w-5" />
                      </div>
                      <span className="text-foreground truncate text-[14px] font-medium">
                        {folder.name}
                      </span>
                    </Link>
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShareTarget({ type: "folder", id: folder.id, name: folder.name });
                        }}
                        aria-label={`Share ${folder.name}`}
                        className="text-ink-400 hover:text-primary bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteFolder(folder);
                        }}
                        aria-label={`Delete ${folder.name}`}
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
              <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">
                Files
              </h2>
              <div className="border-border-subtle overflow-hidden rounded-xl border">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-border-subtle bg-surface-muted-2 border-b">
                      <th className="px-5 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSort("name")}
                          className="text-ink-450 hover:text-foreground flex cursor-pointer items-center gap-1 text-xs font-semibold tracking-wide uppercase"
                        >
                          Name
                          {sort.key === "name" &&
                            (sort.dir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                      <th className="hidden px-5 py-2.5 sm:table-cell">
                        <button
                          type="button"
                          onClick={() => toggleSort("size")}
                          className="text-ink-450 hover:text-foreground flex cursor-pointer items-center gap-1 text-xs font-semibold tracking-wide uppercase"
                        >
                          Size
                          {sort.key === "size" &&
                            (sort.dir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                      <th className="hidden px-5 py-2.5 md:table-cell">
                        <button
                          type="button"
                          onClick={() => toggleSort("date")}
                          className="text-ink-450 hover:text-foreground flex cursor-pointer items-center gap-1 text-xs font-semibold tracking-wide uppercase"
                        >
                          Uploaded
                          {sort.key === "date" &&
                            (sort.dir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFiles.map((file) => {
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
                              <span className="text-ink-450 text-[13px] sm:hidden">
                                {formatBytes(file.sizeBytes)}
                              </span>
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
                                onClick={() => handleDownload(file)}
                                className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                                aria-label={`Download ${file.name}`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setShareTarget({ type: "file", id: file.id, name: file.name })
                                }
                                className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                                aria-label={`Share ${file.name}`}
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file)}
                                className="text-ink-400 hover:text-error-text hover:bg-background cursor-pointer rounded-md p-1.5"
                                aria-label={`Delete ${file.name}`}
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

      {dragActive && (
        <div className="border-primary bg-primary/5 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-[1px]">
          <div className="bg-background border-border-subtle flex items-center gap-2.5 rounded-xl border px-5 py-3 shadow-lg">
            <Upload className="text-primary h-5 w-5" />
            <span className="text-foreground text-sm font-semibold">Drop to upload</span>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="border-border-subtle bg-background fixed right-6 bottom-6 z-50 w-[340px] overflow-hidden rounded-xl border shadow-[0_16px_40px_-12px_oklch(0.22_0.02_260_/_0.25)]">
          <div className="border-border-subtle bg-surface-muted-2 flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-foreground text-[13px] font-semibold">
              {summarizeUploads(uploads)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUploadsCollapsed((v) => !v)}
                className="text-ink-450 hover:bg-background hover:text-foreground cursor-pointer rounded-md p-1"
                aria-label={uploadsCollapsed ? "Expand" : "Collapse"}
              >
                {uploadsCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setUploads((prev) => prev.filter((u) => u.status === "uploading"))}
                className="text-ink-450 hover:bg-background hover:text-foreground cursor-pointer rounded-md p-1"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!uploadsCollapsed && (
            <ul className="max-h-[280px] overflow-y-auto py-1">
              {uploads.map((u) => {
                const Icon = getFileIcon(u.mimeType);
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon className="text-ink-400 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[13px] font-medium">
                        {u.name}
                      </div>
                      {u.status === "error" ? (
                        <div className="text-error-text truncate text-[12px]">{u.error}</div>
                      ) : (
                        <div className="bg-surface-muted mt-1 h-1 w-full overflow-hidden rounded-full">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              u.status === "done" ? "bg-success" : "bg-primary",
                            )}
                            style={{ width: `${u.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {u.status === "done" ? (
                      <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
                    ) : u.status === "error" ? (
                      <AlertCircle className="text-error-text h-4 w-4 shrink-0" />
                    ) : (
                      <span className="text-ink-450 shrink-0 text-[12px]">{u.progress}%</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
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
          resourceType={shareTarget.type}
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
