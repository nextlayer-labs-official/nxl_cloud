"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon, getPreviewKind } from "@/lib/file-icons";
import type { FileItem } from "@/types/portal";

const TEXT_PREVIEW_LIMIT_BYTES = 2 * 1024 * 1024;

interface FilePreviewBodyProps {
  file: FileItem;
  onDownload: () => void;
}

/** The actual preview-fetching + rendering logic, shared between the modal (file-preview-modal.tsx) and the standalone deep-link page (file-view.tsx) a share email points at. */
export function FilePreviewBody({ file, onDownload }: FilePreviewBodyProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const kind = getPreviewKind(file.mimeType);
  const Icon = getFileIcon(file.mimeType);

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
        <img src={previewUrl} alt={file.name} className="max-h-[70vh] max-w-full object-contain" />
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
  );
}
