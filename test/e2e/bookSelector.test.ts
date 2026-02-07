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

describe("bookSelector tests", () => {
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
  const bookNames: string[] = [
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Songs",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
  ];

  const OTBooks: string[] = bookNames.slice(0, 39);
  const NTBooks: string[] = bookNames.slice(39);

  test("check populated books", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    const bookItems = await page.$$(".sidebar-itm");
    for (let i = 0; i < bookItems.length; i++) {
      const item = bookItems[i];
      const bookName = await item.$eval("span", (el) => el.textContent);
      expect(bookName.trim()).toBe(bookNames[i]);
    }
    expect(bookItems.length).toBe(bookNames.length);
  });

  test("check OT/NT filter", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(200);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await delay(500);
    await page.locator(".dropdown-select").click();
    await delay(400);
    await page.select(".dropdown-select", "0");
    await delay(400);
    const bookItemsOT = await page.$$(".sidebar-itm");
    for (let i = 0; i < bookItemsOT.length; i++) {
      const item = bookItemsOT[i];
      if (item) {
        const bookName = await item.$eval("span", (el) => el.textContent);
        expect(bookName.trim()).toBe(OTBooks[i]);
      } else {
        throw new Error("Book item not found");
      }
    }
    expect(bookItemsOT.length).toBe(OTBooks.length);
    await page.locator(".dropdown-select").click();
    await delay(400);
    await page.select(".dropdown-select", "1");
    await delay(400);
    const bookItemsNT = await page.$$(".sidebar-itm");
    for (let i = 0; i < bookItemsNT.length; i++) {
      const item = bookItemsNT[i];
      if (item) {
        const bookName = await item.$eval("span", (el) => el.textContent);
        expect(bookName.trim()).toBe(NTBooks[i]);
      } else {
        throw new Error("Book item not found");
      }
    }
    expect(bookItemsNT.length).toBe(NTBooks.length);
  });

  test("load custom translation", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator(".sidebar-translation-selector").click();
    await page.waitForSelector(".footer");
    await page.locator(".footer").click();
    await delay(200);
    await page.click('input[type="radio"][value="url"]');
    const customUrl =
      "https://ao-bible-api-public-uploads.s3.amazonaws.com/b792638ce8c1e09877b63951500d2dfe70cc1333305723e4a9d808dc757771cc/api/available_translations.json";
    await page.locator(".custom-tr-in").fill(customUrl);
    await delay(200);
    await page.locator(".import-btn").click();
    await delay(4000);
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 1");

    const v1 = await seedBibleFrame.locator("#v-1").waitHandle();
    const v1Text = await v1?.evaluate((el) => el.textContent);
    expect(mergeWhitespace(v1Text)).toMatch(/Translation load via url test./);
  });

  test("sort by popular translations", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator(".sidebar-translation-selector").click();

    await page.locator(".settingsIcon").click();
    await delay(400);

    await page.locator(".translationSettingsModal > div:nth-child(3)").click();

    await delay(1500);

    const translationItems = await page.$$(".language-list .item");

    const popularTranslations = [
      "english",
      "ancient greek",
      "arabic",
      "hebrew",
      "hindi",
      "spanish",
    ];

    for (let i = 0; i < translationItems.length; i++) {
      const item = translationItems[i];
      if (!item) {
        throw new Error("Translation item not found");
      }
      const translationName = await item.$eval("span", (el) => el.textContent);
      expect(translationName?.toLowerCase()).toBe(popularTranslations[i]);
    }

    expect(translationItems.length).toBe(popularTranslations.length);
  });
});
