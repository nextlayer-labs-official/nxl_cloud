// Copied from apps/web/src/types/portal.ts rather than imported — the web
// app and this Electron app have divergent build targets (browser vs. Node
// main process), and this is a handful of small, stable interfaces.

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  isShared: boolean;
  isStarred: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  isStarred: boolean;
}

export interface BreadcrumbEntry {
  id: string;
  name: string;
}

export type AccessLevel = "OWNER" | "VIEWER" | "EDITOR";

export interface FolderContents {
  accessLevel: AccessLevel;
  folders: FolderItem[];
  files: FileItem[];
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export interface ApiErrorShape {
  message: string;
}

/** The typed surface the preload script exposes on `window.skylyer`. */
export interface SkylyerApi {
  login(email: string, password: string): Promise<{ ok: true; user: CurrentUser } | { ok: false; message: string }>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<CurrentUser | null>;
  listFolder(parentId: string | null): Promise<FolderContents>;
  getBreadcrumb(folderId: string): Promise<BreadcrumbEntry[]>;
  listRecent(): Promise<FileItem[]>;
  createFolder(name: string, parentId: string | null): Promise<FolderItem>;
  renameFolder(id: string, name: string): Promise<FolderItem>;
  renameFile(id: string, name: string): Promise<FileItem>;
  trashFolder(id: string): Promise<void>;
  trashFile(id: string): Promise<void>;
  /** Downloads to a user-chosen path via a native Save dialog. Returns null if the user cancelled. */
  downloadFile(fileId: string, suggestedName: string): Promise<string | null>;
  /** Downloads to a local cache dir and opens it with the OS default app. */
  openFile(fileId: string, name: string): Promise<void>;
  /** `filePaths` are real filesystem paths from `webUtils.getPathForFile`. */
  uploadFiles(filePaths: string[], folderId: string | null): Promise<{ succeeded: string[]; failed: { path: string; message: string }[] }>;
  /** Resolves a dropped `File`'s real filesystem path — must run in preload, `File` objects aren't IPC-serializable to the main process. */
  getFilePath(file: File): string;
}
