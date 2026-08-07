"use client";

import { use, useEffect, useState } from "react";
import { AuthShell } from "@/components/layout/auth-shell";
import { api, ApiError } from "@/lib/api-client";

interface SharedFile {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  downloadUrl: string | null;
}

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
    | { status: "ready"; file: SharedFile }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    api
      .get<SharedFile>(`/share/${token}`)
      .then((file) => setState({ status: "ready", file }))
      .catch((err) =>
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : "This link isn't available.",
        }),
      );
  }, [token]);

  return (
    <AuthShell>
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
      {state.status === "ready" && (
        <>
          <h1 className="mb-2 text-center text-2xl font-bold tracking-[-0.02em]">
            {state.file.fileName}
          </h1>
          <p className="text-muted-foreground mb-6 text-center text-sm">
            {formatBytes(state.file.sizeBytes)}
          </p>
          {state.file.downloadUrl ? (
            <a
              href={state.file.downloadUrl}
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
    </AuthShell>
  );
}
