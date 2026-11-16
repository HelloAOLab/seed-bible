import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createHtmlPageStore,
  handleNavigation,
  type NavigationDeps,
} from "../../../standalone/swNavigation";
import { blankAppContainer } from "../../../standalone/swRouting";

const ORIGIN = "https://seedbible.org";

/** In-memory CacheStorage; keys() is oldest-first like the real thing. */
function fakeCaches(): CacheStorage {
  // Real cache operations take a few turns of the event loop, which is what
  // lets overlapping writes interleave.
  const tick = async () => {
    for (let i = 0; i < 3; i++) await Promise.resolve();
  };
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const map = stores.get(name)!;
    const id = (key: string | Request) =>
      typeof key === "string" ? key : key.url;
    return {
      match: async (key: string | Request) => map.get(id(key))?.clone(),
      put: async (key: string | Request, response: Response) => {
        await tick();
        map.set(id(key), response);
      },
      delete: async (key: string | Request) => map.delete(id(key)),
      keys: async () => {
        await tick();
        return [...map.keys()].map((k) => new Request(k));
      },
    } as unknown as Cache;
  };
  return { open } as unknown as CacheStorage;
}

const page = (text: string) =>
  `<html><body><div id="app"><main>${text}</main></div></body></html>`;
const html = (text: string, status = 200) =>
  new Response(page(text), { status });

function setup(overrides: Partial<NavigationDeps> = {}, maxEntries?: number) {
  const store = createHtmlPageStore({
    caches: fakeCaches(),
    cacheName: "seed-bible-html-test",
    origin: ORIGIN,
    maxEntries,
  });
  const background: Promise<unknown>[] = [];
  const deps: NavigationDeps = {
    store,
    fetch: async () => html("network"),
    hasDownloadedTranslation: async () => false,
    waitUntil: (p) => {
      background.push(p);
    },
    ...overrides,
  };
  const go = (path: string) =>
    handleNavigation(new Request(`${ORIGIN}${path}`), deps);
  const settle = () => Promise.all(background);
  return { store, deps, go, settle };
}

const u = (path: string) => new URL(`${ORIGIN}${path}`);
const text = (r: Response) => r.text();

describe("saved pages", () => {
  it("only saves successful pages", async () => {
    const { store } = setup();
    await store.put(u("/en/BSB/john/1"), html("missing", 404));
    await store.put(u("/en/BSB/john/2"), new Response(null, { status: 302 }));
    expect(await store.match(u("/en/BSB/john/1"))).toBeUndefined();
    expect(await store.match(u("/en/BSB/john/2"))).toBeUndefined();
  });

  it("keeps at most the limit, evicting the least recently saved", async () => {
    const { store } = setup({}, 3);
    for (let i = 1; i <= 4; i++) {
      await store.put(u(`/en/BSB/john/${i}`), html(`c${i}`));
    }
    expect(await store.match(u("/en/BSB/john/1"))).toBeUndefined();
    expect(await store.match(u("/en/BSB/john/4"))).toBeDefined();
  });

  it("keeps the limit when writes overlap", async () => {
    const caches = fakeCaches();
    const store = createHtmlPageStore({
      caches,
      cacheName: "c",
      origin: ORIGIN,
      maxEntries: 2,
    });
    await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        store.put(u(`/en/BSB/john/${i}`), html(`c${i}`))
      )
    );
    const keys = await (await caches.open("c")).keys();
    expect(keys.map((k) => k.url)).toEqual([
      `${ORIGIN}/en/BSB/john/4`,
      `${ORIGIN}/en/BSB/john/5`,
    ]);
  });

  it("refreshing a page makes it the newest, so it outlives older ones", async () => {
    const { store } = setup({}, 2);
    await store.put(u("/en/BSB/john/1"), html("one"));
    await store.put(u("/en/BSB/john/2"), html("two"));
    await store.put(u("/en/BSB/john/1"), html("one again"));
    await store.put(u("/en/BSB/john/3"), html("three"));
    expect(await store.match(u("/en/BSB/john/2"))).toBeUndefined();
    expect(await text((await store.match(u("/en/BSB/john/1")))!)).toContain(
      "one again"
    );
  });

  it("does not split a page by tracking params", async () => {
    const { store } = setup();
    await store.put(u("/en/BSB/john/1?utm_source=mail"), html("john 1"));
    expect(await store.match(u("/en/BSB/john/1?fbclid=x"))).toBeDefined();
  });

  it("builds the blank shell from the newest saved page", async () => {
    const { store } = setup();
    await store.put(u("/en/BSB/john/1"), html("old"));
    await store.put(u("/en/BSB/john/2"), html("new"));
    const shell = await store.blankShell(u("/en/BSB/john/3"));
    expect(shell).not.toBeNull();
    expect(await text(shell!)).not.toContain("<main>");
  });

  it("has no blank shell when nothing is saved", async () => {
    const { store } = setup();
    expect(await store.blankShell(u("/en/BSB/john/3"))).toBeNull();
  });
});

describe("handleNavigation()", () => {
  it("takes the network page and saves it for a visitor with no download", async () => {
    const { go, settle, store } = setup();
    expect(await text(await go("/en/BSB/john/1"))).toContain("network");
    await settle();
    expect(await store.match(u("/en/BSB/john/1"))).toBeDefined();
  });

  it("does not save a failing server response", async () => {
    const { go, settle, store } = setup({
      fetch: async () => html("boom", 500),
    });
    expect((await go("/en/BSB/john/1")).status).toBe(500);
    await settle();
    expect(await store.match(u("/en/BSB/john/1"))).toBeUndefined();
  });

  it("starts the network request before the IndexedDB lookup finishes", async () => {
    const order: string[] = [];
    const { go } = setup({
      fetch: async () => {
        order.push("fetch");
        return html("network");
      },
      hasDownloadedTranslation: async () => {
        order.push("idb");
        return false;
      },
    });
    await go("/en/BSB/john/1");
    expect(order[0]).toBe("fetch");
  });

  it("serves a downloader the saved page instantly and refreshes it behind", async () => {
    let release!: (r: Response) => void;
    const slow = new Promise<Response>((r) => (release = r));
    const { go, settle, store } = setup({
      hasDownloadedTranslation: async () => true,
      fetch: () => slow,
    });
    await store.put(u("/en/BSB/john/1"), html("saved"));
    expect(await text(await go("/en/BSB/john/1"))).toContain("saved");
    release(html("fresh"));
    await settle();
    expect(await text((await store.match(u("/en/BSB/john/1")))!)).toContain(
      "fresh"
    );
  });

  it("serves a downloader an empty shell, never another chapter, on a miss", async () => {
    const { go, store } = setup({
      hasDownloadedTranslation: async () => true,
      fetch: () => new Promise<Response>(() => {}),
    });
    await store.put(u("/en/BSB/john/1"), html("John 1 text"));
    const body = await text(await go("/en/BSB/john/2"));
    expect(body).not.toContain("John 1 text");
    expect(body).toContain('<div id="app">');
  });

  it("asks which translation the URL needs", async () => {
    const asked: (string | null)[] = [];
    const { go } = setup({
      hasDownloadedTranslation: async (id) => {
        asked.push(id);
        return false;
      },
    });
    await go("/en/BSB/john/1");
    await go("/");
    expect(asked).toEqual(["BSB", null]);
  });

  it("falls back to the saved copy when a no-download visitor is offline", async () => {
    const { go, store } = setup({
      fetch: async () => {
        throw new TypeError("offline");
      },
    });
    await store.put(u("/en/BSB/john/1"), html("saved"));
    expect(await text(await go("/en/BSB/john/1"))).toContain("saved");
  });

  it("uses an empty shell when offline with no saved copy of the URL", async () => {
    const { go, store } = setup({
      fetch: async () => {
        throw new TypeError("offline");
      },
    });
    await store.put(u("/en/BSB/john/1"), html("John 1 text"));
    const body = await text(await go("/en/BSB/john/2"));
    expect(body).not.toContain("John 1 text");
  });

  it("fails when offline and nothing is saved", async () => {
    const { go } = setup({
      fetch: async () => {
        throw new TypeError("offline");
      },
    });
    await expect(go("/en/BSB/john/1")).rejects.toThrow("offline");
  });

  describe("on a stalled connection", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("serves this URL's saved copy once the timeout passes, and still refreshes it", async () => {
      let release!: (r: Response) => void;
      const slow = new Promise<Response>((r) => (release = r));
      const { go, store, settle } = setup({
        fetch: () => slow,
        networkTimeoutMs: 1000,
      });
      await store.put(u("/en/BSB/john/1"), html("saved"));
      const result = go("/en/BSB/john/1");
      await vi.advanceTimersByTimeAsync(1000);
      expect(await text(await result)).toContain("saved");
      release(html("fresh"));
      await settle();
      expect(await text((await store.match(u("/en/BSB/john/1")))!)).toContain(
        "fresh"
      );
    });

    it("prefers a network answer that arrives in time", async () => {
      const { go, store } = setup({ networkTimeoutMs: 1000 });
      await store.put(u("/en/BSB/john/1"), html("saved"));
      expect(await text(await go("/en/BSB/john/1"))).toContain("network");
    });

    it("keeps waiting for the network when nothing is saved", async () => {
      let release!: (r: Response) => void;
      const slow = new Promise<Response>((r) => (release = r));
      const { go } = setup({ fetch: () => slow, networkTimeoutMs: 1000 });
      const result = go("/en/BSB/john/1");
      await vi.advanceTimersByTimeAsync(5000);
      release(html("late"));
      expect(await text(await result)).toContain("late");
    });
  });
});

describe("the real index.html template", () => {
  it("can have its app container emptied", () => {
    const template = readFileSync(
      resolve(__dirname, "../../../index.html"),
      "utf-8"
    ).replace("<!-- APP_HTML -->", "<main>Genesis 1</main>");
    const blank = blankAppContainer(template);
    expect(blank).not.toBeNull();
    expect(blank).not.toContain("Genesis 1");
    expect(blank).toContain('<div id="app">');
  });
});
