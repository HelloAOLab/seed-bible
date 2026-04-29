const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: "<rootDir>/test/env/CasualOSEnvironment.js",
  setupFilesAfterEnv: ["<rootDir>/test/env/setupCasualOSAppHooks.js"],
  transformIgnorePatterns: [
    "/node_modules/.pnpm/(?!(uuid|preact|@preact\\+signals|@preact\\+signals-core))",
  ],
  moduleNameMapper: {
    "^@packages/(.*)$": "<rootDir>/packages/$1",
    "^https:\\/\\/esm\\.helloao\\.org\\/vendor-\\w+\\.js$":
      "<rootDir>/lib/vendor.ts",
    "^https:\\/\\/esm\\.sh\\/i18next@23.16.8$":
      "<rootDir>/node_modules/i18next/index.js",
    "^https:\\/\\/esm\\.sh\\/react-i18next@15.1.2\\?alias=react:preact\\/compat,react-dom:preact\\/compat&external=preact$":
      "<rootDir>/node_modules/react-i18next/dist/commonjs/index.js",
    "^react$": "<rootDir>/node_modules/preact/compat/dist/compat.js",
    "^react-dom$": "<rootDir>/node_modules/preact/compat/dist/compat.js",
    "^typesense-fixed$": "<rootDir>/test/mocks/typesense.ts",
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
  },
  testPathIgnorePatterns: ["/node_modules/", "/obsolete/"],
  testTimeout: 60000,
};

// eslint-disable-next-line no-undef
module.exports = config;
