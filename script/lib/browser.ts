import { readFile } from "node:fs/promises";
import { readPackage } from './package';
import { Page, ElementHandle, JSHandle } from "puppeteer";
import { v4 as uuid } from 'uuid';
import path from 'node:path';

/**
 * Runs required initialization code on the page.
 * @param page The page.
 */
export async function initPage(page: Page) {
    await page.evaluateOnNewDocument(() => (window.__name = (func) => func));
}

/**
 * Gets the app handle from the page.
 * @param page The page to get the app from.
 */
export async function getApp(page: Page) {
    return page.evaluateHandle(() => window.aux.getApp());
}

export async function getPrimarySim(page: Page) {
    return await page.evaluateHandle(() => {
        const app = window.aux.getApp();
        const sim = app.simulationManager.primary;
        return sim;
    }) as JSHandle<unknown>;
}

/**
 * Waits for CasualOS to finish loading the primay instance.
 * @param page The page to wait on.
 */
export async function waitForInstLoad(page: Page) {
    await page.evaluate(() => new Promise((resolve, reject) => {
        const app = window.aux.getApp();
        const manager = app.simulationManager;

        manager.simulationAdded.subscribe((sim) => {
            sim.connection.syncStateChanged.subscribe((connected) => {
                if (connected) {
                    resolve();
                }
            }, err => reject(err));
        }, err => reject(err));
    }));
}

/**
 * Sends a shout to the inst that is currently loaded in the page.
 * @param page The page.
 * @param name The name of the shout.
 * @param that The context for the shout.
 */
export async function shout(page: Page, name: string, botIds: string[] | null = null, that: unknown = null) {
    await page.evaluate((name, botIds, that) => {
        const app = window.aux.getApp();
        const sim = app.simulationManager.primary;
        sim.helper.shout(name, botIds, that);
    }, name, botIds, that);
}

/**
 * Runs the given script in the context of the inst that is currently loaded in the page.
 * @param page The page.
 * @param script The script to run.
 */
export async function execScript(page: Page, script: string) {
    const taskId = uuid();
    page.evaluate((script, taskId) => {
        const app = window.aux.getApp();
        const sim = app.simulationManager.primary;
        sim.helper.transaction({
            type: 'run_script',
            script,
            taskId,
        });
    }, script, taskId);
}

/**
 * Adds the given AUX data to the inst that is currently loaded in the page.
 * @param page The page.
 * @param data The AUX data.
 */
export async function addAux(page: Page, data: StoredAux) {
    let event: BotActions;
    if (data.version === 1) {
        event = {
            type: 'apply_state',
            state: data.state
        };
    } else {
        event = {
            type: 'remote',
            event: {
                type: 'apply_updates_to_inst',
                updates: data.updates
            }
        };
    }

    await page.evaluate(event => {
        const app = window.aux.getApp();
        const sim = app.simulationManager.primary;
        return sim.helper.transaction(event);
    }, event);
}

/**
 * Waits for the given package to have been loaded into the bots state.
 * @param page The page.
 * @param name The name of the package.
 */
export async function waitForPackage(page: Page, name: string) {
    await page.evaluate((name) => {
        const app = window.aux.getApp();
        const sim = app.simulationManager.primary;
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                const bots = Object.values(sim.helper.botsState);
                for (const b of bots) {
                    if (b.values.forPackage === name) {
                        clearInterval(intervalId);
                        resolve(true);
                        return;
                    }
                }
            }, 100);
        });
    }, name);
}

/**
 * Registers the given package as installed into the packager.
 * @param page The page.
 * @param name The name of the package.
 */
export async function registerPackage(page: Page, name: string) {
    const extensionFilePath = path.resolve('packages', name, 'extension.json');
    const extensionData = JSON.parse(await readFile(extensionFilePath, 'utf-8'));

    await execScript(page, `
        const packager = getBot('system', 'app.packager');
        setTagMask(packager, '${name}-data', ${JSON.stringify(extensionData)}, 'local');
    `);

    // await page.evaluate(async (data) => {
    //     const app = window.aux.getApp();
    //     const sim = app.simulationManager.primary;
    //     console.log(sim.helper.botsState);

    //     console.log(Object.values(sim.helper.botsState).find(b => b.tags.system === 'app.packager'));

    //     const packager = await new Promise((resolve, reject) => {
    //         let count = 0;
    //         const interval = setInterval(() => {
    //             count++;
    //             if (count > 1000) {
    //                 clearInterval(interval);
    //                 reject(new Error('Packager app not found in bots state.'));
    //                 return;
    //             }
    //             bots = Object.values(sim.helper.botsState);
    //             const packager = bots.find(b => b.tags.system === 'app.packager');
    //             if (packager) {
    //                 clearInterval(interval);
    //                 resolve(packager);
    //                 return;
    //             }
    //         }, 100);
    //     });
    //     if (!packager) {
    //         throw new Error('Packager app not found in bots state.');
    //     }
    //     console.error('UPDATE BOT', data.name, packager.id, data);
    //     return sim.helper.updateBot(packager.id, {
    //         masks: {
    //             tempLocal: {
    //                 [`${data.name}-data`]: 'abc'
    //             }
    //         }
    //     });
    // }, extensionData);
}

/**
 * Gets the saved data for the package.
 * @param page The page.
 * @param name The name of the package.
 */
export async function getPackageData(page: Page, name: string) {
    return await page.evaluate((name) => {
        const app = window.aux.getApp();
        const sim = app.simulationManager.primary;

        const bots = Object.values(sim.helper.botsState);
        const packager = bots.find(b => b.tags.system === 'app.packager');
        if (!packager) {
            throw new Error('Packager app not found in bots state.');
        }
        return packager.values[`${name}-data`];
    }, name);
}

/**
 * Uploads a file to the page.
 * @param page The page.
 * @param filePath The path to the file.
 */
export async function uploadFile(page: Page, filePath: string) {
    // Implementation for uploading a file will go here
    const fileInputIdentifier = 'cee34a105946cea5dda0aaae30d7da';

    await page.evaluate((fileInputIdentifier: string) => {
        document.body.appendChild(Object.assign(
            document.createElement('input'),
            {
                id: fileInputIdentifier,
                type: 'file',
                onchange: (e) => {
                    document.querySelector('body').dispatchEvent(
                        Object.assign(
                            new Event('drop'),
                            { dataTransfer: (e.target as HTMLInputElement).files }
                        )
                    )
                }
            }
        ));
    }, fileInputIdentifier);

    const fileInput = await page.$(`#${fileInputIdentifier}`) as ElementHandle<HTMLInputElement>;
    await fileInput.uploadFile(filePath);
    fileInput.dispose();
}

export async function loadInst(page: Page, inst: string, collaborative: boolean = false) {
    await page.goto(`https://ao.bot?gridPortal=home&${collaborative ? 'inst' : 'staticInst'}=${inst}`);
    console.log('Waiting for ao.bot to load...');
    await waitForInstLoad(page);
}

export async function loadSeedBible(page: Page) {
    await initPage(page);
    
    const inst = uuid();

    await loadInst(page, inst);

    console.log('Uploading Seed Bible...');

    await addAux(page, await readPackage('seed-bible'));
    await addAux(page, await readPackage('BookSelector'));
    await addAux(page, await readPackage('Bible Layout 2D'));
    await addAux(page, await readPackage('Painter'));
    await addAux(page, await readPackage('Playlist'));
    await registerPackage(page, 'BookSelector');
    await registerPackage(page, 'Bible Layout 2D');
    await registerPackage(page, 'Painter');
    await registerPackage(page, 'Playlist');

    await waitForPackage(page, 'Playlist');

    await execScript(page, `
        const packager = getBot('system', 'app.packager');
        setTagMask(packager, 'installedPackages', [
            'BookSelector',
            'Bible Layout 2D',
            'Painter',
            'Playlist',
        ], 'local');
    `);

    console.log('Loaded!');

    shout(page, 'onInstJoined', null, { inst });
}