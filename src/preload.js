const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vpsControl", {
  hasKeypair: () => ipcRenderer.invoke("key:hasKeypair"),
  getPublicKey: () => ipcRenderer.invoke("key:getPublicKey"),
  generateKey: () => ipcRenderer.invoke("key:generate"),
  generatePass: () => ipcRenderer.invoke("auth:generatePass"),
});
