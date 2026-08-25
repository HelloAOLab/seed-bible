import { render as ssrRender } from "../../../standalone/entry-ssr";
import { hydrate } from "preact";
import { act } from "preact/test-utils";
import { Main } from "@packages/seed-bible/seed-bible/app/main";
import {
  DEFAULT_APP_CONFIG,
  readInjectedConfig,
} from "@packages/seed-bible/seed-bible/app/appConfig";
import { readInjectedApiResponseSnapshot } from "@packages/seed-bible/seed-bible/app/apiResponseSeed";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { decideHydration } from "@packages/seed-bible/seed-bible/app/hydrationGate";
import { waitForInitialChapterLoads } from "@packages/seed-bible/seed-bible/app/initialChapterLoadWait";
import { createDefaultManagerResponseMap } from "../seed-bible/managers/testUtils/mockBibleApiData";

const TEMPLATE = [
  "<!doctype html><html><head>",
  '<style id="sb-theme-styles"><!-- THEME_STYLE_TAG --></style>',
  '<script type="application/json" id="sb-theme-presets"><!-- THEME_PRESETS_JSON --></script>',
  "<!-- META -->",
  '</head><body><script type="application/json" id="app-config"><!-- CONFIG_JSON --></script>',
  '<script type="application/json" id="app-seed-data"><!-- SEED_JSON --></script>',
  '<div id="app"><!-- APP_HTML --></div></body></html>',
].join("");

const PATH = "/en/AAB/genesis/1?useFreeBibleAPI=true";

/**
 * `sb-tabs-state` exactly as `writeStoredTabsState` leaves it, for a visitor
 * whose previous session ended on `tabs`. Used to reproduce the returning-visitor
 * case: the server can never see this (no `localStorage`), so it is the client's
 * job not to let it change the first render.
 */
function seedStoredTabsState(
  tabs: Array<{
    id: string;
    translationId: string;
    bookId: string;
    chapterNumber: number;
  }>,
  options: {
    selectedTabId?: string;
    layout?: string;
    slotTabIds?: string[];
    selectedSlotIndex?: number;
  } = {}
): void {
  localStorage.setItem(
    "sb-tabs-state",
    JSON.stringify({
      version: 1,
      tabs,
      selectedTabId: options.selectedTabId ?? tabs[0]!.id,
      layout: options.layout ?? "single",
      slotTabIds: options.slotTabIds ?? [tabs[0]!.id],
      selectedSlotIndex: options.selectedSlotIndex ?? 0,
    })
  );
}

async function renderSsrDocument(): Promise<string> {
  jsdom.reconfigure({ url: `http://ssr.local${PATH}` });
  localStorage.clear();
  const responses = createDefaultManagerResponseMap();
  globalThis.fetch = (async (url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }
    return response;
  }) as typeof globalThis.fetch;
  import.meta.env.SSR = true;
  try {
    const result = (await ssrRender({
      path: PATH,
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
      html: TEMPLATE,
    })) as { html: string; notFound?: true; redirectTo?: string };
    if ("redirectTo" in result) {
      throw new Error(`Expected html, got a redirect to ${result.redirectTo}`);
    }
    return result.html;
  } finally {
    delete import.meta.env.SSR;
  }
}

describe("client hydration", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  /**
   * Two differences still have to be normalized out before a byte-for-byte
   * comparison is meaningful:
   *
   * 1. `<!--$s-->`/`<!--/$s-->` — markers `preact-render-to-string` wraps around
   *    any component that had to `throw` its data promise (the chapter-load
   *    suspension in `BibleReader.tsx` and `Tabs.tsx`'s `TabRow`), emitted even
   *    once the promise resolved to real content. These are harmless to
   *    `hydrate()`, not merely tolerated: Preact's node matching requires a
   *    candidate with `setAttribute` and a matching `localName`
   *    (`preact/src/diff/index.js`), so a comment node is skipped over rather
   *    than tripped on, and Preact then drops it as unmatched. Verified directly
   *    against `preact/debug` with markers around an element, around text, at
   *    the container root, and nested: zero mismatches reported in all four. So
   *    they are a string-comparison artifact only — do NOT "fix" them by
   *    stripping them from the SSR output.
   *
   * 2. The anonymous "Guest" avatar's icon + color
   *    (`sb-tab-user-icon-animal` in `Tabs.tsx`'s `SelfAvatarVisual`) is
   *    derived from `getConnectedUserVisualKey` → `os.connectionId`
   *    (`OsManager.tsx`), which is a fresh `uuid()` generated independently
   *    by the server's `CasualOSManager()` instance and the client's — so
   *    for a signed-out visitor it is *never* the same value across the
   *    hydration boundary. A genuine hydration hazard, though an
   *    attribute-level one, which Preact neither reports nor corrects. Fixing
   *    it means giving anonymous identity a stable pre-mount default — the same
   *    seed-then-correct pattern used for viewport/settings/tabs. Tracked as a
   *    known gap; normalized here so it doesn't mask an unrelated regression.
   *
   * A third divergence used to be normalized here and is now genuinely fixed:
   * the first-run tutorial offer card (`TutorialPrompt`) was absent from the SSR
   * output but present after hydration, because `TutorialManager`'s auto-start
   * effect flipped `promptVisible` true as soon as the chapter load settled —
   * which on the client happens before `hydrate()` (`app/init.tsx` awaits it),
   * while SSR captured the pre-resolution `false` and never revisited it
   * (`renderToStringAsync` only re-renders the subtree that threw). That put an
   * element in the client tree the served HTML lacked, which IS reported by
   * `hydrate()`. The effect is now armed from a post-mount effect instead
   * (`TutorialManager.armAutoStart`, called by `app.hydrateFromStorage`), so the
   * comparison below covers it rather than normalizing it away.
   */
  function normalizeKnownSsrClientDivergences(html: string): string {
    return html
      .replace(/<!--\/?\$s-->/g, "")
      .replace(
        /(style="border-color:)[^;]+(;background-color:)[^;]+(;?" class="sb-tab-user-icon sb-tab-user-icon-animal"><span class="material-symbols-outlined">)[a-z_]+(<\/span>)/g,
        "$1#normalized$2#normalized$3normalized$4"
      );
  }

  it("hydrates onto the SSR document without changing the DOM", async () => {
    const html = await renderSsrDocument();

    document.open();
    document.write(html);
    document.close();
    // `document.write` re-navigates jsdom's location to "about:blank"; put it
    // back to what the server rendered for, matching a real browser (which
    // never navigates away for its own document.write).
    jsdom.reconfigure({ url: `http://ssr.local${PATH}` });

    const container = document.getElementById("app")!;
    const beforeHtml = container.innerHTML;
    expect(beforeHtml).toContain("Verse 1");

    // Live client: same fetch mocks the server used — a correct hydration
    // should reproduce byte-identical DOM without needing them (the seeded
    // API response cache should already have everything), but leaving them
    // in place matches what a real browser has available too.
    const config = readInjectedConfig();
    const apiResponseSnapshot = readInjectedApiResponseSnapshot();
    const state = createSeedBibleState({ config, apiResponseSnapshot });

    await Promise.all([
      state.i18n.ready,
      Promise.all(
        state.tabs.tabs.value.map((t) => t.readingState.chapterDataPromise)
      ),
    ]);

    const decision = decideHydration({
      config,
      pathname: location.pathname,
      search: location.search,
      container,
    });
    expect(decision).toEqual({ hydrate: true });

    hydrate(<Main initialState={state} config={config} />, container);

    // Preact does not warn on a hydration mismatch — it silently patches the
    // DOM to match what it thinks it should render. This is the actual
    // safety net: any structural difference here (once the two known,
    // pre-existing divergences above are normalized out) means client and
    // server disagreed about something this PR was supposed to fix.
    expect(normalizeKnownSsrClientDivergences(container.innerHTML)).toBe(
      normalizeKnownSsrClientDivergences(beforeHtml)
    );
  });

  /**
   * Puts the SSR document into jsdom and returns the pieces a client needs to
   * hydrate onto it. Split out of the first test so the returning-visitor cases
   * below can seed `localStorage` between the SSR render (which must not see it)
   * and the client's `createSeedBibleState` (which must).
   */
  async function installSsrDocument(): Promise<{
    container: HTMLElement;
    beforeHtml: string;
  }> {
    const html = await renderSsrDocument();
    document.open();
    document.write(html);
    document.close();
    // `document.write` re-navigates jsdom's location to "about:blank"; put it
    // back to what the server rendered for, matching a real browser.
    jsdom.reconfigure({ url: `http://ssr.local${PATH}` });
    const container = document.getElementById("app")!;
    return { container, beforeHtml: container.innerHTML };
  }

  async function createClientState() {
    const config = readInjectedConfig();
    const apiResponseSnapshot = readInjectedApiResponseSnapshot();
    const state = createSeedBibleState({ config, apiResponseSnapshot });
    await Promise.all([
      state.i18n.ready,
      Promise.all(
        state.tabs.tabs.value.map((t) => t.readingState.chapterDataPromise)
      ),
    ]);
    return { config, state };
  }

  // Excludes the mobile "add a tab" button, which reuses `sb-tab-row` for its
  // styling (Tabs.tsx) but isn't a reader tab.
  function countTabRows(container: HTMLElement): number {
    return container.querySelectorAll(
      ".sb-tab-row:not(.sb-tab-mobile-add-inline)"
    ).length;
  }

  it("hydrates cleanly when the visitor already has this chapter's tab saved", async () => {
    // The reported repro: load a chapter, then refresh. The refresh finds an
    // `sb-tabs-state` entry describing the tab the previous load persisted.
    const { container, beforeHtml } = await installSsrDocument();
    seedStoredTabsState([
      { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
    ]);

    const { config, state } = await createClientState();

    // The saved tab reconciles to the same single tab the URL implies, so the
    // gate is satisfied — and must stay satisfied, since falling back to
    // `render()` for every returning visitor is what the reverted fix did.
    expect(
      decideHydration({
        config,
        pathname: location.pathname,
        search: location.search,
        container,
      })
    ).toEqual({ hydrate: true });

    hydrate(<Main initialState={state} config={config} />, container);

    expect(normalizeKnownSsrClientDivergences(container.innerHTML)).toBe(
      normalizeKnownSsrClientDivergences(beforeHtml)
    );
  });

  it("hydrates cleanly with several saved tabs, then restores them after mount", async () => {
    // The structural case: two saved tabs across a split. Restoring them before
    // the first render mounts a second `TabRow` and a second pane that the served
    // HTML never had — extra elements are the one divergence `hydrate()` reports
    // rather than silently patching, so they have to arrive afterwards.
    const { container, beforeHtml } = await installSsrDocument();
    seedStoredTabsState(
      [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        { id: "tab-2", translationId: "AAB", bookId: "EXO", chapterNumber: 2 },
      ],
      {
        selectedTabId: "tab-1",
        layout: "split-2v",
        slotTabIds: ["tab-1", "tab-2"],
        selectedSlotIndex: 0,
      }
    );

    const { config, state } = await createClientState();
    expect(state.tabs.tabs.value).toHaveLength(1);
    expect(countTabRows(container)).toBe(1);

    hydrate(<Main initialState={state} config={config} />, container);

    // The DOM the server sent is still exactly the DOM we have.
    expect(normalizeKnownSsrClientDivergences(container.innerHTML)).toBe(
      normalizeKnownSsrClientDivergences(beforeHtml)
    );

    // ...and only now do the saved tabs appear, via `MainBody`'s post-mount
    // effect calling `app.hydrateFromStorage()`.
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.all(
        state.tabs.tabs.value.map((t) => t.readingState.chapterDataPromise)
      );
    });

    expect(state.tabs.tabs.value.map((t) => t.id)).toEqual(["tab-1", "tab-2"]);
    expect(state.tabsLayout.layout.value).toBe("split-2v");
    expect(countTabRows(container)).toBe(2);
  });

  it("does not overwrite the saved tabs before restoring them", async () => {
    // The managers seed with a single URL-derived tab. Persisting *that* before
    // the restore ran would replace a whole saved session with one tab — the
    // saved tabs destroyed by the act of opening the page.
    await installSsrDocument();
    seedStoredTabsState(
      [
        { id: "tab-1", translationId: "AAB", bookId: "GEN", chapterNumber: 1 },
        { id: "tab-2", translationId: "AAB", bookId: "EXO", chapterNumber: 2 },
      ],
      {
        selectedTabId: "tab-1",
        layout: "split-2v",
        slotTabIds: ["tab-1", "tab-2"],
        selectedSlotIndex: 0,
      }
    );

    const { state } = await createClientState();
    // Let every eager effect settle, including the persistence one.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = JSON.parse(localStorage.getItem("sb-tabs-state")!);
    expect(stored.tabs).toHaveLength(2);

    // Once the restore has run, persisting is correct again.
    state.app.hydrateFromStorage();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      JSON.parse(localStorage.getItem("sb-tabs-state")!).tabs
    ).toHaveLength(2);
  });

  it("declines to hydrate when the live URL doesn't match what was rendered", async () => {
    const html = await renderSsrDocument();
    document.open();
    document.write(html);
    document.close();

    const config = readInjectedConfig();
    const container = document.getElementById("app")!;

    // Simulate a client that ended up on a different reading position than
    // what the server rendered for (e.g. bfcache restoring a stale page).
    const decision = decideHydration({
      config,
      pathname: "/en/AAB/exodus/2",
      search: "",
      container,
    });
    expect(decision).toEqual({ hydrate: false, reason: "url-mismatch" });
  });

  it("declines to hydrate when the SSR chapter load timed out", () => {
    const container = document.createElement("div");
    container.innerHTML = "<div>chrome only, no verse text</div>";
    const config = {
      ...DEFAULT_APP_CONFIG,
      renderedForPath: "/en/AAB/genesis/1",
      ssrChapterContentSettled: false,
    };

    const decision = decideHydration({
      config,
      pathname: "/en/AAB/genesis/1",
      search: "",
      container,
    });
    expect(decision).toEqual({
      hydrate: false,
      reason: "chapter-load-incomplete",
    });
  });

  it("declines to hydrate a shell-only document with no real SSR content", () => {
    const container = document.createElement("div");
    container.innerHTML = "<!-- APP_HTML -->"; // never substituted
    const config = {
      ...DEFAULT_APP_CONFIG,
      renderedForPath: "/",
    };

    const decision = decideHydration({
      config,
      pathname: "/",
      search: "",
      container,
    });
    expect(decision).toEqual({ hydrate: false, reason: "no-ssr-content" });
  });

  it("declines to hydrate a config that never went through a real render() at all", () => {
    const container = document.createElement("div");
    container.innerHTML = "<div>some stale build-time snapshot</div>";

    const decision = decideHydration({
      config: DEFAULT_APP_CONFIG, // no renderedForPath
      pathname: "/",
      search: "",
      container,
    });
    expect(decision).toEqual({ hydrate: false, reason: "no-ssr-content" });
  });
});

describe("waitForInitialChapterLoads()", () => {
  it("waits for every initial tab's chapter load", async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((resolve) => (resolveFirst = resolve));
    const second = new Promise<void>((resolve) => (resolveSecond = resolve));

    let result: string | null = null;
    void waitForInitialChapterLoads([first, second], 10_000).then((value) => {
      result = value;
    });

    resolveFirst();
    await Promise.resolve();
    expect(result).toBeNull();

    resolveSecond();
    await waitForCondition(() => result !== null);
    expect(result).toBe("settled");
  });

  it("gives up on a chapter load that never settles, so the app can still mount", async () => {
    // A fetch whose connection stays open but never completes. Mounting is
    // gated on this wait (see `app/init.tsx`), so without the bound the whole
    // app — sidebar, menus, tab switching, not just the reader — would stay
    // uninteractive forever.
    const neverSettles = new Promise<void>(() => {});

    const result = await waitForInitialChapterLoads([neverSettles], 5);

    expect(result).toBe("timed-out");
  });

  it("treats a rejected chapter load as settled rather than hanging or throwing", async () => {
    const failed = Promise.reject(new Error("network down"));

    await expect(waitForInitialChapterLoads([failed], 10_000)).resolves.toBe(
      "settled"
    );
  });

  it("doesn't wait at all when there are no initial tabs", async () => {
    await expect(waitForInitialChapterLoads([], 10_000)).resolves.toBe(
      "settled"
    );
  });
});

async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
