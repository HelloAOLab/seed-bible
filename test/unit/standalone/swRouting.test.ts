import {
  blankAppContainer,
  chooseNavigationStrategy,
  getAppShellCacheKey,
  getHtmlCacheName,
  isAppShellNavigation,
  isCacheableStaticAsset,
  pickShellSource,
  staleHtmlCacheNames,
  translationIdFromPath,
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
    expect(navigation(`${ORIGIN}/AAB/genesis/10`)).toBe(true);
    // A deep link with a different language still shares the one shell.
    expect(navigation(`${ORIGIN}/ar/ARBNAV/john/9`)).toBe(true);
    // Legacy query-param URLs still reach the app (the host 301s them to the
    // path form), so the shell has to answer them too.
    expect(navigation(`${ORIGIN}/?book=GEN&chapter=10`)).toBe(true);
  });

  it("is not fooled by a book slug that looks like a file extension", () => {
    // Only the last path segment is a chapter number, so nothing in a reading
    // path can trip `STATIC_FILE_RE` — but the apocrypha slugs are bare
    // three-letter codes, which is the closest thing to a near-miss.
    expect(navigation(`${ORIGIN}/AAB/tob/1`)).toBe(true);
    expect(navigation(`${ORIGIN}/es/spa_onbv/genesis/1`)).toBe(true);
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

describe("getAppShellCacheKey()", () => {
  function keyFor(href: string): string {
    return getAppShellCacheKey(ORIGIN, new URL(href));
  }

  it("gives every chapter its own key so a hit is the page that was asked for", () => {
    expect(keyFor(`${ORIGIN}/en/AAB/genesis/1`)).not.toBe(
      keyFor(`${ORIGIN}/en/AAB/genesis/2`)
    );
    expect(keyFor(`${ORIGIN}/en/AAB/genesis/1`)).toBe(
      `${ORIGIN}/en/AAB/genesis/1`
    );
  });

  it("never reuses the old shared entry's key", () => {
    expect(keyFor(`${ORIGIN}/`)).not.toBe(`${ORIGIN}/__app-shell`);
    expect(keyFor(`${ORIGIN}/en/AAB/genesis/1`)).not.toBe(
      `${ORIGIN}/__app-shell`
    );
  });

  it("keeps the query string, so a customization link has its own entry", () => {
    expect(keyFor(`${ORIGIN}/en/AAB/genesis/1?customization=owner.a`)).not.toBe(
      keyFor(`${ORIGIN}/en/AAB/genesis/1`)
    );
    expect(keyFor(`${ORIGIN}/?customization=owner.a`)).not.toBe(
      keyFor(`${ORIGIN}/?customization=owner.b`)
    );
  });

  it("ignores the fragment", () => {
    expect(keyFor(`${ORIGIN}/en/AAB/genesis/1#v3`)).toBe(
      keyFor(`${ORIGIN}/en/AAB/genesis/1`)
    );
  });

  it("scopes the key to the given origin", () => {
    expect(keyFor(`${ORIGIN}/`)).not.toBe(
      getAppShellCacheKey("https://alpha.seedbible.org", new URL(`${ORIGIN}/`))
    );
  });
});

describe("chooseNavigationStrategy()", () => {
  it("serves a downloader the cached page for the URL and refreshes it", () => {
    expect(
      chooseNavigationStrategy({
        hasCachedPage: true,
        hasShellSource: true,
        hasDownloadedTranslation: true,
      })
    ).toBe("cached-with-revalidate");
  });

  it("serves a downloader a content-free shell on a cache miss", () => {
    expect(
      chooseNavigationStrategy({
        hasCachedPage: false,
        hasShellSource: true,
        hasDownloadedTranslation: true,
      })
    ).toBe("blank-shell");
  });

  it("goes to the network for a downloader with nothing cached at all", () => {
    expect(
      chooseNavigationStrategy({
        hasCachedPage: false,
        hasShellSource: false,
        hasDownloadedTranslation: true,
      })
    ).toBe("network-first");
  });

  it("goes to the network first for someone who has not downloaded a translation", () => {
    for (const hasCachedPage of [true, false]) {
      expect(
        chooseNavigationStrategy({
          hasCachedPage,
          hasShellSource: true,
          hasDownloadedTranslation: false,
        })
      ).toBe("network-first");
    }
  });
});

describe("pickShellSource()", () => {
  const plain = `${ORIGIN}/en/AAB/genesis/1`;
  const custom = `${ORIGIN}/en/AAB/john/1?customization=owner.a`;

  it("uses a plain page for a plain request", () => {
    expect(
      pickShellSource(new URL(`${ORIGIN}/en/AAB/exodus/1`), [custom, plain])
    ).toBe(plain);
  });

  it("never builds a plain request's shell from a customization page", () => {
    expect(
      pickShellSource(new URL(`${ORIGIN}/en/AAB/exodus/1`), [custom])
    ).toBeUndefined();
  });

  it("only borrows from the same customization", () => {
    expect(
      pickShellSource(new URL(`${ORIGIN}/x?customization=owner.b`), [
        plain,
        custom,
      ])
    ).toBeUndefined();
    expect(
      pickShellSource(new URL(`${ORIGIN}/x?customization=owner.a`), [
        plain,
        custom,
      ])
    ).toBe(custom);
  });
});

describe("blankAppContainer()", () => {
  const page = (inner: string) =>
    `<html><head><title>t</title></head><body><div id="app">${inner}</div><script>var a="</div>";</script></body></html>`;

  it("removes the rendered chapter, including nested divs", () => {
    const blank = blankAppContainer(
      page('<div class="x"><div>In the beginning</div></div><p>v2</p>')
    );
    expect(blank).not.toContain("In the beginning");
    expect(blank).not.toContain("v2");
    expect(blank).toContain('<div id="app"><!-- APP_HTML --></div><script>');
    expect(blank).toContain("<title>t</title>");
  });

  it("leaves an element-free container, which the hydration gate treats as no SSR content", () => {
    const blank = blankAppContainer(page("<main>Genesis 1</main>"));
    const doc = new DOMParser().parseFromString(blank!, "text/html");
    expect(doc.getElementById("app")!.firstElementChild).toBeNull();
  });

  it("returns null when there is no app container", () => {
    expect(blankAppContainer("<html><body>hi</body></html>")).toBeNull();
  });
});

describe("getAppShellCacheKey() tracking params", () => {
  const key = (href: string) => getAppShellCacheKey(ORIGIN, new URL(href));

  it("shares one entry between a page and its campaign-tagged links", () => {
    const plain = key(`${ORIGIN}/en/AAB/genesis/1`);
    expect(key(`${ORIGIN}/en/AAB/genesis/1?utm_source=x&utm_medium=y`)).toBe(
      plain
    );
    expect(key(`${ORIGIN}/en/AAB/genesis/1?fbclid=1&gclid=2`)).toBe(plain);
  });

  it("keeps params that change the page", () => {
    expect(
      key(`${ORIGIN}/en/AAB/genesis/1?customization=o.a&utm_source=x`)
    ).toBe(key(`${ORIGIN}/en/AAB/genesis/1?customization=o.a`));
    expect(key(`${ORIGIN}/?book=GEN&chapter=1`)).not.toBe(key(`${ORIGIN}/`));
  });
});

describe("pickShellSource() recency", () => {
  it("builds from the newest saved page, not the oldest", () => {
    const keys = [`${ORIGIN}/en/AAB/a/1`, `${ORIGIN}/en/AAB/b/1`];
    expect(pickShellSource(new URL(`${ORIGIN}/en/AAB/c/1`), keys)).toBe(
      keys[1]
    );
  });
});

describe("HTML cache versioning", () => {
  const current = getHtmlCacheName("build-2");

  it("names the cache after the build", () => {
    expect(getHtmlCacheName("build-1")).not.toBe(getHtmlCacheName("build-2"));
  });

  it("deletes every other build's pages and the old unversioned caches", () => {
    expect(
      staleHtmlCacheNames(
        [
          "seed-bible-html",
          "seed-bible-html-v2",
          getHtmlCacheName("build-1"),
          current,
          "seed-bible-assets",
          "workbox-precache-v2",
        ],
        current
      )
    ).toEqual([
      "seed-bible-html",
      "seed-bible-html-v2",
      getHtmlCacheName("build-1"),
    ]);
  });
});

describe("translationIdFromPath()", () => {
  it("reads the translation from reading URLs, with or without a language", () => {
    expect(translationIdFromPath("/BSB/john/3")).toBe("BSB");
    expect(translationIdFromPath("/es/spa_onbv/genesis/1")).toBe("spa_onbv");
  });

  it("is null where no translation is named", () => {
    expect(translationIdFromPath("/")).toBeNull();
    expect(translationIdFromPath("/en/playlist/my-list/3")).toBeNull();
    expect(translationIdFromPath("/en/reading-plan/plan/2")).toBeNull();
    expect(translationIdFromPath("/BSB/john/notanumber")).toBeNull();
    expect(translationIdFromPath("/BSB/john/0")).toBeNull();
  });
});
