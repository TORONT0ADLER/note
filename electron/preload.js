const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getUiSettings: () => ipcRenderer.invoke("get-ui-settings"),
  setUiSettings: (settings) => ipcRenderer.invoke("set-ui-settings", settings),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  selectFiles: () => ipcRenderer.invoke("select-files"),
  openFilePath: (filePath) => ipcRenderer.invoke("open-file-path", filePath),
  readImageAsDataUrl: (filePath) =>
    ipcRenderer.invoke("read-image-as-data-url", filePath),
  importCoverImage: (folderPath, sourcePath) =>
    ipcRenderer.invoke("import-cover-image", folderPath, sourcePath),
  readKanbanData: (folderPath) =>
    ipcRenderer.invoke("read-kanban-data", folderPath),
  saveKanbanData: (folderPath, payload) =>
    ipcRenderer.invoke("save-kanban-data", folderPath, payload),
  readFolderMetadata: (folderPath) =>
    ipcRenderer.invoke("read-folder-metadata", folderPath),
  saveFolderMetadata: (folderPath, payload) =>
    ipcRenderer.invoke("save-folder-metadata", folderPath, payload),
  readMarkdownFiles: (folderPath) =>
    ipcRenderer.invoke("read-markdown-files", folderPath),
  saveMarkdownFile: (folderPath, filename, content) =>
    ipcRenderer.invoke("save-markdown-file", folderPath, filename, content),
  deleteMarkdownFile: (folderPath, filename) =>
    ipcRenderer.invoke("delete-markdown-file", folderPath, filename),
  renameMarkdownFile: (folderPath, oldName, newName) =>
    ipcRenderer.invoke("rename-markdown-file", folderPath, oldName, newName),
  getVaultPath: () => ipcRenderer.invoke("get-vault-path"),
  setVaultPath: (folderPath) =>
    ipcRenderer.invoke("set-vault-path", folderPath),
});
