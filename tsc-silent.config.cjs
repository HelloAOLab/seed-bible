module.exports = {
  suppress: [
    {
      pathRegExp: "node_modules",
      codes: [2322, 2538],
    },
    {
      pathRegExp: "script/lib/browser.ts",
      codes: [2353],
    },
    {
      pathRegExp: "script/lib/extension.ts",
      codes: [2353],
    },
  ],
};
