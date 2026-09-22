import { signal, type Signal } from "@preact/signals";
import type { Mock } from "vitest";
import type {
  ChatContext,
  ChatProvider,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { mockI18nState, resetMockI18n } from "../seed-bible/testUtils/mockI18n";
import {
  BSB,
  ENG_KJV,
  ENGWEBP,
  FRA_LSG,
  type CatalogTranslation,
} from "../seed-bible/testUtils/catalogTranslations";

// The extension reads the app language from the shared i18next instance;
// route it through the mutable stub so each test can pick a language.
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  const { mockI18nState } = await import("../seed-bible/testUtils/mockI18n");
  return {
    ...actual,
    i18n: {
      get language() {
        return mockI18nState.language;
      },
    },
  };
});

const { default: initApologistExtension } =
  await import("@packages/apologist-extension/ext_Apologist/main/init");

interface MockReadingState {
  translation: Signal<CatalogTranslation | null>;
  translationId: Signal<string | null>;
  bookId: Signal<string>;
  chapterNumber: Signal<number>;
}

function createReadingState(
  translation: CatalogTranslation | null,
  translationId: string | null = translation?.id ?? null
): MockReadingState {
  return {
    translation: signal(translation),
    translationId: signal(translationId),
    bookId: signal("JHN"),
    chapterNumber: signal(3),
  };
}

interface SentRequest {
  bible: string;
  language: string;
  developerMessage: string;
}

/**
 * Starts the Apologist extension against a minimal app state and returns a
 * helper that sends one chat message and reports what Apologist received.
 */
function setUpApologistChat(readingState: MockReadingState) {
  const context = {
    navigation: { currentUrl: signal(new URL("https://seedbible.test/")) },
    app: { selectedTab: signal({ readingState }) },
    bibleData: {
      availableTranslations: signal([BSB, ENG_KJV, ENGWEBP, FRA_LSG]),
    },
    chats: { registerProvider: vi.fn(() => () => {}) },
  } as unknown as SeedBibleState;

  setupExtensionContext(context);
  initApologistExtension();

  const provider = (context.chats.registerProvider as Mock).mock
    .calls[0]?.[0] as ChatProvider | undefined;
  if (!provider) {
    throw new Error("Apologist did not register a chat provider.");
  }

  // An immediately-finished stream is enough: these tests only inspect the
  // request, not the reply.
  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >(() =>
    Promise.resolve(
      new Response("data: [DONE]\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    )
  );
  vi.stubGlobal("fetch", fetchMock);

  const sendMessage = async (): Promise<SentRequest> => {
    const response = (await provider.generateResponse({
      chatId: "chat-1",
      messages: [],
      participants: [],
    } as unknown as ChatContext)) as AsyncIterable<unknown>;
    for await (const _message of response) {
      // Drain the provider so the request is sent.
    }

    const call = fetchMock.mock.calls.at(-1)!;
    expect(call[0]).toBe(
      "https://apologist.seedbible.io/api/v1/chat/completions"
    );
    const body = JSON.parse(call[1]!.body as string);
    const developer = body.messages.find(
      (m: { role: string }) => m.role === "developer"
    );
    return {
      bible: body.metadata.bible,
      language: body.metadata.language,
      developerMessage: developer.content,
    };
  };

  return { sendMessage };
}

// The tab is deliberately never on BSB unless BSB is the expected fallback:
// the request used to hardcode "bsb", so a BSB tab would pass without the code
// reading the tab at all.
describe("Apologist chat requests", () => {
  beforeEach(() => {
    resetMockI18n();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    unregisterExtension("ext_Apologist");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the active tab's translation as metadata.bible and names it in the prompt", async () => {
    const { sendMessage } = setUpApologistChat(createReadingState(ENG_KJV));

    const request = await sendMessage();

    expect(request.bible).toBe("kjv");
    expect(request.developerMessage).toContain("Currently reading: JHN 3");
    expect(request.developerMessage).toContain(
      "use their active Bible translation which is kjv."
    );
    expect(request.developerMessage).not.toContain("bsb");
  });

  it("follows a translation change on the tab between messages", async () => {
    const readingState = createReadingState(ENG_KJV);
    const { sendMessage } = setUpApologistChat(readingState);

    expect((await sendMessage()).bible).toBe("kjv");

    readingState.translation.value = ENGWEBP;
    readingState.translationId.value = ENGWEBP.id;

    expect((await sendMessage()).bible).toBe("webu");
  });

  it("looks up the tab's translation in the catalog while it is still loading", async () => {
    const { sendMessage } = setUpApologistChat(
      createReadingState(null, ENG_KJV.id)
    );

    expect((await sendMessage()).bible).toBe("kjv");
  });

  it("falls back to bsb when Apologist doesn't have the tab's translation", async () => {
    const { sendMessage } = setUpApologistChat(createReadingState(FRA_LSG));

    const request = await sendMessage();

    expect(request.bible).toBe("bsb");
    expect(request.developerMessage).toContain(
      "use their active Bible translation which is bsb."
    );
  });

  it("sends the app language as metadata.language and in the prompt", async () => {
    mockI18nState.language = "fr";
    const { sendMessage } = setUpApologistChat(createReadingState(ENG_KJV));

    const request = await sendMessage();

    expect(request.language).toBe("fr");
    expect(request.developerMessage).toContain(
      "User has their UI language set to fr,"
    );
  });
});
