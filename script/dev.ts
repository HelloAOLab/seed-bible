import puppeteer from 'puppeteer';
import { packageSingle, readPackage } from './lib/package.js';
import { initPage, loadAOBot as loadInst, addAux, shout } from './lib/browser.js';

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

console.log('Loaded!');

await shout(page, 'onEggHatch');

process.on('exit', async () => {
    await browser.close();
});