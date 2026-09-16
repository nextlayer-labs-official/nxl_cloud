import { join } from "node:path";
import { app } from "electron";

// In a packaged build these are extraResources (see electron-builder.yml) —
// real loose files under resources/, since both the tray icon and Explorer's
// sync-root icon need an actual on-disk path, not something inside the asar.
// In dev, resolve straight to the source build/ folder instead.
function resourcePath(fileName: string): string {
  return app.isPackaged ? join(process.resourcesPath, fileName) : join(__dirname, "../../build", fileName);
}

export function getIconIcoPath(): string {
  return resourcePath("icon.ico");
}

export function getIconPngPath(): string {
  return resourcePath("icon.png");
}
