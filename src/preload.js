const { contextBridge, ipcRenderer } = require("electron");

// Expose safe IPC bridge to renderer — no Node.js APIs exposed directly
contextBridge.exposeInMainWorld("vpsControl", {
  hasKeypair: () => ipcRenderer.invoke("key:hasKeypair"),
  getPublicKey: () => ipcRenderer.invoke("key:getPublicKey"),
  generateKey: () => ipcRenderer.invoke("key:generate"),
  signNonce: (nonce) => ipcRenderer.invoke("key:signNonce", nonce),
  exportKey: (password) => ipcRenderer.invoke("key:export", password),
  importKey: (password) => ipcRenderer.invoke("key:import", password),
  generatePass: () => ipcRenderer.invoke("auth:generatePass"),
  getServerUrl: () => ipcRenderer.invoke("config:getServerUrl"),
  setServerUrl: (url) => ipcRenderer.invoke("config:setServerUrl", url),
});
