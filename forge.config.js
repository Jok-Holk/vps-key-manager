const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");

module.exports = {
  packagerConfig: {
    asar: true,
    name: "VPS Key Manager",
    executableName: "vps-key-manager",
    icon: path.join(__dirname, "assets", "icon"), // Forge appends .ico/.icns/.png per platform
    appVersion: "1.0.0",
    appCopyright: "Copyright © 2026 Jok-Holk",
    win32metadata: {
      CompanyName: "Jok-Holk",
      FileDescription: "VPS Key Manager — Ed25519 auth for VPS Manager",
      ProductName: "VPS Key Manager",
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "vps_key_manager",
        setupIcon: path.join(__dirname, "assets", "icon.ico"),
        iconUrl:
          "https://raw.githubusercontent.com/Jok-Holk/vps-key-manager/main/assets/icon.ico",
      },
    },
    { name: "@electron-forge/maker-zip", platforms: ["darwin"] },
    {
      name: "@electron-forge/maker-deb",
      config: { options: { icon: path.join(__dirname, "assets", "icon.png") } },
    },
    { name: "@electron-forge/maker-rpm", config: {} },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        port: 4000,
        loggerPort: 9001,
        devContentSecurityPolicy:
          "default-src 'self' 'unsafe-inline' data: 'unsafe-eval'; " +
          "connect-src * http://localhost:* ws://localhost:*; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.js",
              name: "main_window",
              preload: {
                js: "./src/preload.js",
                config: "./webpack.preload.config.js",
              },
            },
          ],
        },
      },
    },
    {
      name: "@electron-forge/plugin-fuses",
      config: {
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
      },
    },
  ],
};
