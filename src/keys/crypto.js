/**
 * crypto.js — Pure cryptographic operations (no Electron dependency)
 * All functions are stateless — pass keys in, get results out.
 */
const crypto = require("crypto");

/**
 * Generate a new Ed25519 keypair, return PEM strings
 */
function generateKeypair() {
  return crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
}

/**
 * Derive public key PEM from private key PEM
 */
function derivePublicKey(privateKeyPem) {
  return crypto
    .createPublicKey(privateKeyPem)
    .export({ type: "spki", format: "pem" });
}

/**
 * Sign a hex-encoded nonce, return base64 signature
 */
function signNonce(privateKeyPem, nonceHex) {
  const key = crypto.createPrivateKey(privateKeyPem);
  return crypto
    .sign(null, Buffer.from(nonceHex, "hex"), key)
    .toString("base64");
}

/**
 * Encrypt a PEM string with a user password using AES-256-GCM
 * File format: salt(16) + iv(12) + authTag(16) + ciphertext
 */
function encryptWithPassword(pem, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(pem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]);
}

/**
 * Decrypt a bundle created by encryptWithPassword
 * Returns the PEM string or throws on wrong password
 */
function decryptWithPassword(bundle, password) {
  const salt = bundle.subarray(0, 16);
  const iv = bundle.subarray(16, 28);
  const tag = bundle.subarray(28, 44);
  const encrypted = bundle.subarray(44);

  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pem = decipher.update(encrypted) + decipher.final("utf8");

  // Validate — throws if not a valid Ed25519 key
  crypto.createPrivateKey(pem);
  return pem;
}

module.exports = {
  generateKeypair,
  derivePublicKey,
  signNonce,
  encryptWithPassword,
  decryptWithPassword,
};
