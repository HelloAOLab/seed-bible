import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import i18n from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import en from "@packages/seed-bible/seed-bible/i18n/en.json";
import {
  createDefaultManagerResponseMap,
  type WebResponseMap,
} from "../managers/testUtils/mockBibleApiData";

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

export async function createTestSeedBibleState(
  options: CreateTestSeedBibleStateOptions = {}
): Promise<SeedBibleState> {
  const { responses = createDefaultManagerResponseMap(), timeoutMs = 1000 } =
    options;

  installFreeUseBibleApiMock(globalThis as TestGlobalScope, responses);
  await ensureI18nInitialized();

  const { createSeedBibleState } =
    await import("@packages/seed-bible/seed-bible/managers/SeedBibleStateManager");
  const state = createSeedBibleState();
  await waitForTabsToLoad(state, timeoutMs);

  return state;
}
