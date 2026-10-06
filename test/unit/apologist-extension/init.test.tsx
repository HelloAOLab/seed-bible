import { render } from "preact";
import { act } from "preact/test-utils";
import type { Mock } from "vitest";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { signal, type Signal } from "@preact/signals";
import type {
  ChatContext,
  ChatProvider,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import {
  createDiscoverManager,
  type DiscoverProvider,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { SensitiveSettingsError } from "@packages/seed-bible/seed-bible/managers/ExtensionSensitiveSettings";
import { ExtensionMetaSchema } from "../../../script/lib/extension";
import apologistManifest from "@packages/apologist-extension/extension.json";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager, mockI18nState } =
    await import("../seed-bible/testUtils/mockI18n");
  const mocked = await mockI18nManager();
  const actualI18n = (
    mocked as {
      i18n: typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager").i18n;
    }
  ).i18n;
  return {
    ...mocked,
    // Chat sends the app language, which the uninitialized i18next instance
    // doesn't have outside the app.
    i18n: {
      t: actualI18n.t.bind(actualI18n),
      changeLanguage: actualI18n.changeLanguage.bind(actualI18n),
      get language() {
        return mockI18nState.language;
      },
    },
  };
});

const { default: initApologistExtension } =
  await import("@packages/apologist-extension/ext_Apologist/main/init");

/**
 * Stands in for `ExtensionSettingsManager.fetchWithSensitiveValues`, the
 * CasualOS proxy boundary. By default the viewer has saved nothing.
 */
function noSavedProxy(): Promise<Response> {
  return Promise.reject(
    new SensitiveSettingsError("not_set", "No sensitive values are set.")
  );
}

/**
 * The viewer's saved (non-sensitive) Apologist settings. A signal, like the
 * real `ExtensionSettingsManager`, so a test can change a setting after the
 * extension has started, the way loading or editing it would.
 */
type SavedSettings = Signal<Record<string, unknown>>;

/**
 * Mirrors `ChatsManager.registerProvider`: registering an id that's already
 * there swaps the provider in place, and only the current provider's
 * unregister takes the agent out of open chats (recorded here).
 */
function createFakeChats() {
  const providers = signal<ChatProvider[]>([]);
  const removedFromChats: string[] = [];
  return {
    providers,
    removedFromChats,
    registerProvider(provider: ChatProvider) {
      providers.value = [
        ...providers.value.filter((p) => p.id !== provider.id),
        provider,
      ];
      return () => {
        if (!providers.value.includes(provider)) {
          return;
        }
        removedFromChats.push(provider.id);
        providers.value = providers.value.filter((p) => p !== provider);
      };
    },
  };
}

/**
 * Like `ExtensionSettingsManager.getValue`, a setting the viewer hasn't saved
 * falls back to the active Customization's default, then the manifest's.
 */
function createFakeContext(
  search: string,
  fetchWithSensitiveValues: Mock = vi.fn(noSavedProxy),
  savedSettings: SavedSettings = signal({}),
  customizationDefaults: Record<string, unknown> = {}
): SeedBibleState {
  const manifestSettings: Record<string, { default?: unknown }> =
    apologistManifest.settings;
  return {
    extensionSettings: {
      fetchWithSensitiveValues,
      getValue: (extensionId: string, key: string) =>
        extensionId === "ext_Apologist"
          ? (savedSettings.value[key] ??
            customizationDefaults[key] ??
            manifestSettings[key]?.default)
          : undefined,
    },
    navigation: {
      currentUrl: { value: new URL(`https://seedbible.org/${search}`) },
    },
    chats: createFakeChats(),
    discover: createDiscoverManager(),
    modals: { openModal: vi.fn() },
    // No reader tab open, so chat falls back to Apologist's default Bible.
    app: { selectedTab: signal(null) },
    bibleData: {
      availableTranslations: signal([]),
      getCachedTranslationBooks: vi.fn(() => ({
        books: [
          { id: "JHN", name: "John" },
          { id: "EXO", name: "Éxodo" },
        ],
      })),
    },
  } as unknown as SeedBibleState;
}

function findChatProvider(context: SeedBibleState): ChatProvider {
  const provider = context.chats.providers.value.find(
    (p) => p.id === "apologist-chat-provider"
  );
  if (!provider) {
    throw new Error("The Apologist chat provider isn't registered.");
  }
  return provider;
}

/** Sends one chat message and returns the agent's streamed reply. */
async function sendChatMessage(context: SeedBibleState): Promise<string> {
  const response = await findChatProvider(context).generateResponse({
    instructions: "Reading John 3",
    messages: [],
    participants: [],
  } as unknown as ChatContext);
  let text = "";
  for await (const message of response as AsyncIterable<{
    text: AsyncIterable<string>;
  }>) {
    for await (const chunk of message.text) {
      text += chunk;
    }
  }
  return text;
}

function removedFromChats(context: SeedBibleState): string[] {
  return (context.chats as unknown as ReturnType<typeof createFakeChats>)
    .removedFromChats;
}

function findDiscoverProvider(
  context: SeedBibleState
): DiscoverProvider | undefined {
  return context.discover.providers.value.find(
    (provider) => provider.id === "apologist-discover-provider"
  );
}

const discoverContext = {
  translationId: "BSB",
  book: "JHN",
  chapter: 3,
  language: "en",
};

describe("initApologistExtension discover provider", () => {
  let fetchMock: Mock;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    unregisterExtension("ext_Apologist");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Discover is off unless turned on, so these tests start from a
  // Customization that turns it on.
  function install(
    search: string,
    fetchWithSensitiveValues?: Mock,
    savedSettings?: SavedSettings,
    customizationDefaults: Record<string, unknown> = { discoverEnabled: true }
  ): SeedBibleState {
    const context = createFakeContext(
      search,
      fetchWithSensitiveValues,
      savedSettings,
      customizationDefaults
    );
    setupExtensionContext(context);
    initApologistExtension();
    return context;
  }

  function findRegisteredChatProvider(
    context: SeedBibleState
  ): ChatProvider | undefined {
    return context.chats.providers.value.find(
      (p) => p.id === "apologist-chat-provider"
    );
  }

  describe("turning chat and Discover on and off", () => {
    it("offers the chat agent and leaves Discover off by default", () => {
      const context = install("?apologistTeamID=42", undefined, undefined, {});

      expect(findRegisteredChatProvider(context)).toBeDefined();
      expect(findDiscoverProvider(context)).toBeUndefined();
    });

    it("shows the team's content once Discover is turned on", async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );
      const saved = signal<Record<string, unknown>>({});
      const context = install("?apologistTeamID=42", undefined, saved, {});

      saved.value = { discoverEnabled: true };
      await findDiscoverProvider(context)!.discover(discoverContext);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      saved.value = { discoverEnabled: false };
      expect(findDiscoverProvider(context)).toBeUndefined();
    });

    it("keeps Discover off without a team, even when turned on", () => {
      const context = install(
        "",
        undefined,
        signal({ discoverEnabled: true }),
        {}
      );
      expect(findDiscoverProvider(context)).toBeUndefined();
    });

    it("removes the agent from chats when chat is turned off, and brings it back when turned on", () => {
      const saved = signal<Record<string, unknown>>({});
      const context = install("", undefined, saved, {});

      saved.value = { chatEnabled: false };
      expect(findRegisteredChatProvider(context)).toBeUndefined();
      expect(removedFromChats(context)).toEqual(["apologist-chat-provider"]);

      saved.value = { chatEnabled: true };
      expect(findRegisteredChatProvider(context)).toBeDefined();
    });

    it("doesn't offer the agent when chat starts out turned off, and still shows Discover content", () => {
      const context = install(
        "?apologistTeamID=42",
        undefined,
        signal({ chatEnabled: false, discoverEnabled: true }),
        {}
      );

      expect(findRegisteredChatProvider(context)).toBeUndefined();
      expect(findDiscoverProvider(context)).toBeDefined();
    });

    it("leaves nothing registered after uninstalling with chat turned off", () => {
      const context = install(
        "",
        undefined,
        signal({ chatEnabled: false }),
        {}
      );

      unregisterExtension("ext_Apologist");

      expect(findRegisteredChatProvider(context)).toBeUndefined();
      expect(removedFromChats(context)).toEqual([]);
    });
  });

  it("does not register a discover provider without an apologistTeamID", () => {
    const context = install("?apologistApiKey=apg_key");
    expect(findDiscoverProvider(context)).toBeUndefined();
  });

  it("does not register a discover provider when apologistTeamID isn't an integer", () => {
    const context = install("?apologistTeamID=team-42&apologistApiKey=apg_key");
    expect(findDiscoverProvider(context)).toBeUndefined();
  });

  describe("name, model and content author from settings", () => {
    const chatReply = () =>
      new Response(
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n',
        { status: 200 }
      );

    function sentModels(): unknown[] {
      return fetchMock.mock.calls
        .filter(([url]) => String(url).endsWith("/chat/completions"))
        .map(([, init]) => JSON.parse(init.body).model);
    }

    it("names the chat agent and its Discover source after the saved name", () => {
      const context = install(
        "?apologistTeamID=42",
        undefined,
        signal({ name: "Ask Pastor Bot" })
      );

      expect(findChatProvider(context).name).toBe("Ask Pastor Bot");
      expect(findDiscoverProvider(context)!.title).toBe("Ask Pastor Bot");
    });

    it("prefers the name in the link, and treats a blank saved name as unset", () => {
      const fromLink = install(
        "?apologistName=Link%20Bot",
        undefined,
        signal({ name: "Saved Bot" })
      );
      expect(findChatProvider(fromLink).name).toBe("Link Bot");
      unregisterExtension("ext_Apologist");

      const blank = install("", undefined, signal({ name: "   " }));
      expect(findChatProvider(blank).name).toEqual({
        key: "title",
        defaultValue: "Apologist",
        ns: "ext_Apologist",
      });
    });

    it("renames the agent in place when the saved name changes, without removing it from chats", () => {
      const saved = signal<Record<string, unknown>>({});
      const context = install("", undefined, saved);

      saved.value = { name: "Ask Pastor Bot" };

      expect(findChatProvider(context).name).toBe("Ask Pastor Bot");
      expect(context.chats.providers.value).toHaveLength(1);
      expect(removedFromChats(context)).toEqual([]);

      unregisterExtension("ext_Apologist");
      expect(removedFromChats(context)).toEqual(["apologist-chat-provider"]);
    });

    it("sends the saved model, the link's model over it, and the default with neither", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(chatReply()));

      await sendChatMessage(
        install("", undefined, signal({ model: "anthropic/claude" }))
      );
      unregisterExtension("ext_Apologist");
      await sendChatMessage(
        install(
          "?apologistModel=openai/gpt/5.4-nano",
          undefined,
          signal({ model: "anthropic/claude" })
        )
      );
      unregisterExtension("ext_Apologist");
      await sendChatMessage(install("", undefined, signal({ model: "" })));

      expect(sentModels()).toEqual([
        "anthropic/claude",
        "openai/gpt/5.4-nano",
        "openai/gpt/5-mini",
      ]);
    });

    it("uses a newly saved model on the next message", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(chatReply()));
      const saved = signal<Record<string, unknown>>({});
      const context = install("", undefined, saved);

      await sendChatMessage(context);
      saved.value = { model: "anthropic/claude" };
      await sendChatMessage(context);

      expect(sentModels()).toEqual(["openai/gpt/5-mini", "anthropic/claude"]);
    });

    it("regroups the open chapter's results when the saved content author changes", async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              results: [{ id: 1, title: "One", url: "https://a.org/1" }],
            }),
            { status: 200 }
          )
        )
      );
      const saved = signal<Record<string, unknown>>({ teamId: 160 });
      const context = install("", undefined, saved);

      async function authors(): Promise<unknown[]> {
        const found: unknown[] = [];
        for await (const { results } of context.discover.discover(
          discoverContext
        )) {
          found.push(
            ...results.map((r) => (r.type === "content" ? r.author : null))
          );
        }
        return found;
      }

      expect(await authors()).toEqual(["a.org"]);
      saved.value = { teamId: 160, contentAuthor: "Reflection Ministries" };
      expect(await authors()).toEqual(["Reflection Ministries"]);
    });
  });

  describe("team ID from settings", () => {
    const emptySearch = () =>
      new Response(JSON.stringify({ results: [] }), { status: 200 });

    function searchedTeamIds(): unknown[] {
      return fetchMock.mock.calls.map(
        ([, init]) => JSON.parse(init.body).filters.team_ids[0]
      );
    }

    it("searches the team saved in settings when the link has none", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(emptySearch()));
      const context = install("", undefined, signal({ teamId: 160 }));

      await findDiscoverProvider(context)!.discover(discoverContext);

      expect(searchedTeamIds()).toEqual([160]);
    });

    it("prefers the team ID in the link over the saved one", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(emptySearch()));
      const context = install(
        "?apologistTeamID=42",
        undefined,
        signal({ teamId: 160 })
      );

      await findDiscoverProvider(context)!.discover(discoverContext);

      expect(searchedTeamIds()).toEqual([42]);
    });

    it("uses the saved team when the link's team ID isn't an integer", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(emptySearch()));
      const context = install(
        "?apologistTeamID=team-42",
        undefined,
        signal({ teamId: 160 })
      );

      await findDiscoverProvider(context)!.discover(discoverContext);

      expect(searchedTeamIds()).toEqual([160]);
    });

    it("adds, switches and removes the Discover source as the saved team ID changes", async () => {
      fetchMock.mockImplementation(() => Promise.resolve(emptySearch()));
      const saved = signal<Record<string, unknown>>({});
      const context = install("", undefined, saved);
      expect(findDiscoverProvider(context)).toBeUndefined();

      // Settings finish loading after sign-in.
      saved.value = { teamId: 160 };
      const firstLookup = context.discover.discover(discoverContext);
      await firstLookup[Symbol.asyncIterator]().next();

      // The viewer changes the team; the open chapter is searched again
      // rather than served from the old team's cached results.
      saved.value = { teamId: 7 };
      for await (const _ of context.discover.discover(discoverContext)) {
        // drain
      }

      expect(searchedTeamIds()).toEqual([160, 7]);

      saved.value = {};
      expect(findDiscoverProvider(context)).toBeUndefined();
    });

    it("ignores a saved team ID that isn't a positive whole number", () => {
      for (const teamId of [4.5, 0, -3, "160"]) {
        const context = install("", undefined, signal({ teamId }));
        expect(findDiscoverProvider(context)).toBeUndefined();
        unregisterExtension("ext_Apologist");
      }
    });

    it("removes the Discover source when the extension is uninstalled", () => {
      const context = install("", undefined, signal({ teamId: 160 }));
      expect(findDiscoverProvider(context)).toBeDefined();

      unregisterExtension("ext_Apologist");

      expect(findDiscoverProvider(context)).toBeUndefined();
    });
  });

  it("searches the team's content for the current chapter", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 7,
              type: "youtube",
              title: "Born Again",
              description: "What Jesus told Nicodemus",
              url: "https://youtu.be/abc123",
              image: "https://example.com/thumb.jpg",
            },
            { id: 8, type: "article", description: "No title or url" },
          ],
        }),
        { status: 200 }
      )
    );
    const context = install(
      "?apologistTeamID=42&apologistApiKey=apg_key&apologistDomain=my.gospel.bot"
    );
    const provider = findDiscoverProvider(context);
    expect(provider).toBeDefined();

    const results = await provider!.discover(discoverContext);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://my.gospel.bot/api/v1/search");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "x-api-key": "apg_key",
    });
    expect(JSON.parse(init.body)).toEqual({
      query: "John 3",
      limit: 20,
      filters: {
        team_ids: [42],
        model: "source",
        types: ["article", "youtube", "episode", "media", "url"],
      },
    });

    expect(results).toEqual([
      expect.objectContaining({
        type: "content",
        title: "Born Again",
        description: "What Jesus told Nicodemus",
        image: "https://example.com/thumb.jpg",
        author: "youtu.be",
        reference: { book: "JHN", chapter: 3 },
      }),
    ]);

    const result = results[0]!;
    if (result.type !== "content") throw new Error("expected content");
    act(() => result.onClick?.());
    const modal = (context.modals.openModal as Mock).mock.calls[0]![0];
    act(() => {
      render(modal.content(), container);
    });
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  async function discoverContent(
    items: Record<string, unknown>[],
    options: {
      search?: string;
      book?: string;
      saved?: Record<string, unknown>;
    } = {}
  ) {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ results: items }), { status: 200 })
    );
    const context = install(
      options.search ?? "?apologistTeamID=42",
      undefined,
      signal(options.saved ?? {})
    );
    const results = await findDiscoverProvider(context)!.discover({
      ...discoverContext,
      book: options.book ?? discoverContext.book,
    });
    return results.flatMap((r) => (r.type === "content" ? [r] : []));
  }

  async function discoverTitles(
    items: Record<string, unknown>[],
    options?: { book?: string }
  ): Promise<string[]> {
    const results = await discoverContent(items, options);
    return results.map((r) => r.title);
  }

  it("uses referral_url, listing_url and Name when url or title are missing", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: "a",
              Name: "Referral Only",
              referral_url: "https://www.ligonier.org/learn/born-again",
              image_url: "https://example.com/a.jpg",
              summary: "A summary",
            },
            {
              id: "b",
              title: "Listing Only",
              listing_url: "https://tabletalkmagazine.com/b",
            },
          ],
        }),
        { status: 200 }
      )
    );
    const context = install("?apologistTeamID=42");

    const results =
      await findDiscoverProvider(context)!.discover(discoverContext);

    expect(results).toEqual([
      expect.objectContaining({
        title: "Referral Only",
        description: "A summary",
        image: "https://example.com/a.jpg",
        author: "ligonier.org",
      }),
      expect.objectContaining({
        title: "Listing Only",
        author: "tabletalkmagazine.com",
      }),
    ]);
  });

  it("drops results whose title is about a different chapter of the same book", async () => {
    const titles = await discoverTitles([
      { id: 1, title: "John 4: The Woman at the Well", url: "https://a.org/1" },
      { id: 2, title: "John 1–4 Overview", url: "https://a.org/2" },
      { id: 3, title: "1 John 4: God Is Love", url: "https://a.org/3" },
      { id: 4, title: "John 3:16 Explained", url: "https://a.org/4" },
      { id: 5, title: "Born of Water and Spirit", url: "https://a.org/5" },
    ]);

    expect(titles).toEqual([
      "John 1–4 Overview",
      "John 3:16 Explained",
      "1 John 4: God Is Love",
      "Born of Water and Spirit",
    ]);
  });

  it("puts results that mention the chapter first and keeps the API's order otherwise", async () => {
    const titles = await discoverTitles([
      { id: 1, title: "Grace", url: "https://a.org/1" },
      {
        id: 2,
        title: "Nicodemus",
        description: "A study of John 3",
        url: "https://a.org/2",
      },
      { id: 3, title: "Faith", url: "https://a.org/3" },
    ]);

    expect(titles).toEqual(["Nicodemus", "Grace", "Faith"]);
  });

  it("matches chapters of book names that start with an accented letter", async () => {
    const titles = await discoverTitles(
      [
        { id: 1, title: "La pascua", url: "https://a.org/1" },
        { id: 2, title: "Éxodo 4: Moisés vuelve", url: "https://a.org/2" },
        {
          id: 3,
          title: "La zarza ardiente",
          description: "Un estudio de Éxodo 3",
          url: "https://a.org/3",
        },
      ],
      { book: "EXO" }
    );

    expect(fetchMock.mock.calls[0]![1].body).toContain('"query":"Éxodo 3"');
    expect(titles).toEqual(["La zarza ardiente", "La pascua"]);
  });

  it("puts a result first when its description names a range covering the chapter", async () => {
    const titles = await discoverTitles([
      { id: 1, title: "Grace", url: "https://a.org/1" },
      {
        id: 2,
        title: "The Gospel's Opening",
        description: "Walks through John 1-4",
        url: "https://a.org/2",
      },
      {
        id: 3,
        title: "Later Signs",
        description: "Walks through John 5-7",
        url: "https://a.org/3",
      },
    ]);

    expect(titles).toEqual(["The Gospel's Opening", "Grace", "Later Signs"]);
  });

  it("groups results by website, then the result's own author, then the agent's name", async () => {
    const results = await discoverContent(
      [
        {
          id: 1,
          title: "Website And Author",
          author: "R.C. Sproul",
          url: "https://www.ligonier.org/1",
        },
        {
          id: 2,
          title: "Author Only",
          author: "R.C. Sproul",
          url: "not a web address",
        },
        { id: 3, title: "Neither", url: "also not a web address" },
      ],
      { search: "?apologistTeamID=42&apologistName=Team%20Agent" }
    );

    expect(results.map((r) => [r.title, r.author])).toEqual([
      ["Website And Author", "ligonier.org"],
      ["Author Only", "R.C. Sproul"],
      ["Neither", "Team Agent"],
    ]);
  });

  it("groups every result under the saved content author", async () => {
    const results = await discoverContent(
      [
        {
          id: 1,
          title: "One",
          author: "R.C. Sproul",
          url: "https://www.ligonier.org/1",
        },
        { id: 2, title: "Two", url: "https://tabletalkmagazine.com/2" },
      ],
      { saved: { contentAuthor: "  Reflection Ministries  " } }
    );

    expect(results.map((r) => r.author)).toEqual([
      "Reflection Ministries",
      "Reflection Ministries",
    ]);
  });

  it("removes repeated results by id or by title", async () => {
    const titles = await discoverTitles([
      { id: 1, title: "Born Again", url: "https://a.org/1" },
      { id: 1, title: "Born Again (copy)", url: "https://a.org/1" },
      { id: 2, title: "  born   AGAIN ", url: "https://b.org/2" },
      { id: 3, title: "Eternal Life", url: "https://a.org/3" },
    ]);

    expect(titles).toEqual(["Born Again", "Eternal Life"]);
  });

  describe("with an API key saved in settings", () => {
    const searchResponse = () =>
      new Response(
        JSON.stringify({
          results: [{ id: 1, title: "Born Again", url: "https://a.org/1" }],
        }),
        { status: 200 }
      );

    it("sends the search through the viewer's proxy instead of a regular request", async () => {
      const proxyFetch = vi.fn(() => Promise.resolve(searchResponse()));
      const context = install(
        "?apologistTeamID=42&apologistApiKey=url_key&apologistDomain=other.bot",
        proxyFetch
      );

      const results =
        await findDiscoverProvider(context)!.discover(discoverContext);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(proxyFetch).toHaveBeenCalledWith("ext_Apologist", {
        url: "https://apologist.seedbible.io/api/v1/search",
        method: "POST",
        body: {
          query: "John 3",
          limit: 20,
          filters: {
            team_ids: [42],
            model: "source",
            types: ["article", "youtube", "episode", "media", "url"],
          },
        },
      });
      expect(results.map((r) => r.type === "content" && r.title)).toEqual([
        "Born Again",
      ]);
    });

    it("retries a rejected Bible translation through the proxy too", async () => {
      const proxyFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response('Unknown bible "esv"', { status: 400 })
        )
        .mockResolvedValueOnce(
          new Response(
            'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n',
            { status: 200 }
          )
        );
      const context = install("", proxyFetch);
      (context.app.selectedTab as Signal<unknown>).value = {
        readingState: {
          translation: signal({
            id: "ENG_ESV",
            shortName: "ESV",
            language: "eng",
          }),
          translationId: signal("ENG_ESV"),
          bookId: signal("JHN"),
          chapterNumber: signal(3),
        },
      };

      const reply = await sendChatMessage(context);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        proxyFetch.mock.calls.map(
          ([, request]) =>
            (request as { body: { metadata: { bible: string } } }).body.metadata
              .bible
        )
      ).toEqual(["esv", "bsb"]);
      expect(reply).toBe("Hi");
    });

    it("streams chat replies through the viewer's proxy", async () => {
      const proxyFetch = vi.fn(() =>
        Promise.resolve(
          new Response(
            'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n',
            { status: 200 }
          )
        )
      );
      const context = install("", proxyFetch);

      const reply = await sendChatMessage(context);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(proxyFetch).toHaveBeenCalledWith(
        "ext_Apologist",
        expect.objectContaining({
          url: "https://apologist.seedbible.io/api/v1/chat/completions",
          method: "POST",
        })
      );
      expect(reply).toBe("Hello");
    });

    it("fails the lookup when the proxy request fails, without retrying it as a regular request", async () => {
      const proxyFetch = vi.fn(() =>
        Promise.reject(
          new SensitiveSettingsError("request_failed", "server_error: boom")
        )
      );
      const context = install("?apologistTeamID=42", proxyFetch);

      await expect(
        findDiscoverProvider(context)!.discover(discoverContext)
      ).rejects.toThrow("server_error: boom");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("declares a valid sensitive setting that sends the API key as x-api-key", () => {
    const result = ExtensionMetaSchema.safeParse(apologistManifest);

    expect(result.error?.issues).toBeUndefined();
    expect(result.data?.sensitive?.apologist).toEqual({
      host: "apologist.seedbible.io",
      requestMapping: { "headers.x-api-key": "apiKey" },
    });
  });

  it("sends the API key from the link as x-api-key on regular chat requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n',
        { status: 200 }
      )
    );
    const context = install("?apologistApiKey=url_key");

    await sendChatMessage(context);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://apologist.seedbible.io/api/v1/chat/completions");
    expect(init.headers).toEqual({ "x-api-key": "url_key" });
  });

  it.each(["not_set", "signed_out", "not_loaded"] as const)(
    "makes a regular request to the configured domain when the proxy reports %s",
    async (code) => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      );
      const proxyFetch = vi.fn(() =>
        Promise.reject(new SensitiveSettingsError(code, code))
      );
      const context = install(
        "?apologistTeamID=42&apologistApiKey=url_key&apologistDomain=my.gospel.bot",
        proxyFetch
      );

      await findDiscoverProvider(context)!.discover(discoverContext);

      expect(proxyFetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://my.gospel.bot/api/v1/search");
      expect(init.headers).toEqual({
        "Content-Type": "application/json",
        "x-api-key": "url_key",
      });
    }
  );

  it("searches the default Apologist domain when none is configured", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    const context = install("?apologistTeamID=42");

    await findDiscoverProvider(context)!.discover(discoverContext);

    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://apologist.seedbible.io/api/v1/search"
    );
  });

  it("fails the lookup when the search request is rejected", async () => {
    fetchMock.mockResolvedValue(new Response("bad key", { status: 401 }));
    const context = install("?apologistTeamID=42&apologistApiKey=apg_bad");

    await expect(
      findDiscoverProvider(context)!.discover(discoverContext)
    ).rejects.toThrow("Apologist search request failed (401): bad key");
  });

  it("returns nothing when the team has no matching content", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    const context = install("?apologistTeamID=42&apologistApiKey=apg_key");

    await expect(
      findDiscoverProvider(context)!.discover(discoverContext)
    ).resolves.toEqual([]);
  });
});
