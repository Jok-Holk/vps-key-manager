const { app, BrowserWindow, ipcMain } = require("electron");

const SERVER_URL = "https://console.jokholk.dev";

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // win.webContents.openDevTools(); // uncomment to debug
}

app.whenReady().then(() => {
  // Import keyManager only after app is ready — safeStorage requires app ready
  const { generateAndStoreKeypair, getPublicKey, hasKeypair, signNonce } = require("./keyManager");

  createWindow();

  ipcMain.handle("key:hasKeypair", async () => {
    return hasKeypair();
  });

  ipcMain.handle("key:getPublicKey", async () => {
    return getPublicKey();
  });

  ipcMain.handle("key:generate", async () => {
    const { publicKey } = await generateAndStoreKeypair();
    return { publicKey };
  });

  // Full challenge-response flow: fetch nonce → sign → verify → receive key+pass
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
      const err = await verifyRes.json();
      throw new Error(err.error ?? "Verification failed");
    }

    const { key, pass } = await verifyRes.json();
    return { key, pass };
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});