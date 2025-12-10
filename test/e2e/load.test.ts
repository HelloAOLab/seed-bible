import puppeteer, { Browser, Page, Frame } from "puppeteer";
import { packageAll } from "../../script/lib/package";
import {
  initPage,
  loadInst,
  addAux,
  shout,
  loadSeedBible,
} from "../../script/lib/browser";

let browser: Browser;

console.log = jest.fn();

beforeAll(async () => {
  await packageAll("ignore");

  browser = await puppeteer.launch({
    args: ["--no-sandbox"],
  });
});

afterAll(async () => {
  await browser?.close();
});

function getSeedBibleFrame(page: Page): Frame {
  console.log("page", page);
  return page.frames().find((f) => f.url().includes("secure-ao-content.org"));
}

describe("load", () => {
  let page: Page;
  let seedBibleFrame: Frame;
  beforeEach(async () => {
    console.log("new page");
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page?.close();
  });

  test("load seed bible into Genesis 1", async () => {
    await loadSeedBible(page);
    seedBibleFrame = getSeedBibleFrame(page);

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 1");
  });

  test("should add the book ID and chapter number to the URL", async () => {
    await loadSeedBible(page);
    seedBibleFrame = getSeedBibleFrame(page);

    // Wait for the book title to ensure the content has loaded
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 1");

    const url = new URL(page.url());

    expect(url.searchParams.get("book")).toBe("GEN");
    expect(url.searchParams.get("chapter")).toBe("1");
  });

  test("load translation book and chapter", async () => {
    await loadSeedBible(page, undefined, undefined, undefined, {
      translation: "eng_kjv",
      book: "MAT",
      chapter: "5",
    });
    seedBibleFrame = getSeedBibleFrame(page);

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Matthew 5");
  });

  test("load translationId", async () => {
    await loadSeedBible(page, undefined, undefined, undefined, {
      translationId: "eng_kjv",
    });
    seedBibleFrame = getSeedBibleFrame(page);

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe("Genesis 1");

    const v28 = await seedBibleFrame.locator("#v-28").waitHandle();
    expect(await v28?.evaluate((el) => el.textContent)).toMatch(
      /And God blessed them, and God said unto them/
    );
  });
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
});

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
