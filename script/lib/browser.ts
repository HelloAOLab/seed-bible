import { Page, ElementHandle, JSHandle } from "puppeteer";
import { v4 as uuid } from 'uuid';

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
        return sim.helper.shout(name, botIds, that);
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

export async function loadAOBot(page: Page, inst: string, collaborative: boolean = false) {
    await page.goto(`https://ao.bot?gridPortal=home&${collaborative ? 'inst' : 'staticInst'}=${inst}`);
    console.log('Waiting for ao.bot to load...');
    await waitForInstLoad(page);
}