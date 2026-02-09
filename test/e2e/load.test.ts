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
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe(
      "Genesis 1  / BSB"
    );
  });

  test("should add the book ID and chapter number to the URL", async () => {
    await loadSeedBible(page);
    seedBibleFrame = getSeedBibleFrame(page);

    // Wait for the book title to ensure the content has loaded
    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe(
      "Genesis 1  / BSB"
    );

    await delay(1000); // Wait a moment to ensure URL is updated

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
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe(
      "Matthew 5  / KJAV"
    );
  });

  test("load translationId", async () => {
    await loadSeedBible(page, undefined, undefined, undefined, {
      translationId: "eng_kjv",
    });
    seedBibleFrame = getSeedBibleFrame(page);

    const bookTitle = await seedBibleFrame
      .locator("div.bookTitle")
      .waitHandle();
    expect(await bookTitle?.evaluate((el) => el.textContent)).toBe(
      "Genesis 1  / KJAV"
    );

    const v28 = await seedBibleFrame.locator("#v-28").waitHandle();
    const v28Text = await v28?.evaluate((el) => el.textContent);

    expect(mergeWhitespace(v28Text)).toMatch(
      /And God blessed them, and God said unto them/
    );
  });
});
