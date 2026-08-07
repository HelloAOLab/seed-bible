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

  const { createSeedBibleState } =
    await import("@packages/seed-bible/seed-bible/managers/SeedBibleStateManager");
  const state = createSeedBibleState({ offlineStore: options.offlineStore });
  liveTestStates.push(state);
  // Tabs first: awaiting anything else here would let asynchronously-created
  // tabs (e.g. an auto-joined shared session) appear before this runs, and those
  // tabs' reading states are mocked without a `loading` signal.
  await waitForTabsToLoad(state, timeoutMs);
  await state.bibleData.offline.ready;

  return state;
}
