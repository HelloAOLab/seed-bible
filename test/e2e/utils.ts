import type { Frame, Page } from "puppeteer";

export function getSeedBibleFrame(page: Page): Frame {
  console.log("page", page);
  const frame = page
    .frames()
    .find((f) => f.url().includes("secure-ao-content.org"));
  if (!frame) {
    throw new Error("Seed Bible frame not found");
  }
  return frame;
}

export function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

export function mergeWhitespace(
  str: string | null | undefined
): string | null | undefined {
  return str?.replace(/\s+/g, " ").trim();
}
