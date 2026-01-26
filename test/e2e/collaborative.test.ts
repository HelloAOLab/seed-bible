import puppeteer, { Browser, Page } from "puppeteer";
import { packageAll } from "../../script/lib/package";
import { loadSeedBible } from "../../script/lib/browser";
import { minifyAll } from "../../script/lib/minify";
import { delay, getSeedBibleFrame } from "./utils";

let browser: Browser;

console.log = jest.fn();

beforeAll(async () => {
  await packageAll("ignore");
  await minifyAll("ignore");

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

  test("test user presense", async () => {
    const uuid = Math.random().toString(36).substring(2, 15);

    await loadSeedBible(page1, undefined, uuid, true);
    await loadSeedBible(page2, undefined, uuid, true);

    const seedBibleFrame1 = getSeedBibleFrame(page1);

    const seedBibleFrame2 = getSeedBibleFrame(page2);

    await Promise.all([
      seedBibleFrame1.waitForSelector("div.start-session-bar", {
        visible: true,
      }),
      seedBibleFrame2.waitForSelector("div.start-session-bar", {
        visible: true,
      }),
    ]);

    await seedBibleFrame1.locator("div.start-session-bar").click();

    await delay(1000);

    await seedBibleFrame2.waitForSelector("button.join-session-button", {
      visible: true,
    });

    expect(seedBibleFrame2.locator("button.join-session-button")).toBeDefined();

    await delay(500);

    await seedBibleFrame2.locator("button.join-session-button").click();

    await delay(500);

    const userPresenceItems2 = await seedBibleFrame2.$$(".user-presence-item");
    expect(userPresenceItems2.length).toBe(2);
    await delay(5000);
    const userPresenceItems1 = await seedBibleFrame1.$$(".user-presence-item");
    expect(userPresenceItems1.length).toBe(2);
  });
});
