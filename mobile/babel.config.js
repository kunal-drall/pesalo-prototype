module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Top-level plugin wins over the same plugin inside babel-preset-expo.
    // passkey-kit ships its TS source as the package entry (`main:
    // src/index.ts`), and the flow strip-types step inside the preset
    // chokes on `declare class field` syntax without this flag.
    plugins: [
      ["@babel/plugin-transform-flow-strip-types", { allowDeclareFields: true }]
    ]
  };
};
