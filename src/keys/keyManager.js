/**
 * keyManager.js — Public API for key operations
 * Coordinates between crypto.js (pure) and keyStore.js (Electron I/O)
 */
const {
  generateKeypair,
  derivePublicKey,
  signNonce: cryptoSign,
  encryptWithPassword,
  decryptWithPassword,
} = require("./crypto");
const {
  hasKey,
  loadPrivateKey,
  savePrivateKey,
  saveToFile,
  loadFromFile,
} = require("./keyStore");

async function hasKeypair() {
  return hasKey();
}

async function generateAndStoreKeypair() {
  const { privateKey, publicKey } = generateKeypair();
  savePrivateKey(privateKey);
  return { publicKey };
}

async function getPublicKey() {
  const pem = loadPrivateKey();
  if (!pem) return null;
  return derivePublicKey(pem);
}

async function signNonce(nonceHex) {
  const pem = loadPrivateKey();
  if (!pem) throw new Error("No private key found");
  return cryptoSign(pem, nonceHex);
}

async function exportKeypair(password) {
  const pem = loadPrivateKey();
  if (!pem) throw new Error("No keypair to export");

  const bundle = encryptWithPassword(pem, password);
  const filePath = await saveToFile(bundle);
  if (!filePath) return { cancelled: true };
  return { success: true };
}

async function importKeypair(password) {
  const bundle = await loadFromFile();
  if (!bundle) return { cancelled: true };

  try {
    const pem = decryptWithPassword(bundle, password);
    savePrivateKey(pem);
    return { success: true };
  } catch {
    return { error: "Wrong password or corrupted file" };
  }
}

module.exports = {
  hasKeypair,
  generateAndStoreKeypair,
  getPublicKey,
  signNonce,
  exportKeypair,
  importKeypair,
};
