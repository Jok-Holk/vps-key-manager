const { app, BrowserWindow, ipcMain } = require("electron");
const electronApp = app;

// Server URL is configurable — stored in electron-store, default empty
const path = require("path");
const fs = require("fs");

const configPath = path.join(
  electronApp?.getPath?.("userData") ?? ".",
  "config.json",
);

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

function saveConfig(data) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  } catch {}
}

const _config = loadConfig();
let SERVER_URL = _config.serverUrl ?? "";

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 680,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Import after app ready — safeStorage requires app to be ready
  const {
    generateAndStoreKeypair,
    getPublicKey,
    hasKeypair,
    signNonce,
    exportKeypair,
    importKeypair,
  } = require("./keyManager");

  createWindow();

  ipcMain.handle("key:hasKeypair", () => hasKeypair());

  // Server URL config
  ipcMain.handle("config:getServerUrl", () => loadConfig().serverUrl ?? "");
  ipcMain.handle("config:setServerUrl", (_, url) => {
    const cfg = loadConfig();
    cfg.serverUrl = url.trim();
    saveConfig(cfg);
    SERVER_URL = cfg.serverUrl;
    return { success: true };
  });
  ipcMain.handle("key:getPublicKey", () => getPublicKey());
  ipcMain.handle("key:generate", () => generateAndStoreKeypair());
  ipcMain.handle("key:signNonce", (_, nonce) => signNonce(nonce));
  ipcMain.handle("key:export", (_, password) => exportKeypair(password));
  ipcMain.handle("key:import", (_, password) => importKeypair(password));

  // Full challenge-response: fetch nonce → sign → verify → receive one-time key+pass
  ipcMain.handle("auth:generatePass", async () => {
    const nonceRes = await fetch(`${SERVER_URL}/api/auth/nonce`);
    if (!nonceRes.ok) throw new Error("Cannot reach server");
    const { nonce } = await nonceRes.json();

    const signature = await signNonce(nonce);

    const verifyRes = await fetch(`${SERVER_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce, signature }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      throw new Error(err.error ?? "Verification failed");
    }

    return verifyRes.json(); // { key, pass }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
