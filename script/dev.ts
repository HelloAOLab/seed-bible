import puppeteer from 'puppeteer';
import { listPackages, packageSingle, readPackage } from './lib/package.js';
import { initPage, loadAOBot as loadInst, addAux, shout, getPrimarySim, execScript } from './lib/browser.js';
import { writeFile } from 'node:fs/promises';
import repl from 'node:repl';

await packageSingle('seed-bible', 'ignore');

const browser = await puppeteer.launch({
    headless: false
});
const page = await browser.newPage();

await initPage(page);
await page.setViewport({ width: 1280, height: 800 });

const inst = 'myDevInst';

await loadInst(page, inst);

console.log('Uploading Seed Bible...');

await addAux(page, await readPackage('seed-bible'));

let packages: string[];
if (process.argv.some(pkg => pkg === 'all')) {
    packages = await listPackages();
} else {
    packages = process.argv.slice(2);
}

for (const pkg of packages) {
    if (pkg === 'seed-bible') {
        continue;
    }
    console.log(`Adding ${pkg}...`);
    const aux = await readPackage(pkg);
    await addAux(page, aux);
}

console.log('Loaded!');

// await execScript(page, `
//     const packager = getBot('system', 'app.packager');
//     packager.masks.mainPackages = [];
// `);

await shout(page, 'onEggHatch');

process.on('exit', async () => {
    if (browser.connected) {
        await browser.close();
    }
});

browser.on('disconnected', () => {
    process.exit(0);
});

const server = repl.start('> ');

server.context.page = page;
server.context.browser = browser;
server.context.addAux = addAux;
server.context.shout = shout;
server.context.loadInst = loadInst;
server.context.readPackage = readPackage;
server.context.listPackages = listPackages;

server.defineCommand('system', {
    help: 'Open the system portal',
    action: async (name) => {
        server.clearBufferedCommand();

        const sim = await getPrimarySim(page);
        try {
            await sim.evaluate(async (s, name) => {
                await s.helper.updateBot(s.helper.userBot, {
                    tags: {
                        systemPortal: name || true
                    }
                });
            }, name);

            server.displayPrompt();
        } finally{
            sim.dispose();
        }
    }
});

server.defineCommand('save', {
    help: 'Save the current inst to a local .aux file',
    action: async () => {
        server.clearBufferedCommand();

        const sim = await getPrimarySim(page);
        try {
            const state = await sim.evaluate(s => {
                const state = {};
                for (const id in s.helper.botsState) {
                    const bot = state[id] = {...s.helper.botsState[id]};
                    if (bot.precalculated) {
                        delete bot.precalculated;
                        delete bot.values;
                    }
                }

                return state;
            });

            const aux = {
                version: 1,
                state
            };

            const filename = `saved-${Date.now()}.aux`;
            await writeFile(filename, JSON.stringify(aux, null, 2), 'utf-8');
            console.log(`Wrote: ${filename}`);
            server.displayPrompt();
        } finally {
            sim.dispose();
        }
    }
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

server.defineCommand('download', {
    help: 'Run the .download chat command',
    action: async () => {
        server.clearBufferedCommand();

        await shout(page, 'onChat', null, {
            message: '.download'
        });

        server.displayPrompt();
    }
});

server.defineCommand('chat', {
    help: 'Send a chat message',
    action: async (message: string) => {
        server.clearBufferedCommand();

        await shout(page, 'onChat', null, {
            message
        });

        server.displayPrompt();
    },
})

Object.defineProperty(server.context, 'run', {
    configurable: false,
    writable: false,
    enumerable: false,
    value: (script: string) => {
        server.clearBufferedCommand();
        const result = execScript(page, script);
        server.displayPrompt();
        return result;
    }
});

Object.defineProperty(server.context, 'shout', {
    configurable: false,
    writable: false,
    enumerable: false,
    value: (name: string, arg: unknown) => {
        server.clearBufferedCommand();
        const result = shout(page, name, arg);
        server.displayPrompt();
        return result;
    }
});

server.on('exit', async () => {
    process.exit(0);
});