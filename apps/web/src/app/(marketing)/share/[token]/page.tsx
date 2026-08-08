"use client";

import { use, useEffect, useState } from "react";
import { Download, Folder } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { api, ApiError } from "@/lib/api-client";
import { getFileIcon } from "@/lib/file-icons";

interface SharedFile {
  type: "file";
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  downloadUrl: string | null;
}

interface SharedFolderEntry {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  downloadUrl: string;
}

interface SharedFolder {
  type: "folder";
  folderName: string;
  folders: { id: string; name: string }[];
  files: SharedFolderEntry[];
}

type SharedResource = SharedFile | SharedFolder;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; resource: SharedResource }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    api
      .get<SharedResource>(`/share/${token}`)
      .then((resource) => setState({ status: "ready", resource }))
      .catch((err) =>
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : "This link isn't available.",
        }),
      );
  }, [token]);

  const isFolder = state.status === "ready" && state.resource.type === "folder";

  return (
    <AuthShell wide={isFolder}>
      {state.status === "loading" && (
        <p className="text-muted-foreground text-center text-sm">Loading…</p>
      )}
      {state.status === "error" && (
        <>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-[-0.02em]">
            Link unavailable
          </h1>
          <p className="text-muted-foreground text-center text-sm">{state.message}</p>
        </>
      )}
      {state.status === "ready" && state.resource.type === "file" && (
        <>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-[-0.02em]">
            {state.resource.fileName}
          </h1>
          <p className="text-muted-foreground mb-6 text-center text-sm">
            {formatBytes(state.resource.sizeBytes)}
          </p>
          {state.resource.downloadUrl ? (
            <a
              href={state.resource.downloadUrl}
              className="bg-primary text-primary-foreground hover:bg-brand-hover block rounded-lg p-3.5 text-center text-[15px] font-semibold"
            >
              Download
            </a>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              Downloads are disabled for this link.
            </p>
          )}
        </>
      )}
      {state.status === "ready" && state.resource.type === "folder" && (
        <>
          <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">
            {state.resource.folderName}
          </h1>
          {state.resource.folders.length === 0 && state.resource.files.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">This folder is empty.</p>
          ) : (
            <div className="border-border-subtle divide-border-subtle overflow-hidden rounded-xl border">
              {state.resource.folders.map((folder) => (
                <div
                  key={folder.id}
                  className="border-border-subtle flex items-center gap-3 border-b p-3.5 text-sm last:border-b-0"
                >
                  <Folder className="text-ink-400 h-[18px] w-[18px] shrink-0" />
                  <span className="truncate font-medium">{folder.name}</span>
                  <span className="text-ink-450 ml-auto shrink-0 text-xs">Folder</span>
                </div>
              ))}
              {state.resource.files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="border-border-subtle flex items-center gap-3 border-b p-3.5 text-sm last:border-b-0"
                  >
                    <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-ink-450 ml-auto shrink-0 text-xs">
                      {formatBytes(file.sizeBytes)}
                    </span>
                    <a
                      href={file.downloadUrl}
                      aria-label={`Download ${file.name}`}
                      className="text-ink-450 hover:text-foreground shrink-0"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AuthShell>
  );
}
