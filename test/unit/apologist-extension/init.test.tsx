import { render } from "preact";
import { act } from "preact/test-utils";
import type { Mock } from "vitest";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { DiscoverProvider } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { default: initApologistExtension } =
  await import("@packages/apologist-extension/ext_Apologist/main/init");

function createFakeContext(search: string): SeedBibleState {
  return {
    navigation: {
      currentUrl: { value: new URL(`https://seedbible.org/${search}`) },
    },
    chats: { registerProvider: vi.fn(() => () => undefined) },
    discover: { registerDiscoverProvider: vi.fn(() => () => undefined) },
    modals: { openModal: vi.fn() },
    bibleData: {
      getCachedTranslationBooks: vi.fn(() => ({
        books: [
          { id: "JHN", name: "John" },
          { id: "EXO", name: "Éxodo" },
        ],
      })),
    },
  } as unknown as SeedBibleState;
}

function findDiscoverProvider(
  context: SeedBibleState
): DiscoverProvider | undefined {
  const register = context.discover.registerDiscoverProvider as Mock;
  return register.mock.calls.find(
    ([provider]) => provider.id === "apologist-discover-provider"
  )?.[0];
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

  function install(search: string): SeedBibleState {
    const context = createFakeContext(search);
    setupExtensionContext(context);
    initApologistExtension();
    return context;
  }

  it("does not register a discover provider without an apologistTeamID", () => {
    const context = install("?apologistApiKey=apg_key");
    expect(findDiscoverProvider(context)).toBeUndefined();
  });

  it("does not register a discover provider when apologistTeamID isn't an integer", () => {
    const context = install("?apologistTeamID=team-42&apologistApiKey=apg_key");
    expect(findDiscoverProvider(context)).toBeUndefined();
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
    options: { search?: string; book?: string } = {}
  ) {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ results: items }), { status: 200 })
    );
    const context = install(options.search ?? "?apologistTeamID=42");
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

  it("prefers a result's own author over its website, and falls back to the agent's name", async () => {
    const results = await discoverContent(
      [
        {
          id: 1,
          title: "With Author",
          author: "R.C. Sproul",
          url: "https://www.ligonier.org/1",
        },
        { id: 2, title: "Unreadable Link", url: "not a web address" },
      ],
      { search: "?apologistTeamID=42&apologistName=Team%20Agent" }
    );

    expect(results.map((r) => [r.title, r.author])).toEqual([
      ["With Author", "R.C. Sproul"],
      ["Unreadable Link", "Team Agent"],
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
