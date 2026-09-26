import { signal, type Signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerBonfireChatProvider } from "@packages/bonfire-extension/ext_Bonfire/main/bonfire";
import type {
  ChatContext,
  ChatMessage,
  ChatProvider,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  ENG_KJV,
  FRA_LSG,
  type CatalogTranslation,
} from "../seed-bible/testUtils/catalogTranslations";

interface MockReadingState {
  translation: Signal<CatalogTranslation | null>;
  translationId: Signal<string | null>;
  bookId: Signal<string>;
  chapterNumber: Signal<number>;
}

function createReadingState(
  options: {
    translation?: CatalogTranslation | null;
    translationId?: string | null;
    bookId?: string;
    chapterNumber?: number;
  } = {}
): MockReadingState {
  return {
    translation: signal(options.translation ?? null),
    translationId: signal(options.translationId ?? null),
    bookId: signal(options.bookId ?? "GEN"),
    chapterNumber: signal(options.chapterNumber ?? 1),
  };
}

function textMessage(text: string): ChatMessage {
  return {
    type: "text",
    id: `message-${text}`,
    authors: ["user-1"],
    timeMs: 0,
    targets: true,
    text,
  };
}

/**
 * Registers the Bonfire provider against a minimal app state, joins a chat so
 * a Bonfire session exists, and returns a helper that sends one message and
 * reports the `custom_instructions` Bonfire received for it.
 */
async function setUpBonfireChat(options: {
  readingState: MockReadingState | null;
  language?: string;
  bibleData?: {
    catalogLoaded: Signal<boolean>;
    availableTranslations: Signal<
      Array<
        CatalogTranslation & {
          languageEnglishName?: string;
          numberOfBooks?: number;
        }
      >
    >;
    getTranslations: () => Promise<unknown>;
  };
}) {
  let provider: ChatProvider | null = null;
  const context = {
    app: {
      selectedTab: signal(
        options.readingState ? { readingState: options.readingState } : null
      ),
    },
    i18n: { language: signal(options.language ?? "en") },
    bibleData: options.bibleData,
    chats: {
      registerProvider: (registered: ChatProvider) => {
        provider = registered;
        return () => {};
      },
    },
  } as unknown as SeedBibleState;

  registerBonfireChatProvider(context, {
    orgId: "org-1",
    aiId: "ai-1",
    name: "Bonfire",
  }).next();

  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >((url) =>
    Promise.resolve(
      url.endsWith("/session/start")
        ? new Response(JSON.stringify({ session: { session_id: "session-1" } }))
        : new Response("", { status: 200 })
    )
  );
  vi.stubGlobal("fetch", fetchMock);

  const bonfire = provider as ChatProvider | null;
  if (!bonfire) {
    throw new Error("Bonfire did not register a chat provider.");
  }
  await bonfire.onJoinChat?.({
    chatId: "chat-1",
    messages: [],
    participants: [],
  });

  const sendMessage = async (text: string): Promise<string> => {
    await bonfire.generateResponse({
      chatId: "chat-1",
      messages: [textMessage(text)],
      participants: [],
    } as unknown as ChatContext);

    const chatCall = fetchMock.mock.calls.at(-1)!;
    expect(chatCall[0]).toBe(
      "https://bonfire.seedbible.io/api/v1/session/chat"
    );
    const body = JSON.parse(chatCall[1]!.body as string);
    return body.custom_instructions as string;
  };

  return { sendMessage };
}

// The tab is deliberately never on BSB: BSB is the default elsewhere in AI
// chat, so a hardcoded fallback would pass a BSB-based test without reading
// the tab.
describe("registerBonfireChatProvider custom instructions", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("names the active tab's translation and chapter", async () => {
    const { sendMessage } = await setUpBonfireChat({
      readingState: createReadingState({
        translation: ENG_KJV,
        translationId: "eng_kjv",
        bookId: "JHN",
        chapterNumber: 3,
      }),
    });

    const instructions = await sendMessage("What does this chapter mean?");

    expect(instructions).toContain("They are currently reading: JHN 3.");
    expect(instructions).toContain(
      "When quoting scripture for the user, use their active Bible translation which is King James (Authorized) Version (KJAV)."
    );
    expect(instructions).toContain(
      "prioritize replying in the language they are writing in"
    );
    expect(instructions).not.toContain("Reply in en");
    expect(instructions).not.toContain("BSB");
  });

  it("follows a translation change on the tab between messages", async () => {
    const readingState = createReadingState({
      translation: ENG_KJV,
      translationId: "eng_kjv",
    });
    const { sendMessage } = await setUpBonfireChat({ readingState });

    expect(await sendMessage("First question")).toContain(
      "When quoting scripture for the user, use their active Bible translation which is King James (Authorized) Version (KJAV)."
    );

    readingState.translation.value = FRA_LSG;
    readingState.translationId.value = "fra_lsg";

    const instructions = await sendMessage("Second question");
    expect(instructions).toContain(
      "When quoting scripture for the user, use their active Bible translation which is Louis Segond 1910 (LSG)."
    );
    expect(instructions).not.toContain("King James");
  });

  it("falls back to the translation id while the tab's translation is still loading", async () => {
    const { sendMessage } = await setUpBonfireChat({
      readingState: createReadingState({
        translation: null,
        translationId: "fra_lsg",
      }),
    });

    const instructions = await sendMessage("Hello");

    expect(instructions).toContain(
      "When quoting scripture for the user, use their active Bible translation which is fra_lsg (fra_lsg)."
    );
    expect(instructions).not.toContain("unknown");
  });

  it("still sends the message when there is no active reader tab", async () => {
    const { sendMessage } = await setUpBonfireChat({ readingState: null });

    const instructions = await sendMessage("Hello");

    expect(instructions).toContain(
      "When quoting scripture for the user, use their active Bible translation which is unknown ()."
    );
  });

  it("sends the UI language as a hyphenated locale", async () => {
    const { sendMessage } = await setUpBonfireChat({
      readingState: createReadingState({
        translation: ENG_KJV,
        translationId: "eng_kjv",
      }),
      language: "pt_BR",
    });

    const instructions = await sendMessage("Olá");

    expect(instructions).toContain("User has their UI language set to pt-BR,");
    expect(instructions).toContain("speaking to them in pt-BR");
    expect(instructions).not.toContain("pt_BR");
    expect(instructions).not.toContain("Reply in pt-BR");
  });

  it("lists translations the reader can open when the catalog loads", async () => {
    const getTranslations = vi.fn();
    const { sendMessage } = await setUpBonfireChat({
      readingState: createReadingState({
        translation: FRA_LSG,
        translationId: "fra_lsg",
      }),
      language: "fr",
      bibleData: {
        catalogLoaded: signal(true),
        availableTranslations: signal([
          {
            ...FRA_LSG,
            languageEnglishName: "French",
            numberOfBooks: 66,
          },
          {
            id: "fra_ncl",
            name: "Sainte Bible néo-Crampon Libre",
            englishName: "French néo-Crampon Libre",
            shortName: "NCL",
            language: "fra",
            languageEnglishName: "French",
            numberOfBooks: 66,
          },
        ]),
        getTranslations,
      },
    });

    const instructions = await sendMessage("Y a-t-il une Bible française ?");

    expect(getTranslations).not.toHaveBeenCalled();
    expect(instructions).toContain("Translations available in French:");
    expect(instructions).toContain("LSG (fra_lsg)");
    expect(instructions).toContain("NCL (fra_ncl)");
    expect(instructions).toContain(
      "Only recommend translations from this list."
    );
  });

  it("still sends the message when the catalog cannot be loaded", async () => {
    const { sendMessage } = await setUpBonfireChat({
      readingState: createReadingState({
        translation: ENG_KJV,
        translationId: "eng_kjv",
      }),
      bibleData: {
        catalogLoaded: signal(false),
        availableTranslations: signal([]),
        getTranslations: () => Promise.reject(new Error("offline")),
      },
    });

    const instructions = await sendMessage("Hello");

    expect(instructions).toContain(
      "When quoting scripture for the user, use their active Bible translation which is King James (Authorized) Version (KJAV)."
    );
    expect(instructions).not.toContain("Translations available");
    expect(console.warn).toHaveBeenCalled();
  });
});
