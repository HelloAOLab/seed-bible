# 📖 Seed Bible

The source code behind the Seed Bible.

## Developing

Follow the given steps to get started developing the Seed Bible:

1. First, make sure you have the following programs installed:
   - [Git](https://git-scm.com/downloads)
   - [Node.js](https://nodejs.org)
     - Install [nvm](https://github.com/nvm-sh/nvm) if you are on MacOS/Linux/WSL.
     - Install [nvm-windows](https://github.com/coreybutler/nvm-windows) if you are on Windows.
     - Next, install the latest Node version:
       - `nvm install latest`
       - `nvm use latest`
   - The [`casualos` CLI](https://www.npmjs.com/package/casualos)
     - `npm install -g casualos`
   - [PNPM](https://pnpm.io/)
     - v10.x is required
     - You can install PNPM by using corepack:
       - `corepack use pnpm@latest-10`
2. Clone the repository:
   - `git clone git@github.com:HelloAOLab/seed-bible.git`
3. Install dependencies
   - `pnpm install`
   - `pnpm puppeteer browsers install chrome` - (Optional) Install Chrome for developing directly from the repo.
4. Open the repository with your favorite editor
5. Run the Seed bible package in Chrome
   - `pnpm dev`
   - Each run gives you a clean inst static to work in with the local seed bible.

### Scripts

There are several utility scripts:

- `pnpm dev` - Runs the SeedBible in development mode.
  - It will open Chrome in a clean inst from the state in the repository.
  - It also opens a REPL that has a couple helper scripts:
    - `.reload` - Reloads and resets the page to match what is in the local file system. Useful if you've made changes in VSCode and want to quickly update chrome to them.
    - `.system` - Opens the system portal.
    - `.chat [message]` - Sends the given message via the `@onChat` shout, just like the chat bar.
    - `.download` - Sends the `.download` chat message to download the AUX file.
  - The REPL also has a couple helper functions:
    - `run(script)` - Executes the given AUX Script.
    - `shout(name, arg?)` - Runs the given shout with the given argument.
- `pnpm check:ts` - Runs the TypeScript checker.
- `pnpm lint` - Runs linting.
- `pnpm test` - Runs tests.
- `pnpm test:watch` - Runs tests in watch mode.
- `pnpm package` - Builds all of the packages and extensions into `.aux` files in the `dist` folder.

#### How to start the dev server

- `pnpm dev`

#### How to download the core app to the repository

1. Use the `pattern` CLI:
   - `pnpm pattern unpack SeedBible`

## Releasing

Production is deployed by merging `develop` into `main`: `cd.yml` builds and ships the merged commit to [seedbible.org](https://seedbible.org). Releasing adds a git tag, a GitHub Release, and a dated CHANGELOG entry on top of that deploy.

Day to day, add notes to the `## TBD` section at the top of [CHANGELOG.md](./CHANGELOG.md) as you land changes (Added / Changed / Fixed / Removed).

When you're ready to cut a release, run the prepare step **on `develop`**:

```bash
pnpm release:prepare minor    # or: patch | major | an explicit version like 1.4.0
```

This does three things in one commit's worth of edits:

- bumps the `version` in `packages/seed-bible/package.json` (the version baked into the build),
- rewrites the CHANGELOG's `## TBD` heading to `## v<version> — <YYYY-MM-DD>`, and
- inserts a fresh, empty `## TBD` above it so `develop` is ready for the next cycle.

Review the diff, commit on `develop`, and open a PR. Then merge `develop` → `main` as usual. On that push, [`release.yml`](./.github/workflows/release.yml) reads the version, tags the commit `v<version>`, and publishes a GitHub Release whose notes are that version's CHANGELOG section. It is idempotent — a push to `main` that didn't bump the version (e.g. a hotfix) deploys but creates no release.

## About Us

[AO Lab](https://helloao.org/) is a non-profit company dedicated to loving and living out the Word of God. The goal of this project is to make the Bible (and related resources) freely available to anyone who should need it in a format that is optimized for use by applications.

## License

All the source code in this repository is publicly available under the [AGPL License](./LICENSE).

### Commercial Use

If you would like to use this project without complying with AGPL requirements (e.g., without disclosing your source code), you can purchase a commercial license.

Contact us at [hello@helloao.org](mailto:hello@helloao.org) for more information.
