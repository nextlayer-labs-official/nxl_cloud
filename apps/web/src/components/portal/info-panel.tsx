"use client";

import { Folder as FolderIcon, Info, type LucideIcon, X } from "lucide-react";
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

/** Slide-out details drawer — Details tab only, no Activity (no per-file audit trail exists to power one). */
export function InfoPanel({ subject, onClose }: InfoPanelProps) {
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
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {subject.kind === "multi" ? (
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
