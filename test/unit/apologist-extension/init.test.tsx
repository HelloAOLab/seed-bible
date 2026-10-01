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
        books: [{ id: "JHN", name: "John" }],
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
    const context = install("?apologistTeamID=team-42&apologistApiKey=apg_key");
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
      filters: {
        team_ids: ["team-42"],
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

  it("fails the lookup when the search request is rejected", async () => {
    fetchMock.mockResolvedValue(new Response("bad key", { status: 401 }));
    const context = install("?apologistTeamID=team-42&apologistApiKey=apg_bad");

    await expect(
      findDiscoverProvider(context)!.discover(discoverContext)
    ).rejects.toThrow("Apologist search request failed (401): bad key");
  });

  it("returns nothing when the team has no matching content", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );
    const context = install("?apologistTeamID=team-42&apologistApiKey=apg_key");

    await expect(
      findDiscoverProvider(context)!.discover(discoverContext)
    ).resolves.toEqual([]);
  });
});
