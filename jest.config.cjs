/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transformIgnorePatterns: [
    '/node_modules/.pnpm/(?!(uuid))'
  ],
  testTimeout: 30000,
};

// eslint-disable-next-line no-undef
module.exports = config;