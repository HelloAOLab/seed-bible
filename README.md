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
2. Clone the repository:
    -   `git clone git@github.com:HelloAOLab/seed-bible.git`
3. Open the repository with your favorite editor.

### Scripts

How to get a `.aux` file:

1.   Run the `package:seed-bible` script:
    -   `npm run package:seed-bible`
    -   It will put the file in `dist/seed-bible.aux`.

How to update the files from a `seed-bible.aux` file:

1.   First, delete all the existing files in the `packages/seed-bible` folder:
    -   `rm -r ./packages/seed-bible`
2.   Second, unpack the aux file into the `packages` folder (it should be named `seed-bible.aux` so that the folder name matches):
    -   `casualos unpack-aux path/to/seed-bible.aux ./packages`

## About Us

[AO Lab](https://helloao.org/) is a non-profit company dedicated to loving and living out the Word of God. The goal of this project is to make the Bible (and related resources) freely available to anyone who should need it in a format that is optimized for use by applications.

## License

All the source code in this repository is publicly available under the [AGPL License](./LICENSE).

### Commercial Use

If you would like to use this project without complying with AGPL requirements (e.g., without disclosing your source code), you can purchase a commercial license.

Contact us at [hello@helloao.org](mailto:hello@helloao.org) for more information.