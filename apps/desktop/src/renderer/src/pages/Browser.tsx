import { useCallback, useEffect, useState } from "react";
import type { BreadcrumbEntry, CurrentUser, FileItem, FolderContents, FolderItem } from "../../../shared/types";
import { Breadcrumb } from "../components/Breadcrumb";
import { FileRow } from "../components/FileRow";
import { FolderRow } from "../components/FolderRow";
import { UploadDropzone } from "../components/UploadDropzone";

export function Browser({ user, onSignOut }: { user: CurrentUser; onSignOut: () => void }) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [contents, setContents] = useState<FolderContents | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const load = useCallback(async (nextFolderId: string | null) => {
    setError(null);
    try {
      const [nextContents, nextBreadcrumb] = await Promise.all([
        window.skylyer.listFolder(nextFolderId),
        nextFolderId ? window.skylyer.getBreadcrumb(nextFolderId) : Promise.resolve([]),
      ]);
      setContents(nextContents);
      setBreadcrumb(nextBreadcrumb);
    } catch {
      setError("Couldn't load this folder.");
    }
  }, []);

  useEffect(() => {
    load(folderId);
  }, [folderId, load]);

  function navigate(nextFolderId: string | null) {
    setFolderId(nextFolderId);
  }

  async function handleNewFolder() {
    const name = window.prompt("Folder name");
    if (!name) return;
    await window.skylyer.createFolder(name, folderId);
    load(folderId);
  }

  async function handleRenameFolder(folder: FolderItem) {
    const name = window.prompt("Rename folder", folder.name);
    if (!name || name === folder.name) return;
    await window.skylyer.renameFolder(folder.id, name);
    load(folderId);
  }

  async function handleRenameFile(file: FileItem) {
    const name = window.prompt("Rename file", file.name);
    if (!name || name === file.name) return;
    await window.skylyer.renameFile(file.id, name);
    load(folderId);
  }

  async function handleDeleteFolder(folder: FolderItem) {
    if (!window.confirm(`Delete "${folder.name}"?`)) return;
    await window.skylyer.trashFolder(folder.id);
    load(folderId);
  }

  async function handleDeleteFile(file: FileItem) {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    await window.skylyer.trashFile(file.id);
    load(folderId);
  }

  async function handleUpload(paths: string[]) {
    setUploadStatus(`Uploading ${paths.length} file${paths.length > 1 ? "s" : ""}…`);
    const result = await window.skylyer.uploadFiles(paths, folderId);
    if (result.failed.length > 0) {
      setUploadStatus(`${result.succeeded.length} uploaded, ${result.failed.length} failed.`);
    } else {
      setUploadStatus(`Uploaded ${result.succeeded.length} file${result.succeeded.length > 1 ? "s" : ""}.`);
    }
    load(folderId);
    setTimeout(() => setUploadStatus(null), 4000);
  }

  return (
    <div className="app-shell">
      <div className="titlebar">
        <span className="titlebar-title">Skylyer</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn" onClick={handleNewFolder}>
            New Folder
          </button>
          <span style={{ color: "var(--text-muted)" }}>{user.email}</span>
          <button className="btn" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <Breadcrumb entries={breadcrumb} onNavigate={navigate} />

      <div className="browser-body">
        <UploadDropzone onDropFiles={handleUpload} />
        {uploadStatus && <p style={{ color: "var(--text-muted)" }}>{uploadStatus}</p>}
        {error && <p className="error-text">{error}</p>}

        {!contents ? (
          <div className="empty-state">Loading…</div>
        ) : contents.folders.length === 0 && contents.files.length === 0 ? (
          <div className="empty-state">This folder is empty.</div>
        ) : (
          <>
            {contents.folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onOpen={() => navigate(folder.id)}
                onRename={() => handleRenameFolder(folder)}
                onDelete={() => handleDeleteFolder(folder)}
              />
            ))}
            {contents.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onOpen={() => window.skylyer.openFile(file.id, file.name)}
                onDownload={() => window.skylyer.downloadFile(file.id, file.name)}
                onRename={() => handleRenameFile(file)}
                onDelete={() => handleDeleteFile(file)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
