import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type {
  BibleToolContext,
  ManagedBibleVerseToolbarTool,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { TheographicPlaceEntry } from "@packages/theographic-extension/ext_theographic/provider";
import { waitFor } from "../seed-bible/testUtils/createTestSeedBibleState";

const { default: initLocationsExtension } =
  await import("@packages/locations-extension/ext_locations/init");
const { default: initTheographicExtension } =
  await import("@packages/theographic-extension/ext_theographic/init");

function place(
  id: string,
  name: string,
  verses: number[],
  position: { latitude?: number; longitude?: number } = {
    latitude: 31.9,
    longitude: 35.2,
  }
): TheographicPlaceEntry {
  return {
    id,
    name,
    apiLink: `/api/d/theographic/places/${id}.json`,
    verses,
    ...position,
  };
}

// Genesis 13 as the dataset has it, trimmed.
const GENESIS_13 = [
  place("egypt_362", "Egypt", [1, 10]),
  place("negeb_885", "Negeb", [1, 3]),
  place("ai_36", "Ai", [3]),
  place("bethel_202", "Bethel (of Palestine)", [3]),
  place("sodom_1107", "Sodom", [10, 12, 13]),
  // Neither in additionalGeoJSON.json nor placed by the dataset.
  place("hobah_1", "Hobah", [3], {}),
];
const GENESIS_14 = [place("shinar_1", "Shinar", [1])];

const ENDPOINT = "https://bible.example/";

function chapterUrl(book: string, chapter: number) {
  return `${ENDPOINT}api/d/theographic/${book}/${chapter}.json`;
}

function chapterResponse(places: TheographicPlaceEntry[]) {
  return new Response(
    JSON.stringify({ chapter: { number: 1, people: [], places, events: [] } }),
    { status: 200 }
  );
}

/** A verse whose text names no place in English, as in most translations. */
function selected(
  book: string,
  chapter: number,
  number: number
): BibleSelectedVerse {
  return {
    bookId: book,
    chapterNumber: chapter,
    translationId: "spa_rv1",
    verse: { type: "verse", number, content: ["Y subió de allí al sur."] },
  };
}

/** Lets a fetched response finish being read and applied. */
async function settle() {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

let originalFetch: typeof globalThis.fetch;
let responses: Map<string, () => Promise<Response>>;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  responses = new Map([
    [chapterUrl("GEN", 13), async () => chapterResponse(GENESIS_13)],
    [chapterUrl("GEN", 14), async () => chapterResponse(GENESIS_14)],
  ]);
  globalThis.fetch = vi.fn((url: string) => {
    const respond = responses.get(url);
    return respond
      ? respond()
      : Promise.resolve(new Response("", { status: 404 }));
  }) as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  unregisterExtension("ext_locations");
  unregisterExtension("theographic-extension");
});

function install() {
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  // Only the tool this extension registers: the app's own default tools each
  // read a different part of the toolbar's context.
  const registered = new Map<string, ManagedBibleVerseToolbarTool>();
  const tools = {
    registerVerseToolbarTool(tool: ManagedBibleVerseToolbarTool) {
      registered.set(tool.id, tool);
      return () => registered.delete(tool.id);
    },
  };
  const toolContext = {} as BibleToolContext;
  const openPane = vi.fn();
  const context = {
    discover: createDiscoverManager(),
    bibleData: { api: { endpoint: ENDPOINT } },
    app: {
      currentReadingState: signal({
        tab: { readingState: { selectedVerses } },
      }),
    },
    panes: { openPane },
    tools,
  } as unknown as SeedBibleState;

  setupExtensionContext(context);
  initTheographicExtension();
  initLocationsExtension();

  const tool = () => registered.get("show-locations")!;
  const items = () => tool().getItems?.(toolContext) ?? [];
  const placeName = ({ title }: ReturnType<typeof items>[number]) =>
    typeof title === "string" ? title : title.options?.place;

  return {
    openPane,
    hasTool: () => registered.has("show-locations"),
    select(verses: BibleSelectedVerse[]) {
      selectedVerses.value = verses;
    },
    isVisible: () => tool().isVisible?.(toolContext) === true,
    /** The places offered, by name. */
    offered: () => items().map(placeName),
    choose(name: string) {
      items()
        .find((item) => placeName(item) === name)!
        .onSelect?.(toolContext);
    },
  };
}

describe("the locations extension", () => {
  it("offers the places the selected verse mentions, whatever its language", async () => {
    const reader = install();

    reader.select([selected("GEN", 13, 3)]);
    await waitFor(() => reader.isVisible());

    expect(reader.offered()).toEqual(["Negeb", "Ai", "Bethel (of Palestine)"]);
  });

  it("lists a place once across several selected verses", async () => {
    const reader = install();

    reader.select([
      selected("GEN", 13, 1),
      selected("GEN", 13, 3),
      selected("GEN", 13, 10),
    ]);
    await waitFor(() => reader.isVisible());

    expect(reader.offered()).toEqual([
      "Egypt",
      "Negeb",
      "Ai",
      "Bethel (of Palestine)",
      "Sodom",
    ]);
  });

  it("follows the selection within a chapter", async () => {
    const reader = install();
    reader.select([selected("GEN", 13, 1)]);
    await waitFor(() => reader.isVisible());

    reader.select([selected("GEN", 13, 12)]);

    expect(reader.offered()).toEqual(["Sodom"]);
  });

  it("stays hidden for a verse that mentions no place", async () => {
    const reader = install();
    reader.select([selected("GEN", 13, 3)]);
    await waitFor(() => reader.isVisible());

    reader.select([selected("GEN", 13, 5)]);

    expect(reader.isVisible()).toBe(false);
  });

  it("stays hidden, without an error, for a chapter the dataset has nothing for", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const reader = install();

    reader.select([selected("OBA", 1, 1)]);
    await waitFor(() => vi.mocked(globalThis.fetch).mock.calls.length > 0);
    await settle();

    expect(reader.isVisible()).toBe(false);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("ignores a slow answer for a chapter the reader has left", async () => {
    let answerGenesis13: (response: Response) => void = () => undefined;
    responses.set(
      chapterUrl("GEN", 13),
      () =>
        new Promise((resolve) => {
          answerGenesis13 = resolve;
        })
    );
    const reader = install();

    reader.select([selected("GEN", 13, 3)]);
    reader.select([selected("GEN", 14, 1)]);
    await waitFor(() => reader.isVisible());
    answerGenesis13(chapterResponse(GENESIS_13));
    await settle();

    expect(reader.offered()).toEqual(["Shinar"]);
  });

  it("tries a chapter again once it failed to load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    responses.set(chapterUrl("GEN", 13), async () => {
      responses.set(chapterUrl("GEN", 13), async () =>
        chapterResponse(GENESIS_13)
      );
      return new Response("", { status: 500 });
    });
    const reader = install();

    reader.select([selected("GEN", 13, 3)]);
    await waitFor(() => warn.mock.calls.length > 0);
    expect(reader.isVisible()).toBe(false);

    reader.select([selected("GEN", 13, 1)]);
    await waitFor(() => reader.isVisible());

    expect(reader.offered()).toEqual(["Egypt", "Negeb"]);
    warn.mockRestore();
  });

  it("opens the chosen place in its own map pane", async () => {
    const reader = install();
    reader.select([selected("GEN", 13, 3)]);
    await waitFor(() => reader.isVisible());

    reader.choose("Bethel (of Palestine)");

    expect(reader.openPane).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "theographic-place-bethel_202",
        placement: "floating",
        title: "Bethel (of Palestine)",
      })
    );
  });

  it("removes its tool when uninstalled", async () => {
    const reader = install();
    reader.select([selected("GEN", 13, 3)]);
    await waitFor(() => reader.isVisible());

    unregisterExtension("ext_locations");

    expect(reader.hasTool()).toBe(false);
  });
});
