const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app, safeStorage, dialog } = require("electron");

// Encrypted key file stored in OS app data directory
function getKeyPath() {
  return path.join(app.getPath("userData"), "device.key");
}

// Decrypt and return PEM private key
function loadPrivateKey() {
  const keyPath = getKeyPath();
  if (!fs.existsSync(keyPath)) return null;
  return safeStorage.decryptString(fs.readFileSync(keyPath));
}

// Generate Ed25519 keypair, encrypt private key with OS-level encryption (DPAPI on Windows)
async function generateAndStoreKeypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  fs.writeFileSync(getKeyPath(), safeStorage.encryptString(privateKey));
  return { publicKey };
}

// Derive public key from stored private key
async function getPublicKey() {
  const pem = loadPrivateKey();
  if (!pem) return null;
  return crypto.createPublicKey(pem).export({ type: "spki", format: "pem" });
}

async function hasKeypair() {
  return fs.existsSync(getKeyPath());
}

// Sign a hex nonce with the stored private key, return base64 signature
async function signNonce(nonceHex) {
  const pem = loadPrivateKey();
  if (!pem) throw new Error("No private key found");
  const privateKey = crypto.createPrivateKey(pem);
  return crypto
    .sign(null, Buffer.from(nonceHex, "hex"), privateKey)
    .toString("base64");
}

// Export: encrypt private key with a user-supplied password using AES-256-GCM
// File format: salt(16) + iv(12) + authTag(16) + ciphertext
async function exportKeypair(password) {
  const pem = loadPrivateKey();
  if (!pem) throw new Error("No keypair to export");

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(pem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const { filePath } = await dialog.showSaveDialog({
    title: "Export VPS Keypair",
    defaultPath: "vps-keypair.vpskey",
    filters: [{ name: "VPS Key", extensions: ["vpskey"] }],
  });

  if (!filePath) return { cancelled: true };
  fs.writeFileSync(filePath, Buffer.concat([salt, iv, tag, encrypted]));
  return { success: true };
}

// Import: read .vpskey file, decrypt with password, store into OS-encrypted storage
async function importKeypair(password) {
  const { filePaths } = await dialog.showOpenDialog({
    title: "Import VPS Keypair",
    filters: [{ name: "VPS Key", extensions: ["vpskey"] }],
    properties: ["openFile"],
  });

  if (!filePaths?.length) return { cancelled: true };

  const bundle = fs.readFileSync(filePaths[0]);
  const salt = bundle.subarray(0, 16);
  const iv = bundle.subarray(16, 28);
  const tag = bundle.subarray(28, 44);
  const encrypted = bundle.subarray(44);

  try {
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const pem = decipher.update(encrypted) + decipher.final("utf8");

    // Validate the decrypted content is a real Ed25519 private key
    crypto.createPrivateKey(pem);

    fs.writeFileSync(getKeyPath(), safeStorage.encryptString(pem));
    return { success: true };
  } catch {
    return { error: "Wrong password or corrupted file" };
  }
}

module.exports = {
  generateAndStoreKeypair,
  getPublicKey,
  hasKeypair,
  signNonce,
  exportKeypair,
  importKeypair,
};
