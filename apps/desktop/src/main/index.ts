import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import mime from "mime-types";
import { ApiClient, ApiError } from "./api-client";
import { getSyncRootPath, removeSyncRoot, startSyncRoot, stopSyncRoot } from "./sync-root";
import { createTray } from "./tray";
import type { SkylyerApi } from "../shared/types";

// Electron defaults app.getPath("userData") off package.json's scoped npm
// `name` ("@nextlayer/desktop"), not the product name — without this, the
// real session store ends up at AppData/Roaming/@nextlayer/desktop instead
// of the expected AppData/Roaming/Skylyer, silently confusing anything that
// assumes the latter (including this app's own dev tooling, more than once).
app.setName("Skylyer");

const apiClient = new ApiClient();
const sessionFilePath = join(app.getPath("userData"), "session.bin");

let mainWindow: BrowserWindow | null = null;
let currentUserId: string | null = null;
let quitting = false;

// Errors here would otherwise be silent — this process has no console the
// user can see, so an uncaught error just looks like "nothing happened."
process.on("uncaughtException", (err) => console.error("[Skylyer] uncaughtException:", err));
process.on("unhandledRejection", (err) => console.error("[Skylyer] unhandledRejection:", err));

// Without this, launching Skylyer again while it's already running (e.g.
// from the Start Menu, with the first instance minimized to the tray) spawns
// a second full process instead of focusing the existing one — and that
// second process's own registerSyncRoot call then collides with the first
// (same fixed local folder, two different OS-level registrations at once),
// failing outright. Electron grants the lock to exactly one instance; every
// other launch attempt gets `false` here and must quit immediately.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  // Fired on THIS (the one holding the lock) instance whenever a later
  // launch attempt is made — bring the real window forward instead of
  // leaving the user staring at nothing while a second process silently
  // fails to start.
  app.on("second-instance", () => showWindow());
}

function loadStoredSession(): string | null {
  if (!safeStorage.isEncryptionAvailable() || !existsSync(sessionFilePath)) return null;
  try {
    return safeStorage.decryptString(readFileSync(sessionFilePath));
  } catch {
    return null;
  }
}

function storeSession(token: string | null) {
  if (!safeStorage.isEncryptionAvailable()) return;
  if (token) {
    writeFileSync(sessionFilePath, safeStorage.encryptString(token));
  } else if (existsSync(sessionFilePath)) {
    writeFileSync(sessionFilePath, Buffer.alloc(0));
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: "Skylyer",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Closing the window just hides it — the sync root needs this process
  // running in the background (tray icon) for the FETCH_DATA callback to
  // keep working, matching the "hidden icon" behavior of OneDrive/Dropbox.
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow = win;
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/**
 * Fires when the sync root discovers the session is dead server-side (a
 * 401 from any bridge call — typically triggered by Explorer trying to
 * hydrate/thumbnail a placeholder). Without this, the only visible sign is
 * Explorer's own generic "couldn't complete this operation" error; this
 * clears the now-useless stored session and pops straight to the login
 * screen instead, the same refresh the tray's "Sign out" already does.
 * Deliberately does NOT call removeSyncRoot — the Explorer entry and
 * placeholders stay put, matching how OneDrive keeps showing your files
 * and just asks you to sign back in rather than un-registering itself.
 */
function handleAuthExpired() {
  storeSession(null);
  showWindow();
  mainWindow?.webContents.reload();
}

type MainApi = Omit<SkylyerApi, "getFilePath">;

function registerIpcHandlers() {
  const handlers: { [K in keyof MainApi]: (...args: Parameters<MainApi[K]>) => ReturnType<MainApi[K]> } = {
    async login(email, password) {
      try {
        const user = await apiClient.login(email, password);
        storeSession(apiClient.getSessionToken());
        currentUserId = user.id;
        startSyncRoot(apiClient, user.id, handleAuthExpired).catch((err) => console.error("startSyncRoot failed:", err));
        return { ok: true, user };
      } catch (err) {
        return { ok: false, message: err instanceof ApiError ? err.message : "Couldn't sign in." };
      }
    },
    async logout() {
      await apiClient.logout();
      storeSession(null);
      if (currentUserId) removeSyncRoot(currentUserId);
      currentUserId = null;
    },
    async getCurrentUser() {
      return apiClient.getCurrentUser();
    },
    async listFolder(parentId) {
      return apiClient.listFolder(parentId);
    },
    async getBreadcrumb(folderId) {
      return apiClient.getBreadcrumb(folderId);
    },
    async listRecent() {
      return apiClient.listRecent();
    },
    async createFolder(name, parentId) {
      return apiClient.createFolder(name, parentId);
    },
    async renameFolder(id, name) {
      return apiClient.renameFolder(id, name);
    },
    async renameFile(id, name) {
      return apiClient.renameFile(id, name);
    },
    async trashFolder(id) {
      await apiClient.trashFolder(id);
    },
    async trashFile(id) {
      await apiClient.trashFile(id);
    },
    async downloadFile(fileId, suggestedName) {
      const { filePath, canceled } = await dialog.showSaveDialog({ defaultPath: suggestedName });
      if (canceled || !filePath) return null;
      await apiClient.downloadToPath(fileId, filePath);
      return filePath;
    },
    async openFile(fileId, name) {
      const cacheDir = join(app.getPath("temp"), "skylyer-cache");
      mkdirSync(cacheDir, { recursive: true });
      const destPath = join(cacheDir, `${fileId}-${name}`);
      if (!existsSync(destPath)) {
        await apiClient.downloadToPath(fileId, destPath);
      }
      await shell.openPath(destPath);
    },
    async uploadFiles(filePaths, folderId) {
      const succeeded: string[] = [];
      const failed: { path: string; message: string }[] = [];
      for (const filePath of filePaths) {
        try {
          const stat = statSync(filePath);
          const name = filePath.split(/[/\\]/).pop() ?? filePath;
          const mimeType = mime.lookup(name) || "application/octet-stream";
          const { uploadUrl, storageKey, storageProvider } = await apiClient.requestUploadUrl(
            name,
            mimeType,
            stat.size,
            folderId,
          );
          await apiClient.putFile(uploadUrl, createReadStream(filePath), mimeType);
          await apiClient.confirmUpload({ name, mimeType, sizeBytes: stat.size, folderId, storageKey, storageProvider });
          succeeded.push(filePath);
        } catch (err) {
          failed.push({ path: filePath, message: err instanceof Error ? err.message : "Upload failed." });
        }
      }
      return { succeeded, failed };
    },
  };

  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, ...args: unknown[]) =>
      (handler as (...a: unknown[]) => unknown)(...args),
    );
  }
}

if (gotSingleInstanceLock) {
  app.whenReady().then(async () => {
    const stored = loadStoredSession();
    if (stored) apiClient.setSessionToken(stored);

    registerIpcHandlers();
    createWindow();

    createTray({
      onShowWindow: showWindow,
      onOpenSyncFolder: () => shell.openPath(getSyncRootPath()),
      onSignOut: async () => {
        await apiClient.logout();
        storeSession(null);
        if (currentUserId) removeSyncRoot(currentUserId);
        currentUserId = null;
        showWindow();
        mainWindow?.webContents.reload();
      },
      onQuit: () => {
        quitting = true;
        app.quit();
      },
    });

    const user = await apiClient.getCurrentUser();
    if (user) {
      currentUserId = user.id;
      startSyncRoot(apiClient, user.id, handleAuthExpired).catch((err) => console.error("startSyncRoot failed:", err));
    }

    app.on("activate", showWindow);
  }).catch((err) => console.error("[Skylyer] whenReady chain failed:", err));

  // Closing the window no longer quits the app — see createWindow's "close"
  // handler — so this only fires for real shutdowns (tray Quit, OS logoff).
  app.on("before-quit", () => {
    quitting = true;
    stopSyncRoot();
  });
}
