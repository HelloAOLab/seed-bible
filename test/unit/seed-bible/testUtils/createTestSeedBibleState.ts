import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import i18n from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import en from "@packages/seed-bible/seed-bible/i18n/en.json";
import {
  createDefaultManagerResponseMap,
  type WebResponseMap,
} from "../managers/testUtils/mockBibleApiData";
import type { OfflineTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import type { AppConfig } from "@packages/seed-bible/seed-bible/app/appConfig";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";

// Lazy per-language loaders for the real "seed-bible" locale files, mirroring
// the glob backend in I18nManager. Without this, `changeLanguage("ar")` (etc.)
// has no backend to load from and every key falls back to its defaultValue.
const localeLoaders = import.meta.glob(
  "../../../../packages/seed-bible/seed-bible/i18n/*.json"
) as Record<string, () => Promise<{ default: Record<string, string> }>>;

const localeLoaderByLanguage: Record<
  string,
  () => Promise<{ default: Record<string, string> }>
> = Object.fromEntries(
  Object.entries(localeLoaders).map(([path, loader]) => {
    const language = path.match(/\/([a-z-]+)\.json$/i)?.[1];
    return [language, loader];
  })
);

type TestGlobalScope = typeof globalThis;

export interface CreateTestSeedBibleStateOptions {
  responses?: WebResponseMap;
  timeoutMs?: number;
  /**
   * Where offline translation downloads are stored. jsdom has no IndexedDB, so
   * pass an in-memory store to exercise anything that depends on downloads.
   */
  offlineStore?: OfflineTranslationStore | null;
  /** Deployment config passed through to `createSeedBibleState`. */
  config?: AppConfig;
  /**
   * Whether the Today screen auto-opens over the reader, as it does in
   * production for a URL with no reading position. Defaults to `false` so the
   * fixture models a reader looking at a chapter — otherwise Today's fullscreen
   * pane covers the reader in every test that isn't about Today.
   *
   * Applied through the real `?today=` param rather than a bespoke flag, so
   * tests exercise the same path a user's URL would.
   *
   * `"fromUrl"` stamps no param at all and lets the boot heuristic decide from
   * whatever URL the test navigated to — which is the only way to reach that
   * heuristic, since an explicit `?today=` short-circuits it.
   */
  todayOpen?: boolean | "fromUrl";
}

export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 1000
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }

    const p = new Promise((resolve) => setTimeout(resolve, 0));
    if (vi.isFakeTimers()) {
      // Advance just enough to fire the zero-delay yield above (and keep the
      // mocked Date.now() moving for the timeout check) without firing
      // long-delay timers like autosave intervals or analytics timeouts.
      vi.advanceTimersByTime(1);
    }
    await p;
  }
}

export async function waitForInitialLoad(
  state: BibleReadingState,
  timeoutMs: number
): Promise<void> {
  await waitFor(() => state.loading.value === false, timeoutMs);
}

export async function waitForTabsToLoad(
  state: SeedBibleState,
  timeoutMs: number
): Promise<void> {
  await Promise.all(
    state.tabs.tabs.value.map((tab) =>
      waitForInitialLoad(tab.readingState, timeoutMs)
    )
  );
}

function installFreeUseBibleApiMock(
  scope: TestGlobalScope,
  responses: WebResponseMap
): void {
  scope.fetch = (async (url: string) => {
    const response = responses[url];
    if (!response) {
      throw new Error(`No mocked response for ${url}`);
    }

    return response;
  }) as typeof globalThis.fetch;
}

/**
 * Points `os.getSharedDocument` at a purely local Yjs document.
 *
 * The real implementation calls `doc.connect()` and then waits for a sync, so an
 * unmocked call opens a real WebSocket to the records server. That is easy to
 * reach by accident: signing a user in makes `TodayManager`'s resume effect read
 * reading history, which resolves one shared document per year. When the
 * handshake completes, undici dispatches an `open` event built from jsdom's
 * `Event` onto a Node `EventTarget`, which rejects it with `ERR_INVALID_ARG_TYPE`
 * — an unhandled error that fails the run without failing any test, and only
 * when the network cooperates, which is why it surfaces in CI and not locally.
 *
 * A local document rather than a throw, because a signed-in app is *supposed* to
 * read reading history: callers get an empty document that keeps whatever is
 * written into it, keyed the way the real client keys them.
 */
function installSharedDocumentMock(state: SeedBibleState): void {
  const documents = new Map<string, SharedDocument>();

  vi.spyOn(state.os, "getSharedDocument").mockImplementation(
    async (recordName, inst, docName) => {
      const key = `${recordName ?? ""}/${inst}/${docName}`;
      const existing = documents.get(key);
      if (existing) {
        return existing;
      }

      const { YjsSharedDocument } =
        await import("@casual-simulation/aux-common/documents/YjsSharedDocument");
      // No `branch`, so the document never reaches for IndexedDB — absent in
      // jsdom — and stays entirely in memory.
      const document = new YjsSharedDocument({});
      documents.set(key, document);
      return document;
    }
  );
}

async function ensureI18nInitialized(): Promise<void> {
  if (i18n.isInitialized) {
    return;
  }

  i18n.use(
    resourcesToBackend((language: string, namespace: string) => {
      if (namespace !== "seed-bible") {
        return Promise.reject(new Error(`Unknown namespace: ${namespace}`));
      }
      const loader = localeLoaderByLanguage[language];
      if (!loader) {
        return Promise.reject(
          new Error(`No locale file for language: ${language}`)
        );
      }
      return loader().then((mod) => mod.default);
    })
  );

  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    // Consult the backend for languages beyond the bundled English fallback,
    // matching I18nManager's production configuration.
    partialBundledLanguages: true,
    resources: {
      en: {
        "seed-bible": en,
      },
    },
    interpolation: {
      escapeValue: false,
    },
    initAsync: false,
    ns: ["seed-bible"],
  });
}

// Every state built here attaches to the one `window` the whole test file
// shares: history listeners, and wrappers around `pushState`/`replaceState`.
// The app builds a single state per page load and never has to undo that, but a
// test file builds dozens. Left attached, each past state keeps reacting to the
// URL and writing its own stale reading position back into it — so a later test
// navigating to Exodus 2 gets quietly dragged back to whichever chapter an
// earlier test was parked on. Tearing them down between tests keeps each test
// alone with the URL.
const liveTestStates: SeedBibleState[] = [];

// Registered at import time, which scopes it to the importing test file — every
// file using this helper gets the cleanup without opting in.
if (typeof afterEach === "function") {
  afterEach(() => {
    // Newest first: each manager wraps the history methods of the one before
    // it, and a manager only restores its wrapper while it is the outermost
    // layer. LIFO unwinds the stack exactly; creation order would strand the
    // older manager's (inert) wrapper underneath whenever a test builds two.
    for (const state of liveTestStates.splice(0).reverse()) {
      state.navigation.dispose();
    }
    // The reading position lives in the URL path, so it outlives the listeners
    // that wrote it: without this the next test starts on whatever chapter —
    // and in whatever translation — this one finished on. Root-relative, so it
    // stays on the current origin (tests move jsdom between origins, and a
    // cross-origin `replaceState` is a SecurityError).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
  });
}

export async function createTestSeedBibleState(
  options: CreateTestSeedBibleStateOptions = {}
): Promise<SeedBibleState> {
  const { responses = createDefaultManagerResponseMap(), timeoutMs = 1000 } =
    options;

  installFreeUseBibleApiMock(globalThis as TestGlobalScope, responses);
  await ensureI18nInitialized();

  // Pin Today's initial state before the state is built: `TodayManager` latches
  // it from `initialUrl` at construction, so it cannot be set afterwards. Keeps
  // whatever path the caller already navigated to.
  if (typeof window !== "undefined" && options.todayOpen !== "fromUrl") {
    const url = new URL(window.location.href);
    url.searchParams.set("today", options.todayOpen ? "open" : "closed");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const { createSeedBibleState } =
    await import("@packages/seed-bible/seed-bible/managers/SeedBibleStateManager");
  const state = createSeedBibleState({
    offlineStore: options.offlineStore,
    config: options.config,
  });
  // Before anything can sign in: the resume effect fires the moment a session
  // key lands, and it is the path that would otherwise open a socket.
  installSharedDocumentMock(state);
  liveTestStates.push(state);
  // Mirrors the real app's post-mount effect (see `MainBody` in
  // `app/main.tsx`) that applies the device's real saved local config —
  // `login.localConfig` itself seeds empty to match SSR. This helper
  // represents a fully-loaded app for test purposes, so it should reflect
  // that step too, the same way it already waits for tabs to load below.
  state.login.hydrateLocalConfig();
  // Mirrors the same post-mount sequence's other one-time correction: saved
  // tabs/layout/catalog/selector-mode/tutorial-and-onboarding flags all seed
  // to match SSR and only become real once this runs. Without it, anything
  // gated behind `tutorial.armAutoStart()` (called from here) never arms.
  state.app.hydrateFromStorage();
  // Tabs first: awaiting anything else here would let asynchronously-created
  // tabs (e.g. an auto-joined shared session) appear before this runs, and those
  // tabs' reading states are mocked without a `loading` signal.
  await waitForTabsToLoad(state, timeoutMs);
  await state.bibleData.offline.ready;

  return state;
}
