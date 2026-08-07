"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon, getPreviewKind } from "@/lib/file-icons";
import type { FileItem } from "@/types/portal";

const TEXT_PREVIEW_LIMIT_BYTES = 2 * 1024 * 1024;

interface FilePreviewModalProps {
  file: FileItem;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const kind = getPreviewKind(file.mimeType);
  const Icon = getFileIcon(file.mimeType);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    if (kind === "none") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<{ previewUrl: string }>(`/files/${file.id}/preview-url`)
      .then(async ({ previewUrl }) => {
        if (cancelled) return;
        if (kind === "text") {
          if (file.sizeBytes > TEXT_PREVIEW_LIMIT_BYTES) {
            throw new Error("This file is too large to preview here.");
          }
          const res = await fetch(previewUrl);
          if (!res.ok) throw new Error("Couldn't load a preview of this file.");
          const text = await res.text();
          if (!cancelled) setTextContent(text);
        }
        if (!cancelled) setPreviewUrl(previewUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : "Couldn't load a preview of this file.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, file.sizeBytes, kind]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-border-subtle bg-background flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border-subtle flex items-center justify-between gap-4 border-b px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
            <span className="text-foreground truncate text-[14px] font-semibold">{file.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download"
              className="text-ink-450 hover:bg-surface-muted hover:text-foreground cursor-pointer rounded-lg p-1.5"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-ink-450 hover:bg-surface-muted hover:text-foreground cursor-pointer rounded-lg p-1.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-surface-muted-2 flex min-h-[320px] flex-1 items-center justify-center overflow-auto">
          {loading ? (
            <Loader2 className="text-ink-400 h-6 w-6 animate-spin" />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
              <p className="text-ink-450 text-sm">{error}</p>
              <button
                type="button"
                onClick={onDownload}
                className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Download instead
              </button>
            </div>
          ) : kind === "image" && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-[70vh] max-w-full object-contain"
            />
          ) : kind === "pdf" && previewUrl ? (
            <iframe src={previewUrl} title={file.name} className="h-[75vh] w-full" />
          ) : kind === "video" && previewUrl ? (
            <video src={previewUrl} controls className="max-h-[70vh] max-w-full" />
          ) : kind === "audio" && previewUrl ? (
            <audio src={previewUrl} controls className="w-full px-8" />
          ) : kind === "text" && textContent !== null ? (
            <pre className="text-foreground h-[60vh] w-full overflow-auto p-5 font-mono text-[13px] whitespace-pre-wrap">
              {textContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
              <Icon className="text-ink-400 h-8 w-8" />
              <p className="text-ink-450 text-sm">No preview available for this file type.</p>
              <button
                type="button"
                onClick={onDownload}
                className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
