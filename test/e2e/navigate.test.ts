import puppeteer, { Browser, Page, Frame } from "puppeteer";
import { loadSeedBible } from "../../script/lib/browser";
import { delay, getSeedBibleFrame } from "./utils";

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

describe("navigate", () => {
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

  test("next chapter", async () => {
    await seedBibleFrame.waitForSelector(
      "div.toolbar-item-wrapper.rightClick > button",
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator("div.toolbar-item-wrapper.rightClick > button")
      .click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1500);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 2");
  });

  test("previous chapter", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator("div.sidebar-itm:nth-child(23)").click();
    await page.locator("button.chapter-btn:nth-child(53)").click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Isaiah 53");

    await seedBibleFrame
      .locator("div.toolbar-item-wrapper.leftClick > button")
      .click();
    await delay(1000);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Isaiah 52");
  });

  // Should work but doesn't because of the login screens
  test("change chapter", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator("div.sidebar-itm:nth-child(23)").click();
    await page.locator("button.chapter-btn:nth-child(53)").click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Isaiah 53");
  });

  test("search book", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator(".searchbar > input").fill("Hos");
    await page.locator("button.chapter-btn:nth-child(3)").click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Hosea 3");
  });

  test("change translation", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator(".sidebar-translation-selector").click();
    await page.waitForSelector(".language-list");
    await page.locator(".language-list > div:nth-child(1)").click();
    await delay(100);
    await page.locator(".language-list > div:nth-child(2)").click();
    await delay(100);
    await page.locator(".translation-option:nth-child(1)").click();

    await delay(1000);

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe(
      "1 Mose (Gyenesis) 1"
    );
  });

  test("check bible nav enter", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});
    await page.locator(".searchbar > input").fill("Rev 3");
    await page.keyboard.press("Enter");
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(2000);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe(
      "Revelation 3"
    );
  });

  test("back button should go to the previous chapter", async () => {
    await seedBibleFrame.waitForSelector(
      "div.toolbar-item-wrapper.rightClick > button",
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator("div.toolbar-item-wrapper.rightClick > button")
      .click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1500);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 2");

    await page.goBack();

    await delay(1000);

    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 1");
  });

  test("forward button should go to the next chapter after going back", async () => {
    await seedBibleFrame.waitForSelector(
      "div.toolbar-item-wrapper.rightClick > button",
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator("div.toolbar-item-wrapper.rightClick > button")
      .click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1500);
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 2");

    await page.goBack();
    await page.goForward();

    await delay(1000);

    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 2");
  });

  test("back button should close the book selector", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});

    await delay(1000);
    await page.goBack();
    await delay(1000);

    const sideBar = await page.locator(".html-container div.sidebar").wait();
    expect(sideBar.classList.contains("close-sideBar")).toBe(true);
  });
});
