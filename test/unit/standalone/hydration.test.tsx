import { render as ssrRender } from "../../../standalone/entry-ssr";
import { hydrate } from "preact";
import { Main } from "@packages/seed-bible/seed-bible/app/main";
import {
  DEFAULT_APP_CONFIG,
  readInjectedConfig,
} from "@packages/seed-bible/seed-bible/app/appConfig";
import { readInjectedApiResponseSnapshot } from "@packages/seed-bible/seed-bible/app/apiResponseSeed";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { decideHydration } from "@packages/seed-bible/seed-bible/app/hydrationGate";
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
   * Two known, pre-existing differences have to be normalized out before a
   * byte-for-byte comparison is meaningful — neither is something this test
   * (or Stage 3) introduced, and neither is fixed by it:
   *
   * 1. The anonymous "Guest" avatar's icon + color
   *    (`sb-tab-user-icon-animal` in `Tabs.tsx`'s `SelfAvatarVisual`) is
   *    derived from `getConnectedUserVisualKey` → `os.connectionId`
   *    (`OsManager.tsx`), which is a fresh `uuid()` generated independently
   *    by the server's `CasualOSManager()` instance and the client's — so
   *    for a signed-out visitor it is *never* the same value across the
   *    hydration boundary. This is a genuine, pre-existing hydration hazard
   *    Stage 3 did not introduce and does not fix (fixing it means giving
   *    anonymous identity a stable pre-mount default, the same
   *    seed-then-correct pattern used for viewport/theme/settings — a
   *    follow-up, not done here). Tracked as a known gap; normalized here
   *    so it doesn't mask an unrelated regression in this test.
   *
   * 2. The first-run tutorial offer card (`TutorialPrompt`, rendered as the
   *    LAST sibling in the tree) is absent from the SSR output but present
   *    after hydration. Root cause: `renderToStringAsync` only re-renders
   *    the specific subtree that threw (the chapter-load Suspense
   *    boundary) once its promise resolves — it does not re-render sibling
   *    content that already committed earlier in the same pass. Since
   *    `TutorialManager`'s `promptVisible` (`TutorialManager.tsx`) flips
   *    true as a side effect of that SAME chapter load settling
   *    (`readerVisible` depends on `chapterData`), and `TutorialPrompt` is
   *    positioned before the chapter-suspending subtree in render order,
   *    its SSR pass captures the pre-resolution (`false`) value and never
   *    revisits it — a general property of "resume only what threw"
   *    Suspense SSR, not something specific to Stage 3. Safe for
   *    `hydrate()` specifically because it's a wholesale trailing addition
   *    (nothing existing to mismatch), not an attribute-level disagreement
   *    on a shared node — but still a real content gap between what the
   *    server rendered and what a client mounts moments later, worth its
   *    own follow-up. Normalized here by comparing only what precedes it.
   *
   * A third, formerly-normalized difference — the `<!--$s-->`/`<!--/$s-->`
   * markers `renderToStringAsync` wraps around anything that had to `throw`
   * its data promise during SSR (`BibleReader.tsx`, `Tabs.tsx`'s `TabRow`) —
   * is no longer a divergence to normalize: `entry-ssr.tsx`'s `render()`
   * strips them from `appHtml` before it reaches the page, since Preact's
   * `hydrate()`/`preact/compat` have no notion of them and `preact/debug`
   * reports the resulting stray comment node as a hydration mismatch (its
   * `<${type}>` vs. `""` comes from a comment node having no `.localName`).
   * See the dedicated assertion below.
   */
  // Removed whole (open tag through its own matching close), not just
  // truncated at the open tag — this element may be entirely absent from
  // one side (see finding 2 above), and truncating instead of removing
  // would leave that side's ancestor closing tags unbalanced relative to
  // the other, producing a spurious difference of its own.
  const TUTORIAL_PROMPT_RE =
    /<div role="dialog" aria-modal="false" aria-labelledby="sb-tutorial-prompt-title"[\s\S]*?<\/div><\/div>/;

  function normalizeKnownSsrClientDivergences(html: string): string {
    return html
      .replace(TUTORIAL_PROMPT_RE, "")
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
      tabIds: state.tabs.tabs.value.map((t) => t.id),
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

  it("strips preact-render-to-string's suspense markers from the SSR HTML", async () => {
    // TabRow (Tabs.tsx) and BibleReader.tsx both `throw` their reading
    // state's `chapterDataPromise` during SSR until it settles — the sidebar
    // is not logged in on this path, so it always has to wait for at least
    // one microtask. Without the strip in entry-ssr.tsx, `<!--$s-->`/
    // `<!--/$s-->` markers land in the output even once the promise resolves
    // to real content, and Preact's `hydrate()` (which doesn't understand
    // them) sees them as a stray comment node — reported by `preact/debug` as
    // "Expected a DOM node of type ... but found ''" (a comment node has no
    // `.localName`). Revert the `.replace(...)` in entry-ssr.tsx's `render()`
    // to see this fail.
    const html = await renderSsrDocument();
    expect(html).not.toContain("<!--$s-->");
    expect(html).not.toContain("<!--/$s-->");
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
    // Tab ids match what the server rendered so only the URL disagreement
    // trips this check, not the tabs one.
    const decision = decideHydration({
      config,
      pathname: "/en/AAB/exodus/2",
      search: "",
      container,
      tabIds: config.renderedTabIds ?? [],
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
      tabIds: [],
    });
    expect(decision).toEqual({
      hydrate: false,
      reason: "chapter-load-incomplete",
    });
  });

  it("declines to hydrate when the client restored a different tab list than SSR rendered", async () => {
    // Simulates a returning visitor: their browser already has an
    // `sb-tabs-state` localStorage entry from an earlier session (written by
    // `writeStoredTabsState` in TabsPersistence.ts) describing two tabs. SSR
    // never sees it (`readStoredTabsState` returns null server-side), so it
    // always renders a single tab from the URL — but `TabsManager.tsx`
    // restores the stored, reconciled list on the client before `hydrate()`
    // ever runs, mounting a second `TabRow` the SSR HTML never had. Without
    // this check, `hydrate()` would silently patch over that structural gap
    // (and `preact/debug` would log exactly the "Expected a DOM node of type
    // 'div' but found ''" mismatch this gate exists to catch pre-emptively).
    const html = await renderSsrDocument();
    document.open();
    document.write(html);
    document.close();
    jsdom.reconfigure({ url: `http://ssr.local${PATH}` });

    const config = readInjectedConfig();
    const container = document.getElementById("app")!;

    const decision = decideHydration({
      config,
      pathname: location.pathname,
      search: location.search,
      container,
      tabIds: [...(config.renderedTabIds ?? []), "tab-2"],
    });
    expect(decision).toEqual({ hydrate: false, reason: "tabs-mismatch" });
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
      tabIds: [],
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
      tabIds: [],
    });
    expect(decision).toEqual({ hydrate: false, reason: "no-ssr-content" });
  });
});
