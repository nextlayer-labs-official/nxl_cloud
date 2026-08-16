"use client";

import { useEffect, useState } from "react";
import { Folder as FolderIcon, Info, type LucideIcon, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileItem, FolderItem } from "@/types/portal";

interface InfoToggleButtonProps {
  active: boolean;
  onClick: () => void;
}

export function InfoToggleButton({ active, onClick }: InfoToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle details panel"
      aria-pressed={active}
      className={cn(
        "flex cursor-pointer items-center rounded-lg p-2",
        active ? "bg-surface-muted text-foreground" : "text-ink-450 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Info className="h-4 w-4" />
    </button>
  );
}

export type InfoSubject =
  | { kind: "folder-context"; name: string; location: string; itemCount: number }
  | { kind: "file"; file: FileItem; location: string }
  | { kind: "folder"; folder: FolderItem; location: string }
  | { kind: "multi"; count: number; folderCount: number; fileCount: number; totalSizeBytes: number };

interface InfoPanelProps {
  subject: InfoSubject;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-[13px]">
      <span className="text-ink-450">{label}</span>
      <span className="text-foreground max-w-[60%] truncate text-right font-medium">{value}</span>
    </div>
  );
}

function PreviewHeader({ icon: Icon, name }: { icon: LucideIcon; name: string }) {
  return (
    <div className="mb-4 flex flex-col items-center gap-3 py-4">
      <div className="bg-surface-muted flex h-16 w-16 items-center justify-center rounded-2xl">
        <Icon className="text-ink-400 h-7 w-7" />
      </div>
      <span className="text-foreground max-w-full truncate px-4 text-[14px] font-semibold">{name}</span>
    </div>
  );
}

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  actor: { name: string; email: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  "file.uploaded": "uploaded this file",
  "file.renamed": "renamed this file",
  "file.moved": "moved this file",
  "file.trashed": "deleted this file",
  "file.restored": "restored this file",
  "file.deleted": "permanently deleted this file",
  "file.shared": "shared this file",
  "file.unshared": "stopped sharing this file",
  "folder.created": "created this folder",
  "folder.renamed": "renamed this folder",
  "folder.moved": "moved this folder",
  "folder.deleted": "deleted this folder",
  "folder.shared": "shared this folder",
  "folder.unshared": "stopped sharing this folder",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActivityTab({ resourceType, resourceId }: { resourceType: "file" | "folder"; resourceId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    const endpoint = resourceType === "file" ? `/files/${resourceId}/activity` : `/folders/${resourceId}/activity`;
    api
      .get<ActivityEntry[]>(endpoint)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load activity.");
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType, resourceId]);

  if (error) return <p className="text-error-text py-6 text-center text-[13px]">{error}</p>;
  if (!entries) {
    return (
      <div className="flex flex-col gap-2 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-muted h-10 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }
  if (entries.length === 0) {
    return <p className="text-ink-450 py-6 text-center text-[13px]">No activity yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3.5 py-3">
      {entries.map((entry) => (
        <li key={entry.id} className="text-[13px]">
          <p className="text-foreground">
            <span className="font-semibold">{entry.actor?.name ?? "Someone"}</span>{" "}
            {ACTION_LABELS[entry.action] ?? entry.action}
          </p>
          <p className="text-ink-450 text-[12px]">{formatDateTime(entry.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Slide-out details drawer — a Details/Activity tab strip for single file/folder subjects (Activity reads AuditLog rows now written by files.service.ts/folders.service.ts); multi-select and the current-folder-context subject only ever show Details, matching where fields like Owner/Created already only applied to a single item. */
export function InfoPanel({ subject, onClose }: InfoPanelProps) {
  const [tab, setTab] = useState<"details" | "activity">("details");
  const showTabs = subject.kind === "file" || subject.kind === "folder";

  return (
    <div className="border-border-subtle bg-background fixed top-16 right-0 bottom-0 z-40 flex w-[320px] flex-col border-l shadow-[0_0_24px_-8px_oklch(0.22_0.02_260_/_0.15)]">
      <div className="border-border-subtle flex shrink-0 items-center justify-between border-b px-5 py-4">
        <h2 className="text-foreground text-[15px] font-semibold">Details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="text-ink-450 hover:bg-surface-muted hover:text-foreground cursor-pointer rounded-md p-1.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showTabs && (
        <div className="border-border-subtle flex shrink-0 gap-1 border-b px-3 pt-2">
          {(["details", "activity"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "cursor-pointer rounded-t-lg px-3 py-2 text-[13px] font-semibold capitalize",
                tab === t ? "text-foreground border-primary border-b-2" : "text-ink-450 hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-2">
        {showTabs && tab === "activity" ? (
          <ActivityTab
            resourceType={subject.kind === "file" ? "file" : "folder"}
            resourceId={subject.kind === "file" ? subject.file.id : subject.kind === "folder" ? subject.folder.id : ""}
          />
        ) : subject.kind === "multi" ? (
          <>
            <div className="mb-2 flex flex-col items-center gap-1 py-6 text-center">
              <span className="text-foreground text-[15px] font-semibold">{subject.count} items selected</span>
            </div>
            <div className="divide-border-subtle divide-y">
              <Row label="Folders" value={subject.folderCount} />
              <Row label="Files" value={subject.fileCount} />
              {subject.totalSizeBytes > 0 && <Row label="Total size" value={formatBytes(subject.totalSizeBytes)} />}
            </div>
          </>
        ) : subject.kind === "folder-context" ? (
          <>
            <PreviewHeader icon={FolderIcon} name={subject.name} />
            <div className="divide-border-subtle divide-y">
              <Row label="Type" value="Folder" />
              <Row label="Location" value={subject.location} />
              <Row label="Items" value={subject.itemCount} />
            </div>
          </>
        ) : subject.kind === "folder" ? (
          <>
            <PreviewHeader icon={FolderIcon} name={subject.folder.name} />
            <div className="divide-border-subtle divide-y">
              <Row label="Type" value="Folder" />
              <Row label="Location" value={subject.location} />
              <Row label="Created" value={formatDate(subject.folder.createdAt)} />
              <Row label="Shared" value={subject.folder.isShared ? "Yes" : "No"} />
            </div>
          </>
        ) : (
          <>
            <PreviewHeader icon={getFileIcon(subject.file.mimeType)} name={subject.file.name} />
            <div className="divide-border-subtle divide-y">
              <Row label="Type" value={subject.file.mimeType} />
              <Row label="Size" value={formatBytes(subject.file.sizeBytes)} />
              <Row label="Location" value={subject.location} />
              <Row label="Created" value={formatDate(subject.file.createdAt)} />
              <Row label="Shared" value={subject.file.isShared ? "Yes" : "No"} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
