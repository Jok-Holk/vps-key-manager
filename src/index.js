/**
 * index.js — Main process entry point
 * Wires together: window, IPC handlers, app lifecycle
 */
const { app } = require("electron");
const { createWindow } = require("./core/window");
const { registerIpcHandlers } = require("./core/ipc");

app.whenReady().then(() => {
  // keyManager requires app to be ready (safeStorage)
  const keyManager = require("./keys/keyManager");

  createWindow();
  registerIpcHandlers(keyManager);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
