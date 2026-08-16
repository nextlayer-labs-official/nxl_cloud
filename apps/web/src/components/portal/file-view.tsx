"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes } from "@/lib/format";
import type { AccessStatus, FileItem } from "@/types/portal";
import { FilePreviewBody } from "./file-preview-body";
import { RequestAccessPanel } from "./request-access-panel";

interface FileViewProps {
  fileId: string;
}

/** Backs the standalone /portal/file/[fileId] route a "shared with you" email links to directly — matches Drive/Dropbox's "open the actual item" share links instead of dropping the recipient on a generic hub page. */
export function FileView({ fileId }: FileViewProps) {
  const [file, setFile] = useState<FileItem | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFile(null);
    setAccessStatus(null);

    api
      .get<FileItem>(`/files/${fileId}`)
      .then((data) => {
        if (!cancelled) setFile(data);
      })
      .catch(async (fileErr) => {
        if (cancelled) return;
        // A failed direct fetch might just mean "exists but not shared with you" —
        // check access-status before giving up, so we can offer Request access
        // instead of a dead end (mirrors Drive's "you need access" screen).
        try {
          const status = await api.get<AccessStatus>(`/files/${fileId}/access-status`);
          if (!cancelled) setAccessStatus(status);
        } catch {
          if (!cancelled) {
            setError(fileErr instanceof ApiError ? fileErr.message : "Couldn't load this file.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      const { downloadUrl } = await api.get<{ downloadUrl: string }>(`/files/${file.id}/download-url`);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      // FilePreviewBody's own error state covers this — nothing further to do here
    }
  }, [file]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-ink-400 h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (accessStatus && !accessStatus.hasAccess) {
    return (
      <RequestAccessPanel
        resourceType="file"
        resourceId={fileId}
        resourceName={accessStatus.name}
        initialRequestStatus={accessStatus.requestStatus}
      />
    );
  }

  if (error || !file) {
    return (
      <div className="border-border-subtle mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed py-20 text-center">
        <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <AlertCircle className="text-ink-400 h-6 w-6" />
        </div>
        <p className="text-foreground text-[15px] font-semibold">Can&apos;t open this file</p>
        <p className="text-ink-450 mt-1 max-w-sm text-sm">
          {error ?? "It may have been removed, or your access may have been revoked."}
        </p>
        <Link
          href="/portal"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Go to My Files
        </Link>
      </div>
    );
  }

  const Icon = getFileIcon(file.mimeType);

  return (
    <div className="border-border-subtle mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border">
      <div className="border-border-subtle flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
          <div className="min-w-0">
            <div className="text-foreground truncate text-[14px] font-semibold">{file.name}</div>
            <div className="text-ink-450 text-[12px]">{formatBytes(file.sizeBytes)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>

      <FilePreviewBody file={file} onDownload={handleDownload} />
    </div>
  );
}
