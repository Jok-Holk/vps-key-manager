const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app, safeStorage } = require("electron");

function getKeyPath() {
  return path.join(app.getPath("userData"), "device.key");
}

async function generateAndStoreKeypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding:  { type: "spki",  format: "pem" },
  });

  // Encrypt with OS-level encryption (DPAPI on Windows, Keychain on macOS)
  const encrypted = safeStorage.encryptString(privateKey);
  fs.writeFileSync(getKeyPath(), encrypted);

  return { publicKey };
}

async function getPublicKey() {
  const privatePem = loadPrivateKey();
  if (!privatePem) return null;
  return crypto.createPublicKey(privatePem).export({ type: "spki", format: "pem" });
}

async function hasKeypair() {
  return fs.existsSync(getKeyPath());
}

// Signs the nonce with the stored private key, returns base64 signature
async function signNonce(nonceHex) {
  const privatePem = loadPrivateKey();
  if (!privatePem) throw new Error("No private key found");
  const privateKey = crypto.createPrivateKey(privatePem);
  const signature = crypto.sign(null, Buffer.from(nonceHex, "hex"), privateKey);
  return signature.toString("base64");
}

function loadPrivateKey() {
  const keyPath = getKeyPath();
  if (!fs.existsSync(keyPath)) return null;
  const encrypted = fs.readFileSync(keyPath);
  return safeStorage.decryptString(encrypted);
}

module.exports = { generateAndStoreKeypair, getPublicKey, hasKeypair, signNonce };