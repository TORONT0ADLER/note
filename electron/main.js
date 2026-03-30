const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const handler = require("serve-handler");

let server;
let vaultPath = null;
const APP_DATA_DIR = ".noteforge";
const TASKS_DIR = `${APP_DATA_DIR}/tasks`;
const IMAGES_DIR = `${APP_DATA_DIR}/images`;
const KANBAN_FILE_NAME = `${TASKS_DIR}/kanban.json`;
const FOLDERS_FILE_NAME = `${TASKS_DIR}/folders.json`;
const LEGACY_KANBAN_FILE_NAME = ".noteforge-kanban.json";
const LEGACY_FOLDERS_FILE_NAME = ".noteforge-folders.json";
let uiSettings = {
  theme: "dark",
  accent: "blue",
};

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const IMAGE_EXT_TO_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

const toVaultAbsolutePath = (rootPath, relativePath) => {
  const normalizedRelative = String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const absolute = path.resolve(rootPath, normalizedRelative);
  const normalizedRoot = path.resolve(rootPath);
  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : `${normalizedRoot}${path.sep}`;

  if (absolute !== normalizedRoot && !absolute.startsWith(rootWithSep)) {
    throw new Error("Path escapes vault folder");
  }

  return absolute;
};

const sanitizePathSegment = (segment) =>
  String(segment || "")
    .replace(/[/\\:*?"<>|]/g, "_")
    .trim();

const ensureMarkdownFileName = (rawName) => {
  const safeName = sanitizePathSegment(rawName);
  const parsed = path.parse(safeName || "note");
  const ext = parsed.ext.toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(ext)) return safeName;
  return `${safeName || "note"}.md`;
};

const sanitizeRelativeMarkdownPath = (rawRelativePath) => {
  const normalized = String(rawRelativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) {
    return "note.md";
  }

  const fileName = ensureMarkdownFileName(parts.pop());
  const safeDirs = parts.map(sanitizePathSegment).filter(Boolean);

  return [...safeDirs, fileName].join("/");
};

const listMarkdownFilesRecursive = (rootPath, currentPath = rootPath) => {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listMarkdownFilesRecursive(rootPath, absolutePath));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!MARKDOWN_EXTENSIONS.has(ext)) continue;

    const relativePath = path
      .relative(rootPath, absolutePath)
      .replace(/\\/g, "/");

    files.push({ absolutePath, relativePath, filename: entry.name });
  }

  return files;
};

const getDirectorySizeBytes = (targetPath) => {
  let total = 0;
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(targetPath, entry.name);

    try {
      if (entry.isDirectory()) {
        total += getDirectorySizeBytes(entryPath);
        continue;
      }

      if (entry.isFile()) {
        total += fs.statSync(entryPath).size;
      }
    } catch {
      // пропускаем отдельные файлы/папки, которые не удалось прочитать
    }
  }

  return total;
};

// Persist vault path in userData
const getVaultConfigPath = () =>
  path.join(app.getPath("userData"), "vault.json");

const loadVaultPath = () => {
  try {
    const configPath = getVaultConfigPath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data && typeof data.vaultPath === "string") {
        vaultPath = data.vaultPath;
      }
    }
  } catch {
    vaultPath = null;
  }
};

const saveVaultPath = (folderPath) => {
  try {
    const configPath = getVaultConfigPath();
    fs.writeFileSync(
      configPath,
      JSON.stringify({ vaultPath: folderPath }),
      "utf-8",
    );
  } catch (err) {
    console.error("Failed to save vault path:", err);
  }
};

const getUiSettingsPath = () =>
  path.join(app.getPath("userData"), "ui-settings.json");

const loadUiSettings = () => {
  try {
    const settingsPath = getUiSettingsPath();
    if (!fs.existsSync(settingsPath)) return;

    const raw = fs.readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);

    uiSettings = {
      theme: typeof parsed?.theme === "string" ? parsed.theme : "dark",
      accent: typeof parsed?.accent === "string" ? parsed.accent : "blue",
    };
  } catch {
    uiSettings = { theme: "dark", accent: "blue" };
  }
};

const saveUiSettings = (settings) => {
  try {
    const settingsPath = getUiSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings), "utf-8");
  } catch (err) {
    console.error("Failed to save ui settings:", err);
  }
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const publicPath = path.join(__dirname, "../.output/public");

    server = http.createServer((request, response) => {
      return handler(request, response, {
        public: publicPath,
      });
    });

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Не удалось получить адрес локального сервера"));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: true,
    },
  });

  try {
    win.webContents.session.setSpellCheckerLanguages(["ru-RU", "en-US"]);
  } catch (error) {
    console.warn("Failed to set spellchecker languages:", error);
  }

  win.webContents.on(
    "did-fail-load",
    (_, errorCode, errorDescription, validatedURL) => {
      console.error("did-fail-load:", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );

  win.webContents.on("did-finish-load", () => {
    console.log("did-finish-load");
  });

  if (!app.isPackaged) {
    await win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
  } else {
    const url = await startStaticServer();
    console.log("Loading packaged app from:", url);
    await win.loadURL(url);
  }
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle("get-vault-path", () => vaultPath);

ipcMain.handle("get-ui-settings", () => uiSettings);

ipcMain.handle("set-ui-settings", (_event, settings) => {
  const nextSettings = {
    theme: typeof settings?.theme === "string" ? settings.theme : "dark",
    accent: typeof settings?.accent === "string" ? settings.accent : "blue",
  };

  uiSettings = nextSettings;
  saveUiSettings(nextSettings);

  return nextSettings;
});

ipcMain.handle("set-vault-path", (_event, folderPath) => {
  vaultPath = folderPath;
  saveVaultPath(folderPath);
  return folderPath;
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Выберите папку для заметок",
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  vaultPath = selectedPath;
  saveVaultPath(selectedPath);
  return selectedPath;
});

ipcMain.handle("select-files", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    title: "Выберите файлы для прикрепления",
  });

  if (result.canceled || !result.filePaths.length) {
    return [];
  }

  return result.filePaths;
});

ipcMain.handle("get-folder-size", async (_event, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== "string") {
      return { ok: false, error: "Invalid folder path" };
    }

    if (!fs.existsSync(folderPath)) {
      return { ok: false, error: "Folder does not exist" };
    }

    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) {
      return { ok: false, error: "Path is not a directory" };
    }

    const sizeBytes = getDirectorySizeBytes(folderPath);
    return { ok: true, sizeBytes };
  } catch (err) {
    console.error("get-folder-size error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("open-file-path", async (_event, filePath) => {
  try {
    if (!filePath || typeof filePath !== "string") {
      return { ok: false, error: "Invalid file path" };
    }

    const openResult = await shell.openPath(filePath);
    if (openResult) {
      return { ok: false, error: openResult };
    }

    return { ok: true };
  } catch (err) {
    console.error("open-file-path error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("read-image-as-data-url", async (_event, filePath) => {
  try {
    if (!filePath || typeof filePath !== "string") {
      return { ok: false, error: "Invalid file path" };
    }

    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "File does not exist" };
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = IMAGE_EXT_TO_MIME[ext] || "application/octet-stream";
    const base64 = fs.readFileSync(filePath).toString("base64");

    return {
      ok: true,
      dataUrl: `data:${mime};base64,${base64}`,
    };
  } catch (err) {
    console.error("read-image-as-data-url error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("import-cover-image", async (_event, folderPath, sourcePath) => {
  try {
    if (!folderPath) return { ok: false, error: "No vault path" };
    if (!sourcePath || typeof sourcePath !== "string") {
      return { ok: false, error: "Invalid source path" };
    }
    if (!fs.existsSync(sourcePath)) {
      return { ok: false, error: "Source file does not exist" };
    }

    const ext = path.extname(sourcePath).toLowerCase() || ".png";
    const safeExt = ext.replace(/[^a-z0-9.]/gi, "") || ".png";
    const fileName = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    const relativeAssetPath = `${IMAGES_DIR}/${fileName}`;

    const absoluteAssetPath = toVaultAbsolutePath(
      folderPath,
      relativeAssetPath,
    );
    fs.mkdirSync(path.dirname(absoluteAssetPath), { recursive: true });
    fs.copyFileSync(sourcePath, absoluteAssetPath);

    const mime = IMAGE_EXT_TO_MIME[safeExt] || "application/octet-stream";
    const base64 = fs.readFileSync(absoluteAssetPath).toString("base64");

    return {
      ok: true,
      relativePath: relativeAssetPath,
      dataUrl: `data:${mime};base64,${base64}`,
    };
  } catch (err) {
    console.error("import-cover-image error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("read-kanban-data", (_event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { columns: [], tasks: [] };
    }

    const kanbanPath = toVaultAbsolutePath(folderPath, KANBAN_FILE_NAME);
    const legacyKanbanPath = toVaultAbsolutePath(
      folderPath,
      LEGACY_KANBAN_FILE_NAME,
    );
    const targetPath = fs.existsSync(kanbanPath)
      ? kanbanPath
      : legacyKanbanPath;
    if (!fs.existsSync(targetPath)) return { columns: [], tasks: [] };

    const raw = fs.readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(raw);

    return {
      columns: Array.isArray(parsed?.columns) ? parsed.columns : [],
      tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
    };
  } catch (err) {
    console.error("read-kanban-data error:", err);
    return { columns: [], tasks: [] };
  }
});

ipcMain.handle("save-kanban-data", (_event, folderPath, payload) => {
  try {
    if (!folderPath) return { ok: false, error: "No vault path" };

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const kanbanPath = toVaultAbsolutePath(folderPath, KANBAN_FILE_NAME);
    fs.mkdirSync(path.dirname(kanbanPath), { recursive: true });
    const data = {
      columns: Array.isArray(payload?.columns) ? payload.columns : [],
      tasks: Array.isArray(payload?.tasks) ? payload.tasks : [],
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(kanbanPath, JSON.stringify(data, null, 2), "utf-8");

    return { ok: true };
  } catch (err) {
    console.error("save-kanban-data error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.on("save-kanban-data-sync", (event, folderPath, payload) => {
  try {
    if (!folderPath) {
      event.returnValue = { ok: false, error: "No vault path" };
      return;
    }

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const kanbanPath = toVaultAbsolutePath(folderPath, KANBAN_FILE_NAME);
    fs.mkdirSync(path.dirname(kanbanPath), { recursive: true });
    const data = {
      columns: Array.isArray(payload?.columns) ? payload.columns : [],
      tasks: Array.isArray(payload?.tasks) ? payload.tasks : [],
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(kanbanPath, JSON.stringify(data, null, 2), "utf-8");
    event.returnValue = { ok: true };
  } catch (err) {
    console.error("save-kanban-data-sync error:", err);
    event.returnValue = { ok: false, error: String(err) };
  }
});

ipcMain.handle("read-folder-metadata", (_event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { folders: [] };
    }

    const metadataPath = toVaultAbsolutePath(folderPath, FOLDERS_FILE_NAME);
    const legacyMetadataPath = toVaultAbsolutePath(
      folderPath,
      LEGACY_FOLDERS_FILE_NAME,
    );
    const targetPath = fs.existsSync(metadataPath)
      ? metadataPath
      : legacyMetadataPath;
    if (!fs.existsSync(targetPath)) return { folders: [] };

    const raw = fs.readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(raw);

    return {
      folders: Array.isArray(parsed?.folders) ? parsed.folders : [],
    };
  } catch (err) {
    console.error("read-folder-metadata error:", err);
    return { folders: [] };
  }
});

ipcMain.handle("save-folder-metadata", (_event, folderPath, payload) => {
  try {
    if (!folderPath) return { ok: false, error: "No vault path" };

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const metadataPath = toVaultAbsolutePath(folderPath, FOLDERS_FILE_NAME);
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
    const data = {
      folders: Array.isArray(payload?.folders) ? payload.folders : [],
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2), "utf-8");

    return { ok: true };
  } catch (err) {
    console.error("save-folder-metadata error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("read-markdown-files", (_event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) return [];

    const markdownFiles = listMarkdownFilesRecursive(folderPath);
    const files = [];

    for (const file of markdownFiles) {
      try {
        const content = fs.readFileSync(file.absolutePath, "utf-8");
        const stat = fs.statSync(file.absolutePath);
        files.push({
          filename: file.filename,
          relativePath: file.relativePath,
          content,
          updatedAt: stat.mtime.toISOString(),
        });
      } catch {
        // skip unreadable files
      }
    }

    return files;
  } catch (err) {
    console.error("read-markdown-files error:", err);
    return [];
  }
});

ipcMain.handle(
  "save-markdown-file",
  (_event, folderPath, relativePath, content) => {
    try {
      if (!folderPath) return { ok: false, error: "No vault path" };

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const finalRelativePath = sanitizeRelativeMarkdownPath(relativePath);
      const filePath = toVaultAbsolutePath(folderPath, finalRelativePath);

      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      fs.writeFileSync(filePath, content, "utf-8");
      return {
        ok: true,
        filename: path.basename(finalRelativePath),
        relativePath: finalRelativePath,
      };
    } catch (err) {
      console.error("save-markdown-file error:", err);
      return { ok: false, error: String(err) };
    }
  },
);

ipcMain.handle("delete-markdown-file", (_event, folderPath, filename) => {
  try {
    if (!folderPath) return { ok: false, error: "No vault path" };

    const filePath = toVaultAbsolutePath(folderPath, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { ok: true };
  } catch (err) {
    console.error("delete-markdown-file error:", err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle(
  "rename-markdown-file",
  (_event, folderPath, oldName, newName) => {
    try {
      if (!folderPath) return { ok: false, error: "No vault path" };

      const safeName = newName.replace(/[/\\:*?"<>|]/g, "_");
      const finalName = safeName.endsWith(".md") ? safeName : `${safeName}.md`;

      const oldPath = path.join(folderPath, oldName);
      const newPath = path.join(folderPath, finalName);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
      return { ok: true, filename: finalName };
    } catch (err) {
      console.error("rename-markdown-file error:", err);
      return { ok: false, error: String(err) };
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  loadVaultPath();
  loadUiSettings();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (server) {
    server.close();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});
