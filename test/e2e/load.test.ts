import puppeteer, { Browser, Page, Frame } from 'puppeteer';
import { packageAll } from '../../script/lib/package';
import { initPage, loadInst, addAux, shout, loadSeedBible } from '../../script/lib/browser';
import { afterEach } from 'node:test';

let browser: Browser;
let page: Page;
let seedBibleFrame: Frame;

console.log = jest.fn();

beforeAll(async () => {
    await packageAll('ignore');

    browser = await puppeteer.launch({
        args: ['--no-sandbox'],
    });
});

afterAll(async () => {
    await browser?.close();
});

beforeEach(async () => {
    page = await browser.newPage();
    await loadSeedBible(page);
    seedBibleFrame = page.frames().find(f => f.url().includes('secure-ao-content.org'));
});

afterEach(async () => {
    await page?.close();
});

test('load seed bible into Genesis 1', async () => {
    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Genesis 1');
});

test('next chapter', async () => {
    await seedBibleFrame.waitForSelector('div.toolbar-item-wrapper.rightClick > button', { visible: true });
    await delay(1000);
    await seedBibleFrame.locator('div.toolbar-item-wrapper.rightClick > button').click();
    //     .click({});
    // await page.locator('div.sidebar-itm:nth-child(23)').click();
    // await page.locator('button.chapter-btn:nth-child(53)').click();

    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Genesis 2');
});

test('previous chapter', async () => {
    await seedBibleFrame.waitForSelector('div.toolbar-item-wrapper[title="Books"] > button', { visible: true });
    await delay(1000);
    await seedBibleFrame.locator('div.toolbar-item-wrapper[title="Books"] > button')
        .click({});
    await page.locator('div.sidebar-itm:nth-child(23)').click();
    await page.locator('button.chapter-btn:nth-child(53)').click();

    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Isaiah 53');

    await seedBibleFrame.locator('div.toolbar-item-wrapper.leftClick > button').click();
    await delay(1000);
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Isaiah 52');
});

// Should work but doesn't because of the login screens
test('change chapter', async () => {
    await seedBibleFrame.waitForSelector('div.toolbar-item-wrapper[title="Books"] > button', { visible: true });
    await delay(1000);
    await seedBibleFrame.locator('div.toolbar-item-wrapper[title="Books"] > button')
        .click({});
    await page.locator('div.sidebar-itm:nth-child(23)').click();
    await page.locator('button.chapter-btn:nth-child(53)').click();

    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Isaiah 53');
});

test('search book', async () => {
    await seedBibleFrame.waitForSelector('div.toolbar-item-wrapper[title="Books"] > button', { visible: true });
    await delay(1000);
    await seedBibleFrame.locator('div.toolbar-item-wrapper[title="Books"] > button')
        .click({});
    await page.locator('.searchbar > input').fill('Hos');
    await page.locator('button.chapter-btn:nth-child(3)').click();

    const bookTitle = await seedBibleFrame.locator('div.bookTitle').waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate(el => el.textContent)).toBe('Hosea 3');
});

function delay(time) {
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
}