# 📖 Seed Bible
The source code behind the Seed Bible.

## Developing

Follow the given steps to get started developing the Seed Bible:

1. First, make sure you have the following programs installed:
    -   [Git](https://git-scm.com/downloads)
    -   [Node.js](https://nodejs.org)
        -   Install [nvm](https://github.com/nvm-sh/nvm) if you are on MacOS/Linux/WSL.
        -   Install [nvm-windows](https://github.com/coreybutler/nvm-windows) if you are on Windows.
        -   Next, install the latest Node version:
            -   `nvm install latest`
            -   `nvm use latest`
    -   The [`casualos` CLI](https://www.npmjs.com/package/casualos)
        -   `npm install -g casualos`
    -   [PNPM](https://pnpm.io/)
        -   v10.x is required
        -   You can install PNPM by using corepack:
            -   `corepack use pnpm@latest-10`
2. Clone the repository:
    -   `git clone git@github.com:HelloAOLab/seed-bible.git`
3. Install dependencies
    -   `pnpm install`
    -   `pnpm puppeteer browsers install chrome` - (Optional) Install Chrome for developing directly from the repo.
4. Open the repository with your favorite editor
5. Run the Seed bible package in Chrome
    -   `pnpm dev`
    -   Each run gives you a clean inst static to work in with the local seed bible.

### Scripts

There are several utility scripts:

-   `pnpm dev` - Runs the SeedBible in development mode.
    -   It will open Chrome in a clean inst from the state in the repository.
    -   It also opens a REPL that has a couple helper scripts:
        -   `.save [extension]` - Saves the state in the inst to the local file system. If an extension name is provided, then it will be saved. If none is provided, then the core seed bible app will be saved.
        -   `.reload` - Reloads and resets the page to match what is in the local file system. Useful if you've made changes in VSCode and want to quickly update chrome to them.
        -   `.system` - Opens the system portal.
        -   `.chat [message]` - Sends the given message via the `@onChat` shout, just like the chat bar.
        -   `.download` - Sends the `.download` chat message to download the AUX file.
    -   The REPL also has a couple helper functions:
        -   `run(script)` - Executes the given AUX Script.
        -   `shout(name, arg?)` - Runs the given shout with the given argument.
-   `pnpm package` - Builds all of the packages and extensions into `.aux` files in the `dist` folder.
-   `pnpm pattern` - A simple CLI that makes it easier to work with AO patterns.
    -   `download <pattern>` - Downloads the given pattern and saves it to the `dist` folder.
    -   `unpack <pattern>` - Downloads and unpacks the given pattern so that it is applied to the packages folder.
    -   `publish <package>` - Uploads the given package as a pattern.
-   `pnpm extension` - A simple CLI that makes it easier to work with SeedBible extensions.
    -   `list` - Lists the extensions that are in the records system.
    -   `download <extension>` - Downloads the given extension as an AUX and saves it to the `dist` folder.
    -   `unpack <extension>` - Downloads and unpacks the extension to the packages folder.

#### How to start the dev server

-   `pnpm dev`

#### How to download the core app to the repository

1. Use the `pattern` CLI:
    -   `pnpm pattern unpack SeedBible`

### How to download an extension (e.g. Playlist) to the repository

1. Use the `extension` CLI:
    -   `pnpm extension unpack Playlist`

## About Us

[AO Lab](https://helloao.org/) is a non-profit company dedicated to loving and living out the Word of God. The goal of this project is to make the Bible (and related resources) freely available to anyone who should need it in a format that is optimized for use by applications.

## License

All the source code in this repository is publicly available under the [AGPL License](./LICENSE).

### Commercial Use

If you would like to use this project without complying with AGPL requirements (e.g., without disclosing your source code), you can purchase a commercial license.

Contact us at [hello@helloao.org](mailto:hello@helloao.org) for more information.