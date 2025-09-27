import puppeteer from "puppeteer";
import {
  cleanupAux,
  listPackages,
  packageAll,
  packageSingle,
  readPackage,
} from "./lib/package.js";
import {
  initPage,
  loadInst,
  addAux,
  shout,
  getPrimarySim,
  execScript,
  getPackageData,
  registerPackage,
  waitForPackage,
  loadSeedBible,
  DEFAULT_EXTENSIONS,
} from "./lib/browser.js";
import { rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import repl from "node:repl";
import { v4 as uuid } from "uuid";
import type { StoredAux } from "../typings/AuxLibraryDefinitions.js";

const extraExtensions = process.argv.slice(2);

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
});

let page: puppeteer.Page;

async function startPage() {
  const allPackages = [...new Set([...DEFAULT_EXTENSIONS, ...extraExtensions])];

  await Promise.all(allPackages.map((pkg) => packageSingle(pkg, "ignore")));

  page = await browser.newPage();

  await loadSeedBible(page, extraExtensions);
}

await startPage();

process.on("exit", async () => {
  if (browser.connected) {
    await browser.close();
  }
});

browser.on("disconnected", () => {
  process.exit(0);
});

const server = repl.start("> ");

server.context.page = page;
server.context.browser = browser;
server.context.addAux = addAux;
server.context.shout = shout;
server.context.loadInst = loadInst;
server.context.readPackage = readPackage;
server.context.listPackages = listPackages;

server.defineCommand("system", {
  help: "Open the system portal",
  action: async (name) => {
    server.clearBufferedCommand();

    const sim = await getPrimarySim(page);
    try {
      await sim.evaluate(async (s, name) => {
        await s.helper.updateBot(s.helper.userBot, {
          tags: {
            systemPortal: name || true,
          },
        });
      }, name);

      server.displayPrompt();
    } finally {
      sim.dispose();
    }
  },
});

server.defineCommand("save", {
  help: "Save the current state back to the repository",
  action: async (packageName: string) => {
    server.clearBufferedCommand();

    const sim = await getPrimarySim(page);
    try {
      const state = cleanupAux(
        await sim.evaluate((s) => {
          const state = {};
          for (const id in s.helper.botsState) {
            const bot = s.helper.botsState[id];
            state[id] = {
              id: bot.id,
              space: bot.space,
              tags: { ...bot.tags },
            };
          }

          return state;
        })
      );

      const packages = (await listPackages()).filter((p) => p !== "seed-bible");

      const unpack = async (pkg: string, aux: StoredAux) => {
        console.log("Saving package:", pkg);
        const filePath = path.resolve("dist", `${pkg}.aux`);
        await writeFile(filePath, JSON.stringify(aux, null, 2), "utf-8");

        const packagePath = path.resolve("packages", pkg);
        await rmdir(packagePath, { recursive: true, force: true });
        execSync(`casualos unpack-aux --overwrite "${filePath}" ./packages`, {
          stdio: "ignore",
        });

        const data = await getPackageData(page, pkg);
        if (!data) {
          console.warn("No package data found for", pkg);
        } else {
          const extensionPath = path.resolve("packages", pkg, "extension.json");
          await writeFile(
            extensionPath,
            JSON.stringify(data, null, 2),
            "utf-8"
          );
        }
      };

      const seedBible = {
        version: 1,
        state: {},
      };

      const packageAuxes = [];

      for (const id in state) {
        const bot = state[id];
        const system = bot.tags.system ? bot.tags.system.toLowerCase() : null;
        const forPackage = bot.tags.forPackage
          ? bot.tags.forPackage.toLowerCase()
          : null;
        let hasPackage = false;
        for (const pkg of packages) {
          const pkgLower = pkg.toLowerCase();
          let found = false;
          if (forPackage && forPackage === pkgLower) {
            found = true;
          } else if (system && system.startsWith(pkgLower)) {
            found = true;
          }

          if (found) {
            let aux = packageAuxes.find((p) => p.name === pkg);
            if (!aux) {
              aux = {
                name: pkg,
                aux: {
                  version: 1,
                  state: {},
                },
              };
              packageAuxes.push(aux);
            }

            aux.aux.state[id] = bot;
            hasPackage = true;
            break;
          }
        }

        if (!hasPackage && (!forPackage || forPackage === "seed-bible")) {
          seedBible.state[id] = bot;
        }
      }

      console.log(
        "found Packages",
        packageAuxes.map((p) => p.name)
      );

      if (!packageName || packageName === "seed-bible") {
        await unpack("seed-bible", seedBible);
      } else if (packageName === "all") {
        console.log("Saving All");
        await unpack("seed-bible", seedBible);
        for (const pkg of packageAuxes) {
          await unpack(pkg.name, pkg.aux);
        }
      } else {
        const pkg = packageAuxes.find((p) => p.name === packageName);
        if (pkg) {
          await unpack(pkg.name, pkg.aux);
        } else {
          console.log(`Package ${packageName} not found.`);
        }
      }

      server.displayPrompt();
    } finally {
      sim.dispose();
    }
  },
});

server.defineCommand("reload", {
  help: "Reload the page with changes from disk",
  action: async () => {
    if (page) {
      await page.close();
    }
    await startPage();
    server.displayPrompt();
  },
});

// server.defineCommand('load', {
//     help: 'Load a package',
//     action: async (name: string) => {
//         server.clearBufferedCommand();

//         console.log(`Adding ${name}...`);
//         const aux = await readPackage(name);
//         await addAux(page, aux);

//         await execScript(page, `
//             const packager = getBot('system', 'app.packager');
//             setTagMask(packager, 'installedPackages', [
//                 ...(packager.masks.installedPackages ?? []),
//                 ${JSON.stringify(name)}
//             ], 'local');
//         `);

//         server.displayPrompt();
//     }
// });

server.defineCommand("download", {
  help: "Run the .download chat command",
  action: async () => {
    server.clearBufferedCommand();

    await shout(page, "onChat", null, {
      message: ".download",
    });

    server.displayPrompt();
  },
});

server.defineCommand("chat", {
  help: "Send a chat message",
  action: async (message: string) => {
    server.clearBufferedCommand();

    await shout(page, "onChat", null, {
      message,
    });

    server.displayPrompt();
  },
});

Object.defineProperty(server.context, "run", {
  configurable: false,
  writable: false,
  enumerable: false,
  value: (script: string) => {
    server.clearBufferedCommand();
    const result = execScript(page, script);
    server.displayPrompt();
    return result;
  },
});

Object.defineProperty(server.context, "shout", {
  configurable: false,
  writable: false,
  enumerable: false,
  value: (name: string, arg: unknown) => {
    server.clearBufferedCommand();
    const result = shout(page, name, arg);
    server.displayPrompt();
    return result;
  },
});

server.on("exit", async () => {
  process.exit(0);
});
