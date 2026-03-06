import puppeteer from "puppeteer";
import {
  cleanupAux,
  listPackages,
  packageSingle,
  readPackage,
} from "./lib/package.js";
import {
  loadInst,
  addAux,
  shout,
  getPrimarySim,
  execScript,
  getPackageData,
  loadSeedBible,
  DEFAULT_EXTENSIONS,
  loadAoBot,
  initPage,
  loadSeedBibleRefresh,
  DEFAULT_REFRESH_EXTENSIONS,
} from "./lib/browser.js";
import { rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import repl from "node:repl";
import { KnownFlags, procHasFlag } from "./argumentUtil.js";
import type { Page } from "puppeteer";
import type {
  BotsState,
  StoredAux,
  StoredAuxVersion1,
} from "@casual-simulation/aux-common";
import prompts from "prompts";

const extraExtensions = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const defaultCollaborative = procHasFlag(KnownFlags.Collaborative);
const aoBot = procHasFlag(KnownFlags.AoBot);
const startWithDevtools = procHasFlag(KnownFlags.DevTools);

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  devtools: startWithDevtools,
});

let lastInst: string;

async function loadPage(
  page: Page | null | undefined,
  inst?: string,
  collaborative = defaultCollaborative
) {
  if (!page) {
    page = await browser.newPage();
  }

  if (aoBot) {
    await Promise.all(["ao.bot"].map((pkg) => packageSingle(pkg, "ignore")));
    await loadAoBot(page, inst);
  } else {
    await uploadPackagesToPage(page, inst, collaborative);
  }
}

async function uploadPackagesToPage(
  page: Page,
  inst?: string,
  collaborative = defaultCollaborative
) {
  const allPackages = [
    ...new Set([...DEFAULT_REFRESH_EXTENSIONS, ...extraExtensions]),
  ];

  await Promise.all(allPackages.map((pkg) => packageSingle(pkg, "ignore")));
  lastInst = await loadSeedBibleRefresh(
    page,
    extraExtensions,
    inst,
    collaborative
  );

  const newTabPromises: Promise<void>[] = [];

  await Promise.all(newTabPromises);
}

const initialPages = await browser.pages();
const firstPage = initialPages[0];
await loadPage(firstPage);

process.on("exit", async () => {
  if (browser.connected) {
    await browser.close();
  }
});

process.on("SIGINT", () => {
  process.exit(0);
});

browser.on("disconnected", () => {
  process.exit(0);
});

const server = repl.start("> ");

server.context.page = null;
server.context.browser = browser;
server.context.addAux = addAux;
server.context.shout = shout;
server.context.loadInst = loadInst;
server.context.readPackage = readPackage;
server.context.listPackages = listPackages;

async function selectPage(): Promise<Page> {
  const pages = await browser.pages();

  if (pages.length === 1) {
    return pages[0]!;
  }

  const response = await prompts({
    type: "select",
    name: "page",
    message: "Select a page:",
    choices: pages.map((p, i) => ({
      title: `Page ${i + 1} - ${p.url()}`,
      value: p,
    })),
  });

  return response.page;
}

server.defineCommand("system", {
  help: "Open the system portal",
  action: async (name) => {
    server.clearBufferedCommand();

    const page = await selectPage();
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

server.defineCommand("newTab", {
  help: "Open a new tab",
  action: async (inst: string | undefined | null) => {
    if (!inst) {
      inst = await new Promise<string | undefined>((resolve) => {
        server.question(
          `Instance ID (leave blank for last used): `,
          (answer) => {
            resolve(answer || undefined);
          }
        );
      });
    }

    if (!inst) {
      inst = lastInst!;
    }

    const isCollaborative = await new Promise<boolean>((resolve) => {
      server.question(
        `Load in collaborative mode? (y/n, default n): `,
        (answer) => {
          resolve(answer.toLowerCase().startsWith("y"));
        }
      );
    });

    const uploadPackages = await new Promise<boolean>((resolve) => {
      server.question(
        `Upload packages to the new tab? (y/n, default y): `,
        (answer) => {
          resolve(answer.toLowerCase().startsWith("n") ? false : true);
        }
      );
    });

    // server.
    const newPage = await browser.newPage();
    if (uploadPackages) {
      await uploadPackagesToPage(newPage, inst, isCollaborative);
    } else {
      await initPage(newPage);
      await loadInst(newPage, inst, isCollaborative);
    }
  },
});

server.defineCommand("save", {
  help: "Save the current state back to the repository",
  action: async (packageName: string) => {
    const page = await selectPage();
    const sim = await getPrimarySim(page);
    try {
      const state = cleanupAux(
        await sim.evaluate((s) => {
          const state: BotsState = {};
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
        await rmdir(packagePath, { recursive: true });
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

      const seedBible: StoredAuxVersion1 = {
        version: 1,
        state: {},
      };

      const packageAuxes: { name: string; aux: StoredAuxVersion1 }[] = [];

      for (const id in state) {
        const bot = state[id];
        if (!bot) {
          continue;
        }
        const system = bot.tags.system ? bot.tags.system.toLowerCase() : null;
        const packageName = bot.tags.packageName
          ? bot.tags.packageName.toLowerCase()
          : null;
        let hasPackage = false;
        for (const pkg of packages) {
          const pkgLower = pkg.toLowerCase();
          let found = false;
          if (packageName && packageName === pkgLower) {
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

        if (!hasPackage && (!packageName || packageName === "seed-bible")) {
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
    const page = await selectPage();
    await loadPage(page);
  },
});

server.defineCommand("upload", {
  help: "Upload all the packages to the current tab",
  action: async () => {
    const page = await selectPage();

    // find visible page
    console.log("target: ", page.url());
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

    const page = await selectPage();
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
    const page = await selectPage();
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
  value: (page: Page, script: string) => {
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
  value: (page: Page, name: string, arg: unknown) => {
    server.clearBufferedCommand();
    const result = shout(page, name, undefined, arg);
    server.displayPrompt();
    return result;
  },
});

server.on("exit", async () => {
  process.exit(0);
});
