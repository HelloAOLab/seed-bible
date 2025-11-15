/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transformIgnorePatterns: ["/node_modules/.pnpm/(?!(uuid))"],
  moduleNameMapper: {
    "^@packages/(.*)$": "<rootDir>/packages/$1",
  },
  testTimeout: 30000,
};

// eslint-disable-next-line no-undef
module.exports = config;
