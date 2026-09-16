import { Menu, nativeImage, Tray } from "electron";
import { getIconPngPath } from "./brand";

export function createTray(options: {
  onShowWindow: () => void;
  onOpenSyncFolder: () => void;
  onSignOut: () => void;
  onQuit: () => void;
}): Tray {
  // Windows tray icons render best around 16-32px; the source is much
  // larger, so downscale rather than letting Windows do it blurrily.
  const icon = nativeImage.createFromPath(getIconPngPath()).resize({ width: 32, height: 32 });
  const tray = new Tray(icon);
  tray.setToolTip("Skylyer");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Skylyer", click: options.onShowWindow },
      { label: "Open Skylyer folder", click: options.onOpenSyncFolder },
      { type: "separator" },
      { label: "Sign out", click: options.onSignOut },
      { label: "Quit", click: options.onQuit },
    ]),
  );

  tray.on("click", options.onShowWindow);
  return tray;
}
