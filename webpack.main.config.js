module.exports = {
  entry: "./src/index.js",
  target: "electron-main",
  node: {
    __dirname: false,
    __filename: false,
  },
  // Exclude native modules from bundling — require them at runtime instead
  externals: {
    keytar: "commonjs keytar",
    "fs":   "commonjs fs",
    "path": "commonjs path",
    "crypto": "commonjs crypto",
  },
  module: {
    rules: require("./webpack.rules"),
  },
};