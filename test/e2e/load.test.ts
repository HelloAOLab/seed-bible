import puppeteer, { Browser, Page, Frame } from 'puppeteer';
import { packageSingle, readPackage } from '../../script/lib/package';
import { initPage, loadInst, addAux, shout } from '../../script/lib/browser';
import { afterEach } from 'node:test';

let browser: Browser;
let page: Page;
let seedBibleFrame: Frame;
const inst = 'myTestInst';

console.log = jest.fn();

beforeAll(async () => {
    await packageSingle('seed-bible', 'ignore');

    browser = await puppeteer.launch({
        args: ['--no-sandbox']
    });
});

afterAll(async () => {
    await browser?.close();
});

beforeEach(async () => {
    page = await browser.newPage();
    await initPage(page);
    await loadInst(page, inst);
    await addAux(page, await readPackage('seed-bible'));
    shout(page, 'onEggHatch').catch(() => {});
    seedBibleFrame = page.frames().find(f => f.url().includes('secure-ao-content.org'));
});

afterEach(async () => {
    await page?.close();
});

test('load seed bible into Genesis 1', async () => {
    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Genesis 1');
});

// Should work but doesn't because of the login screens
test.skip('change chapter', async () => {
    await seedBibleFrame.locator('div.toolbar-item-wraper[title="Books"] > button').click();
    await seedBibleFrame.locator('div.sidebar-itm:-p-text("Isaiah")').click();
    await seedBibleFrame.locator('button.chapter-btn:-p-text("53")').click();

    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Isaiah 53');
});