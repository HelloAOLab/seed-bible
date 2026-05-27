import puppeteer, { Browser, Page } from "puppeteer";
// import { packageAll } from "../../script/lib/package";
import { loadSeedBible } from "../../script/lib/browser";
// import { minifyAll } from "../../script/lib/minify";
import { delay, getSeedBibleFrame, mergeWhitespace } from "./utils";
import { merge } from "@casual-simulation/aux-common";

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

describe("collaborative", () => {
  let page1: Page;
  let page2: Page;
  let browser2: Browser;
  beforeEach(async () => {
    console.log("new page");
    browser2 = await puppeteer.launch({
      args: ["--no-sandbox"],
    });
    page1 = await browser.newPage();
    page2 = await browser2.newPage();
    await page1.setViewport({ width: 1080, height: 1024 });
    await page2.setViewport({ width: 1080, height: 1024 });
  });

  afterEach(async () => {
    await page1?.close();
    await page2?.close();
    await browser2?.close();
  });

  test("test session next chapter", async () => {
    const uuid = Math.random().toString(36).substring(2, 15);

    await loadSeedBible(page1, undefined, uuid, true);
    // await delay(5000);
    // await loadSeedBible(page2, undefined, uuid, true);

    // const seedBibleFrame1 = getSeedBibleFrame(page1);

    // const seedBibleFrame2 = getSeedBibleFrame(page2);

    // await Promise.all([
    //   seedBibleFrame1.waitForSelector("div.start-session-bar", {
    //     visible: true,
    //   }),
    //   seedBibleFrame2.waitForSelector("div.start-session-bar", {
    //     visible: true,
    //   }),
    // ]);

    // await seedBibleFrame1.locator("div.start-session-bar").click();

    // await delay(5000);

    // await seedBibleFrame2.waitForSelector("button.join-session-button", {
    //   visible: true,
    // });

    // expect(seedBibleFrame2.locator("button.join-session-button")).toBeDefined();

    // await delay(500);

    // await seedBibleFrame2.locator("button.join-session-button").click();

    // await delay(3000);

    // // Go to next chapter on first session
    // await seedBibleFrame1.waitForSelector(
    //   "div.toolbar-item-wrapper.rightClick > button",
    //   { visible: true }
    // );
    // await delay(1000);
    // await seedBibleFrame1
    //   .locator("div.toolbar-item-wrapper.rightClick > button")
    //   .click();

    // await delay(2000);

    // Should be on Genesis 2 in second session now
    //     const bookTitle = await seedBibleFrame2
    //       .locator("div.bookTitle")
    //       .waitHandle();
    //     expect(
    //       mergeWhitespace(await bookTitle?.evaluate((el) => el.textContent))
    //     ).toBe("Genesis 2 / AAB");
  });
});
