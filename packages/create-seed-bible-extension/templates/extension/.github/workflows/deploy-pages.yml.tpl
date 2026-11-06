# Publishes the extension to GitHub Pages on every push to main.
# One-time setup: in the repository's Settings > Pages, set "Source" to
# "GitHub Actions". The install page is then at
# https://<user>.github.io/<repository>/
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      # Checks, tests and builds, then writes dist/site/.
      - run: npm run package
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/site
      - id: deployment
        uses: actions/deploy-pages@v4
