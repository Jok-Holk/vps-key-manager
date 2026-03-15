/**
 * ipc.js — All IPC handlers registration
 * Called once after app.whenReady()
 */
const { ipcMain } = require("electron");
const { getServerUrl, setServerUrl } = require("./config");

function registerIpcHandlers(keyManager) {
  const {
    generateAndStoreKeypair,
    getPublicKey,
    hasKeypair,
    signNonce,
    exportKeypair,
    importKeypair,
  } = keyManager;

  // ── Key management ───────────────────────────────────────────────────────
  ipcMain.handle("key:hasKeypair", () => hasKeypair());
  ipcMain.handle("key:getPublicKey", () => getPublicKey());
  ipcMain.handle("key:generate", () => generateAndStoreKeypair());
  ipcMain.handle("key:signNonce", (_, nonce) => signNonce(nonce));
  ipcMain.handle("key:export", (_, password) => exportKeypair(password));
  ipcMain.handle("key:import", (_, password) => importKeypair(password));

  // ── Server URL config ────────────────────────────────────────────────────
  ipcMain.handle("config:getServerUrl", () => getServerUrl());
  ipcMain.handle("config:setServerUrl", (_, url) => {
    const saved = setServerUrl(url);
    return { success: true, url: saved };
  });

  // ── Auth: full challenge-response → one-time key+pass ───────────────────
  ipcMain.handle("auth:generatePass", async () => {
    const serverUrl = getServerUrl();
    if (!serverUrl) throw new Error("Server URL not configured");

    const nonceRes = await fetch(`${serverUrl}/api/auth/nonce`);
    if (!nonceRes.ok) throw new Error("Cannot reach server");
    const { nonce } = await nonceRes.json();

    const signature = await signNonce(nonce);

    const verifyRes = await fetch(`${serverUrl}/api/auth/verify`, {
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
}

module.exports = { registerIpcHandlers };
