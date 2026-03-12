/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transformIgnorePatterns: [
    "/node_modules/.pnpm/(?!(uuid|preact|@preact\\+signals|@preact\\+signals-core))",
  ],
  moduleNameMapper: {
    "^@packages/(.*)$": "<rootDir>/packages/$1",
    "^https:\\/\\/esm\\.helloao\\.org\\/vendor-\\w+\\.js$":
      "<rootDir>/lib/vendor.ts",
  },
  testTimeout: 60000,
};

// eslint-disable-next-line no-undef
module.exports = config;
