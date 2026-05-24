// Stub for the broken `require("../../package.json")` call inside
// @stellar/stellar-sdk v14.x's `lib/*/bindings/config.js`. The relative
// path is wrong post-build (a packaging bug fixed in v15). The require
// only reads `.version`, which only matters when `ConfigGenerator` is
// instantiated by the CLI — never at runtime in the mobile app.
module.exports = { version: "14.6.1" };
