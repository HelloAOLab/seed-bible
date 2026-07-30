import {
  isAppShellNavigation,
  isCacheableStaticAsset,
} from "../../../standalone/swRouting";

const ORIGIN = "https://seedbible.org";
const ASSET_BASE_HREF =
  "https://assets.example/branches/main/2026-07-28-abc123/";

function navigation(href: string, requestMode = "navigate") {
  return isAppShellNavigation({
    url: new URL(href),
    requestMode,
    origin: ORIGIN,
  });
}

function cacheable(href: string) {
  return isCacheableStaticAsset({
    url: new URL(href),
    origin: ORIGIN,
    assetBaseHref: ASSET_BASE_HREF,
  });
}

describe("isAppShellNavigation()", () => {
  it("answers page loads on this origin", () => {
    expect(navigation(`${ORIGIN}/`)).toBe(true);
    expect(navigation(`${ORIGIN}/?book=GEN&chapter=10`)).toBe(true);
    // A deep link with a different language still shares the one shell.
    expect(navigation(`${ORIGIN}/?book=JHN&chapter=9&lang=ar`)).toBe(true);
  });

  it("ignores anything that isn't a navigation", () => {
    // Sub-resource fetches are the asset route's business, not the shell's.
    expect(navigation(`${ORIGIN}/?book=GEN`, "cors")).toBe(false);
    expect(navigation(`${ORIGIN}/?book=GEN`, "no-cors")).toBe(false);
    expect(navigation(`${ORIGIN}/?book=GEN`, "same-origin")).toBe(false);
  });

  it("ignores other origins", () => {
    expect(navigation("https://alpha.seedbible.org/")).toBe(false);
    expect(navigation("https://assets.example/")).toBe(false);
  });

  it("stays out of the way of branch previews", () => {
    // A `/b/` deployment is a different build with its own assets; serving the
    // root shell there would boot the wrong version of the app.
    expect(navigation(`${ORIGIN}/b/feature_x/abc123`)).toBe(false);
    expect(navigation(`${ORIGIN}/b/feature_x/abc123/?book=GEN`)).toBe(false);
  });

  it("does not claim navigations that point at a file", () => {
    expect(navigation(`${ORIGIN}/manifest.webmanifest`)).toBe(false);
    expect(navigation(`${ORIGIN}/robots.txt`)).toBe(false);
    expect(navigation(`${ORIGIN}/assets/index-AAA.js`)).toBe(false);
  });

  it("is not fooled by an extension appearing in the query string", () => {
    // The check has to look at the path only — a search term ending in ".json"
    // must not turn a page load into a file request.
    expect(navigation(`${ORIGIN}/?q=data.json`)).toBe(true);
  });
});

describe("isCacheableStaticAsset()", () => {
  it("caches this build's own hashed assets", () => {
    expect(cacheable(`${ASSET_BASE_HREF}assets/index-AAA.js`)).toBe(true);
    expect(cacheable(`${ASSET_BASE_HREF}assets/index-DDD.css`)).toBe(true);
    expect(cacheable(`${ASSET_BASE_HREF}assets/DMSans-JJJ.woff2`)).toBe(true);
  });

  it("refuses another build's assets on the same asset host", () => {
    // This is the rule that matters: a branch preview loads its chunks from a
    // different prefix, and caching those would mix two builds together.
    expect(
      cacheable(
        "https://assets.example/branches/feature_x/def456/assets/index-ZZZ.js"
      )
    ).toBe(false);
    expect(
      cacheable(
        "https://assets.example/branches/main/2026-07-01-old999/assets/index-YYY.js"
      )
    ).toBe(false);
  });

  it("caches the files served from the site root", () => {
    expect(cacheable(`${ORIGIN}/manifest.webmanifest`)).toBe(true);
    expect(cacheable(`${ORIGIN}/registerSW.js`)).toBe(true);
  });

  it("refuses same-origin paths that belong to another deployment", () => {
    expect(cacheable(`${ORIGIN}/b/feature_x/abc123/assets/index-ZZZ.js`)).toBe(
      false
    );
    expect(
      cacheable(`${ORIGIN}/branches/main/abc123/assets/index-ZZZ.js`)
    ).toBe(false);
  });

  it("refuses requests that aren't for a file", () => {
    expect(cacheable(`${ORIGIN}/`)).toBe(false);
    expect(cacheable(`${ORIGIN}/?book=GEN&chapter=10`)).toBe(false);
  });

  it("refuses a third-party origin", () => {
    // Fonts have their own routes; everything else goes straight to the network.
    expect(cacheable("https://bible.helloao.org/api/AAB/books.json")).toBe(
      false
    );
    expect(cacheable("https://fonts.gstatic.com/s/dmsans/font.woff2")).toBe(
      false
    );
  });

  it("caches same-origin assets when no asset host is configured", () => {
    // A plain local build serves its chunks from the site root.
    expect(
      isCacheableStaticAsset({
        url: new URL(`${ORIGIN}/assets/index-AAA.js`),
        origin: ORIGIN,
        assetBaseHref: `${ORIGIN}/`,
      })
    ).toBe(true);
  });
});
