/**
 * keyStore.js — Electron-specific key storage using OS-level encryption (safeStorage)
 * and file dialogs for import/export
 */
const fs = require("fs");
const path = require("path");
const { app, safeStorage, dialog } = require("electron");

function getKeyPath() {
  return path.join(app.getPath("userData"), "device.key");
}

function hasKey() {
  return fs.existsSync(getKeyPath());
}

/** Load and decrypt private key PEM from OS-encrypted storage */
function loadPrivateKey() {
  const keyPath = getKeyPath();
  if (!fs.existsSync(keyPath)) return null;
  return safeStorage.decryptString(fs.readFileSync(keyPath));
}

/** Save private key PEM into OS-encrypted storage */
function savePrivateKey(pem) {
  fs.writeFileSync(getKeyPath(), safeStorage.encryptString(pem));
}

/** Show save dialog, write bundle to chosen path */
async function saveToFile(bundle, defaultName = "vps-keypair.vpskey") {
  const { filePath } = await dialog.showSaveDialog({
    title: "Export VPS Keypair",
    defaultPath: defaultName,
    filters: [{ name: "VPS Key", extensions: ["vpskey"] }],
  });
  if (!filePath) return null;
  fs.writeFileSync(filePath, bundle);
  return filePath;
}

/** Show open dialog, read and return file buffer */
async function loadFromFile() {
  const { filePaths } = await dialog.showOpenDialog({
    title: "Import VPS Keypair",
    filters: [{ name: "VPS Key", extensions: ["vpskey"] }],
    properties: ["openFile"],
  });
  if (!filePaths?.length) return null;
  return fs.readFileSync(filePaths[0]);
}

module.exports = {
  getKeyPath,
  hasKey,
  loadPrivateKey,
  savePrivateKey,
  saveToFile,
  loadFromFile,
};
