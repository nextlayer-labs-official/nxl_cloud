import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { SkylyerApi } from "../shared/types";

const api: SkylyerApi = {
  getFilePath: (file) => webUtils.getPathForFile(file),
  login: (email, password) => ipcRenderer.invoke("login", email, password),
  logout: () => ipcRenderer.invoke("logout"),
  getCurrentUser: () => ipcRenderer.invoke("getCurrentUser"),
  listFolder: (parentId) => ipcRenderer.invoke("listFolder", parentId),
  getBreadcrumb: (folderId) => ipcRenderer.invoke("getBreadcrumb", folderId),
  listRecent: () => ipcRenderer.invoke("listRecent"),
  createFolder: (name, parentId) => ipcRenderer.invoke("createFolder", name, parentId),
  renameFolder: (id, name) => ipcRenderer.invoke("renameFolder", id, name),
  renameFile: (id, name) => ipcRenderer.invoke("renameFile", id, name),
  trashFolder: (id) => ipcRenderer.invoke("trashFolder", id),
  trashFile: (id) => ipcRenderer.invoke("trashFile", id),
  downloadFile: (fileId, suggestedName) => ipcRenderer.invoke("downloadFile", fileId, suggestedName),
  openFile: (fileId, name) => ipcRenderer.invoke("openFile", fileId, name),
  uploadFiles: (filePaths, folderId) => ipcRenderer.invoke("uploadFiles", filePaths, folderId),
};

contextBridge.exposeInMainWorld("skylyer", api);
