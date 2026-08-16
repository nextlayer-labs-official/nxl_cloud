"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { getFileIcon } from "@/lib/file-icons";
import type { FileItem } from "@/types/portal";
import { FilePreviewBody } from "./file-preview-body";

interface FilePreviewModalProps {
  file: FileItem;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const Icon = getFileIcon(file.mimeType);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

        <FilePreviewBody file={file} onDownload={onDownload} />
      </div>
    </div>
  );
}
