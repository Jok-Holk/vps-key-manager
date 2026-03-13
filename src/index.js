const { app, BrowserWindow, ipcMain } = require("electron");

const SERVER_URL = "https://console.jokholk.dev";

function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 900,
    resizable: true,
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
