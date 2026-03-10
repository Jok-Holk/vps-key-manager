module.exports = {
  target: "electron-preload",
  node: {
    __dirname: false,
    __filename: false,
  },
  // Preload only needs electron built-ins, no native module relocation needed
  module: {
    rules: [
      {
        test: /native_modules[/\\].+\.node$/,
        use: "node-loader",
      },
    ],
  },
};