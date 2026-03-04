/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transformIgnorePatterns: [
    "<rootDir>/node_modules/\\.pnpm/(?!(htm|preact|uuid|@casual-simulation\\+))",
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
