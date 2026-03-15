/**
 * config.js — Persistent app config (server URL, etc.)
 * Stored in Electron's userData directory as config.json
 */
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const configPath = path.join(app.getPath("userData"), "config.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

function saveConfig(data) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  } catch {}
}

function getServerUrl() {
  return loadConfig().serverUrl ?? "";
}

function setServerUrl(url) {
  const cfg = loadConfig();
  cfg.serverUrl = url.trim();
  saveConfig(cfg);
  return cfg.serverUrl;
}

module.exports = { loadConfig, saveConfig, getServerUrl, setServerUrl };
