{
  "name": "{{packageName}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "seed-bible-extension-scripts check",
    "test": "seed-bible-extension-scripts test",
    "build": "seed-bible-extension-scripts build",
    "build:standalone": "seed-bible-extension-scripts build --standalone",
    "dev": "seed-bible-extension-scripts dev"
  },
  "dependencies": {
    "preact": "10.29.2",
    "@preact/signals": "2.9.1"
  },
  "devDependencies": {
    "seed-bible-extension-scripts": "{{scriptsVersion}}",
    "@eslint/js": "^9.32.0",
    "@eslint/json": "^1.2.0",
    "@preact/preset-vite": "^2.10.5",
    "@typescript-eslint/utils": "^8.58.0",
    "es-toolkit": "1.39.10",
    "eslint": "^9.32.0",
    "jsdom": "^29.1.1",
    "prettier": "^3.6.2",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.38.0",
    "vite": "^8.0.13",
    "vitest": "^4.1.8"
  }
}
