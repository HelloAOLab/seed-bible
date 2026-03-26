import puppeteer, { Browser, Page, Frame } from "puppeteer";
import { loadSeedBible } from "../../script/lib/browser";
import { delay, getSeedBibleFrame, mergeWhitespace } from "./utils";

let browser: Browser;

console.log = jest.fn();

beforeAll(async () => {
  browser = await puppeteer.launch({
    args: ["--no-sandbox"],
  });
});

afterAll(async () => {
  await browser?.close();
});

const emptyCodexTranslation =
  "https://ao-bible-api-public-uploads.s3.amazonaws.com/72ff68c20b99e1dee57e184c6b32947cfc1e2e00783f29ecf46efe234f682aeb/api/available_translations.json";

const codexTranslation1 =
  "https://ao-bible-api-public-uploads.s3.amazonaws.com/2a6897969c091ed6eafa7a7d20186551b4fea3334c74579041ca0be42494bb82/api/available_translations.json";

const codexTranslation2 =
  "https://ao-bible-api-public-uploads.s3.amazonaws.com/2fd9380495a529debac8e98ed9d2d2ef33358311ba7da3e5fcb67df1f8a51b18/api/available_translations.json";

describe("codex tests", () => {
  let page: Page;
  let seedBibleFrame: Frame;
  beforeEach(async () => {
    page = await browser.newPage();
    await loadSeedBible(page);
    seedBibleFrame = getSeedBibleFrame(page);
  });
  afterEach(async () => {
    await page?.close();
  });

  test("check empty translation", async () => {
    await loadSeedBible(page, undefined, undefined, undefined, {
      translation: emptyCodexTranslation,
    });
    seedBibleFrame = getSeedBibleFrame(page);
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 1 / AAB");
  });

  test("check loaded translation", async () => {
    await loadSeedBible(page, undefined, undefined, undefined, {
      translation: codexTranslation1,
    });
    seedBibleFrame = getSeedBibleFrame(page);
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 1 / su1");

    const v1 = await seedBibleFrame.locator("#v-1").waitHandle();
    const v1Text = await v1?.evaluate((el) => el.textContent);
    expect(mergeWhitespace(v1Text)).toMatch(
      /Translation load test via param 1./
    );
  });

  test("check codex translation immutability with multiple translations", async () => {
    await loadSeedBible(page, undefined, undefined, undefined, {
      translation: codexTranslation1,
    });
    seedBibleFrame = getSeedBibleFrame(page);
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 1 / su1");

    const v1 = await seedBibleFrame.locator("#v-1").waitHandle();
    const v1Text = await v1?.evaluate((el) => el.textContent);
    expect(mergeWhitespace(v1Text)).toMatch(
      /Translation load test via param 1./
    );
    const url = new URL(page.url());
    const inst = url.searchParams.get("staticInst");
    await delay(3000);
    await loadSeedBible(page, undefined, inst, undefined, {
      translation: codexTranslation2,
    });
    seedBibleFrame = getSeedBibleFrame(page);

    const url2 = new URL(page.url());
    const inst2 = url2.searchParams.get("staticInst");

    expect(inst).toBe(inst2);

    const bookTitle2 = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(
      mergeWhitespace(await bookTitle2?.evaluate((el) => el.textContent))
    ).toBe("Genesis 1 / su2");
    const v1_2 = await seedBibleFrame.locator("#v-1").waitHandle();
    const v1Text2 = await v1_2?.evaluate((el) => el.textContent);
    expect(mergeWhitespace(v1Text2)).toMatch(
      /Translation load test via param 2./
    );

    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator(".sidebar-translation-selector").click();

    await page.waitForSelector("#translation-search-input");

    await page.type("#translation-search-input", "su1");

    await delay(150);

    await page.locator(".translation-option").click();

    await delay(2000);

    const bookTitle3 = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(
      mergeWhitespace(await bookTitle3?.evaluate((el) => el.textContent))
    ).toBe("Genesis 1 / su1");

    const v1_3 = await seedBibleFrame.locator("#v-1").waitHandle();
    const v1Text3 = await v1_3?.evaluate((el) => el.textContent);
    expect(mergeWhitespace(v1Text3)).toMatch(
      /Translation load test via param 1./
    );
  });
});
