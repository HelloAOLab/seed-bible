import puppeteer from 'puppeteer';
import { packageSingle } from './lib/package.js';
import path from 'path';
import { initPage, loadAOBot as loadInst, addAux, shout } from './lib/browser.js';
import { readFile } from 'fs/promises';

await packageSingle('seed-bible', 'ignore');

const browser = await puppeteer.launch({
    headless: false
});
const page = await browser.newPage();

await initPage(page);
await page.setViewport({ width: 1280, height: 800 });

const seedBibleAux = path.resolve('dist', 'seed-bible.aux');
const storedAuxData = await readFile(seedBibleAux, 'utf-8')
const storedAux = JSON.parse(storedAuxData);

const inst = 'myDevInst';

await loadInst(page, inst);

console.log('Uploading Seed Bible...');

await addAux(page, storedAux);

console.log('Loaded!');

await shout(page, 'onEggHatch');

process.on('exit', async () => {
    await browser.close();
});