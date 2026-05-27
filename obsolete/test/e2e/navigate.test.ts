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
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 2 / AAB");
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
    await seedBibleFrame.locator("div.sidebar-itm:nth-child(23)").click();
    await seedBibleFrame.locator("button.chapter-btn:nth-child(53)").click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Isaiah 53 / AAB");

    await seedBibleFrame
      .locator("div.toolbar-item-wrapper.leftClick > button")
      .click();
    await delay(1000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Isaiah 52 / AAB");
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
    await seedBibleFrame.locator("div.sidebar-itm:nth-child(23)").click();
    await seedBibleFrame.locator("button.chapter-btn:nth-child(53)").click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Isaiah 53 / AAB");
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
    await seedBibleFrame.locator(".searchbar > input").fill("Hos");
    await seedBibleFrame.locator("button.chapter-btn:nth-child(3)").click();

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Hosea 3 / AAB");
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
    await seedBibleFrame.locator(".sidebar-translation-selector").click();
    await seedBibleFrame.waitForSelector(".language-list");
    await seedBibleFrame.locator(".language-list > div:nth-child(1)").click();
    await delay(100);
    await seedBibleFrame.locator(".language-list > div:nth-child(2)").click();
    await delay(100);
    await seedBibleFrame.locator(".translation-option:nth-child(1)").click();

    await delay(1000);

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(1000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("1 Mose (Gyenesis) 1 / AKA");
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
    await seedBibleFrame.locator(".searchbar > input").fill("Rev 3");
    await page.keyboard.press("Enter");
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    await delay(2000);
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Revelation 3 / AAB");
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
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 2 / AAB");

    await page.goBack();

    await delay(1000);

    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 1 / AAB");
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
    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 2 / AAB");

    await page.goBack();
    await delay(500);
    await page.goForward();

    await delay(1000);

    expect(
      mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    ).toBe("Genesis 2 / AAB");
  });

  test("the book selector should push a history state when opened", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);

    const originalHistoryLength = await seedBibleFrame.evaluate(
      () => window.history.length
    );

    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});

    await delay(1000);

    const historyLength = await seedBibleFrame.evaluate(
      () => window.history.length
    );
    expect(historyLength - originalHistoryLength).toBe(1); // One new history state should be added
  });

  test("the book selector should be able to be closed when navigating back", async () => {
    await seedBibleFrame.waitForSelector(
      'div.toolbar-item-wrapper[title="Books"] > button',
      { visible: true }
    );
    await delay(1000);
    await seedBibleFrame
      .locator('div.toolbar-item-wrapper[title="Books"] > button')
      .click({});

    await delay(1000);

    await seedBibleFrame.evaluate(() => window.history.back());

    await delay(1000);

    const isSidebarVisible = await page.evaluate(() => {
      const sidebar = document.querySelector(".html-container div.sidebar");
      return sidebar
        ? getComputedStyle(sidebar).visibility !== "hidden"
        : false;
    });

    expect(isSidebarVisible).toBe(false);
  });
});
