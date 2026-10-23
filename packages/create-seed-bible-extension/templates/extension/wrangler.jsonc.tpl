// For hosting on Cloudflare Workers: `npm run deploy:cloudflare-workers`.
// (For Cloudflare Pages, `npm run deploy:cloudflare-pages` needs no config.)
// dist/site/_headers sets the headers Seed Bible needs.
{
  "name": "{{extensionId}}",
  "compatibility_date": "2025-09-01",
  "assets": {
    "directory": "./dist/site"
  }
}
