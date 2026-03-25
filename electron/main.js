const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const handler = require("serve-handler");

let server;

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
    },
  });

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
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
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
