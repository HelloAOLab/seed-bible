import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import i18n from "i18next";
import {
  createExampleManagerResponseMap,
  type WebResponseMap,
} from "../managers/testUtils/mockBibleApiData";

type TestGlobalScope = typeof globalThis & {
  thisBot?: {
    tags: Record<string, unknown>;
  };
  web?: {
    get?: (url: string) => Promise<unknown>;
  };
  configBot?: {
    tags: Record<string, unknown>;
  };
  os?: Record<string, unknown>;
};

export interface CreateTestSeedBibleStateOptions {
  responses?: WebResponseMap;
  configTags?: Record<string, unknown>;
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
    vi.runAllTimers();
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

function ensureGlobalRuntime(
  configTags: Record<string, unknown> | undefined
): TestGlobalScope {
  const scope = globalThis as TestGlobalScope;

  // Reset any existing bot-related properties to ensure a clean test environment
  scope.thisBot = {
    tags: {},
  };
  scope.configBot = {
    tags: {
      ...(configTags ?? {}),
    },
  };

  const existingOs = (scope.os ?? {}) as Record<string, unknown>;
  scope.os = {
    ...existingOs,
    addBotListener:
      typeof existingOs.addBotListener === "function"
        ? existingOs.addBotListener
        : () => undefined,
    syncConfigBotTagsToURL:
      typeof existingOs.syncConfigBotTagsToURL === "function"
        ? existingOs.syncConfigBotTagsToURL
        : () => undefined,
    requestAuthBotInBackground:
      typeof existingOs.requestAuthBotInBackground === "function"
        ? existingOs.requestAuthBotInBackground
        : async () => null,
  };

  return scope;
}

function installFreeUseBibleApiMock(
  scope: TestGlobalScope,
  responses: WebResponseMap
): void {
  scope.web = {
    ...(scope.web ?? {}),
    get: async (url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }

      return response;
    },
  };
}

async function ensureI18nInitialized(): Promise<void> {
  if (i18n.isInitialized) {
    return;
  }

  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: {
        "seed-bible": {},
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
  const {
    responses = createExampleManagerResponseMap(),
    configTags,
    timeoutMs = 1000,
  } = options;

  const scope = ensureGlobalRuntime(configTags);
  installFreeUseBibleApiMock(scope, responses);
  await ensureI18nInitialized();

  const { createSeedBibleState } =
    await import("@packages/seed-bible/seed-bible/managers/SeedBibleStateManager");
  const state = createSeedBibleState();
  await waitForTabsToLoad(state, timeoutMs);

  return state;
}
