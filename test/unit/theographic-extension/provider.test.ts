import {
  createTheographicDiscoverProvider,
  createScriptureReader,
  TheographicRequestError,
} from "@packages/theographic-extension/ext_theographic/provider";
import {
  createOpenPlace,
  placeToGeoJson,
} from "@packages/theographic-extension/ext_theographic/map";
import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type {
  Dataset,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type {
  TheographicBookChapter,
  TheographicClient,
} from "@packages/theographic-extension/ext_theographic/provider";
import type { DiscoverContext } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type { PanesManager } from "@packages/seed-bible/seed-bible/managers/PanesManager";

const DATASET = {
  id: "theographic",
  name: "Theographic Bible Metadata",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  language: "eng",
} as unknown as Dataset;

const CONTEXT: DiscoverContext = {
  translationId: "eng_kjv",
  book: "EXO",
  chapter: 4,
  language: "eng",
};

/**
 * Exodus 4 as the API actually serves it, trimmed to the entries the tests
 * reason about. "Jacob (Israel)" is the interesting one: Theographic links him
 * to verses that say "Israel" as well as the one that says "Jacob".
 */
function exodus4(): TheographicBookChapter {
  return {
    dataset: DATASET,
    chapter: {
      number: 4,
      people: [
        {
          id: "aaron_1",
          name: "Aaron",
          gender: "Male",
          apiLink: "/api/d/theographic/people/aaron_1.json",
          verses: [14, 27, 28, 29, 30],
        },
        {
          id: "jacob_1",
          name: "Jacob (Israel)",
          gender: "Male",
          apiLink: "/api/d/theographic/people/jacob_1.json",
          verses: [5, 22, 29, 31],
        },
      ],
      places: [
        {
          id: "egypt_362",
          name: "Egypt",
          featureType: "Region",
          apiLink: "/api/d/theographic/places/egypt_362.json",
          verses: [19, 20],
        },
      ],
      events: [],
    },
    numberOfPeople: 2,
    numberOfPlaces: 1,
    numberOfEvents: 0,
  };
}

function createDeps(
  options: {
    chapter?: () => Promise<TheographicBookChapter>;
  } = {}
) {
  const getChapter = vi.fn(
    options.chapter ?? (() => Promise.resolve(exodus4()))
  );
  const getTranslationBookChapter = vi.fn();

  return {
    client: { getChapter, getEntity: vi.fn() } as unknown as TheographicClient,
    data: { getTranslationBookChapter } as unknown as BibleDataManager,
    onReferenceClick: vi.fn(),
    getChapter,
    getTranslationBookChapter,
  };
}

async function discover(
  context: DiscoverContext,
  deps: ReturnType<typeof createDeps>
) {
  const provider = createTheographicDiscoverProvider(deps);
  return await provider.discover(context);
}

describe("createTheographicDiscoverProvider", () => {
  it("maps people, places and events to their own content types", async () => {
    const results = await discover(CONTEXT, createDeps());

    expect(results.map((result) => result.type)).toEqual([
      "content",
      "content",
      "content",
    ]);
    expect(
      results.map((result) =>
        result.type === "content" ? result.contentType : null
      )
    ).toEqual(["person_profile", "person_profile", "place_profile"]);
  });

  it("carries the entity's verses and a span covering them", async () => {
    const results = await discover(CONTEXT, createDeps());
    const aaron = results.find(
      (result) => result.type === "content" && result.title === "Aaron"
    );

    expect(aaron).toBeDefined();
    if (aaron?.type !== "content") {
      throw new Error("expected a content result");
    }
    expect(aaron.verses).toEqual([14, 27, 28, 29, 30]);
    expect(aaron.reference).toMatchObject({
      book: "EXO",
      chapter: 4,
      verse: 14,
      endVerse: 30,
    });
  });

  it("keeps the dataset's verses, wording differences and all", async () => {
    // Theographic's names are canonical while a translation uses whatever form
    // the passage uses ("Abram" for Abraham, "Saul" for Paul, "the LORD" for
    // God), so the dataset's own links are the source of truth. The cost is
    // that "Jacob (Israel)" keeps 29 and 31, where "Israel" is the nation.
    const results = await discover(CONTEXT, createDeps());
    const jacob = results.find(
      (result) => result.type === "content" && result.title === "Jacob (Israel)"
    );

    if (jacob?.type !== "content") {
      throw new Error("expected a content result");
    }
    expect(jacob.verses).toEqual([5, 22, 29, 31]);
  });

  it("never reads the chapter text, so it costs no extra request", async () => {
    const deps = createDeps();
    await discover(CONTEXT, deps);

    expect(deps.getTranslationBookChapter).not.toHaveBeenCalled();
  });

  it("labels a person and an event, but leaves a place unlabelled", async () => {
    const results = await discover(CONTEXT, createDeps());
    const byTitle = new Map(
      results.map((result) => [
        result.type === "content" ? result.title : "",
        result.type === "content" ? result.description : "",
      ])
    );

    expect(byTitle.get("Aaron")).toBe("Male");
    // A place gets no subtitle: the listing only has the broad "Region"/"Water"
    // featureType, and the useful featureSubType would cost one request per
    // place to label a collapsed row.
    expect(byTitle.get("Egypt")).toBe("");
  });

  it("keeps every entity the chapter lists", async () => {
    const results = await discover(CONTEXT, createDeps());

    expect(
      results.map((result) => (result.type === "content" ? result.title : null))
    ).toEqual(["Aaron", "Jacob (Israel)", "Egypt"]);
  });

  it("treats a 404 as 'no data for this chapter', without logging", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const deps = createDeps({
      chapter: () =>
        Promise.reject(
          new TheographicRequestError(
            "https://example.test/api/d/theographic/PRO/27.json",
            "not-found",
            404
          )
        ),
    });

    await expect(discover(CONTEXT, deps)).resolves.toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns once and returns nothing when the dataset fails otherwise", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const deps = createDeps({
      chapter: () =>
        Promise.reject(
          new TheographicRequestError("https://example.test", "failed", 500)
        ),
    });
    const provider = createTheographicDiscoverProvider(deps);

    await expect(provider.discover(CONTEXT)).resolves.toEqual([]);
    await expect(provider.discover(CONTEXT)).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("returns nothing for a chapter whose lists are all empty", async () => {
    const deps = createDeps({
      chapter: () =>
        Promise.resolve({
          dataset: DATASET,
          chapter: { number: 4, people: [], places: [], events: [] },
          numberOfPeople: 0,
          numberOfPlaces: 0,
          numberOfEvents: 0,
        }),
    });

    await expect(discover(CONTEXT, deps)).resolves.toEqual([]);
  });
});

describe("placeToGeoJson", () => {
  const egypt = {
    id: "egypt_362",
    name: "Egypt",
    featureType: "Region",
    latitude: 26.4902,
    longitude: 29.8808,
    apiLink: "/api/d/theographic/places/egypt_362.json",
    verses: [19],
  };

  it("puts latitude before longitude, as the map portal expects", () => {
    // Deliberately not GeoJSON's documented [longitude, latitude]: the
    // importer labels and focuses a lone Feature with coordinates[0] as the
    // latitude. Flipping these lands every place ~1,500 km away, and both
    // numbers stay valid coordinates, so nothing else catches it.
    expect(placeToGeoJson(egypt)?.geometry.coordinates).toEqual([
      26.4902, 29.8808,
    ]);
  });

  it("builds a bare Point feature the importer will label and focus", () => {
    expect(placeToGeoJson(egypt)).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [26.4902, 29.8808] },
      properties: { id: "Egypt", name: "Egypt", featureType: "Region" },
    });
  });

  it("uses the readable name as the id, since that is the map label", () => {
    expect(placeToGeoJson(egypt)?.properties.id).toBe("Egypt");
  });

  it("omits featureType when the dataset has none", () => {
    const { featureType: _omitted, ...withoutType } = egypt;
    expect(placeToGeoJson(withoutType)?.properties).toEqual({
      id: "Egypt",
      name: "Egypt",
    });
  });

  it("returns null for a place with no position", () => {
    const { latitude: _lat, longitude: _lng, ...noCoords } = egypt;
    expect(placeToGeoJson(noCoords)).toBeNull();
    expect(placeToGeoJson({ ...egypt, latitude: undefined })).toBeNull();
    expect(placeToGeoJson({ ...egypt, longitude: undefined })).toBeNull();
  });

  it("keeps a valid zero coordinate", () => {
    // 0 is a real position (the Gulf of Guinea); a truthiness check would drop it.
    expect(
      placeToGeoJson({ ...egypt, latitude: 0, longitude: 0 })?.geometry
        .coordinates
    ).toEqual([0, 0]);
  });
});

describe("createOpenPlace", () => {
  const egypt = {
    id: "egypt_362",
    name: "Egypt",
    featureType: "Region",
    latitude: 26.4902,
    longitude: 29.8808,
    apiLink: "/api/d/theographic/places/egypt_362.json",
    verses: [19],
  };

  function panesStub() {
    const openPane = vi.fn();
    return { openPane, panes: { openPane } as unknown as PanesManager };
  }

  it("is undefined without a panes manager, so no control is offered", () => {
    expect(createOpenPlace(undefined)).toBeUndefined();
  });

  it("opens a floating pane titled after the place", () => {
    const { openPane, panes } = panesStub();

    createOpenPlace(panes)?.(egypt);

    expect(openPane).toHaveBeenCalledTimes(1);
    expect(openPane.mock.calls[0]![0]).toMatchObject({
      id: "theographic-place-egypt_362",
      placement: "floating",
      title: "Egypt",
    });
  });

  it("does nothing for a place the dataset has no position for", () => {
    const { openPane, panes } = panesStub();
    const { latitude: _lat, longitude: _lng, ...noCoords } = egypt;

    createOpenPlace(panes)?.(noCoords);

    expect(openPane).not.toHaveBeenCalled();
  });

  it("reuses one pane id per place, so reopening replaces rather than stacks", () => {
    const { openPane, panes } = panesStub();
    const open = createOpenPlace(panes);

    open?.(egypt);
    open?.(egypt);

    const [first, second] = openPane.mock.calls.map((c) => c[0].id);
    expect(first).toBe(second);
  });
});

describe("createScriptureReader", () => {
  function chapterOf(verses: Record<number, string>, shortName = "BSB") {
    return {
      translation: { shortName },
      chapter: {
        number: 10,
        content: Object.entries(verses).map(([number, text]) => ({
          type: "verse",
          number: Number(number),
          content: [text],
        })),
      },
    } as unknown as TranslationBookChapter;
  }

  function dataWith(options: {
    books?: { id: string; name: string; commonName: string }[];
    chapter?: () => Promise<TranslationBookChapter>;
  }) {
    const getTranslationBookChapter = vi.fn(
      options.chapter ?? (() => Promise.resolve(chapterOf({})))
    );
    return {
      data: {
        getCachedTranslationBooks: () =>
          options.books ? { books: options.books } : null,
        getTranslationBookChapter,
      } as unknown as BibleDataManager,
      getTranslationBookChapter,
    };
  }

  it("names a book the way the reader's translation does", () => {
    const { data } = dataWith({
      books: [{ id: "1CH", name: "1 Chron.", commonName: "1 Chronicles" }],
    });

    expect(createScriptureReader(data, "BSB").bookName("1CH")).toBe(
      "1 Chronicles"
    );
  });

  it("falls back to the book id when the book list isn't loaded", () => {
    const { data } = dataWith({});

    expect(createScriptureReader(data, "BSB").bookName("MIC")).toBe("MIC");
  });

  it("reads a verse in the reader's translation", async () => {
    const { data, getTranslationBookChapter } = dataWith({
      chapter: () =>
        Promise.resolve(chapterOf({ 8: "Cush was the father of Nimrod." })),
    });

    await expect(
      createScriptureReader(data, "BSB").readPassage({
        book: "GEN",
        chapter: 10,
        verse: 8,
      })
    ).resolves.toEqual({
      text: "Cush was the father of Nimrod.",
      translation: "BSB",
    });
    expect(getTranslationBookChapter).toHaveBeenCalledWith("BSB", "GEN", 10);
  });

  it("joins every verse of a span", async () => {
    const { data } = dataWith({
      chapter: () =>
        Promise.resolve(
          chapterOf({ 8: "He began to be mighty.", 9: "He was a hunter." })
        ),
    });

    const passage = await createScriptureReader(data, "BSB").readPassage({
      book: "GEN",
      chapter: 10,
      verse: 8,
      endVerse: 9,
    });

    expect(passage?.text).toBe("He began to be mighty. He was a hunter.");
  });

  it("answers null rather than throwing when the chapter can't be loaded", async () => {
    const { data } = dataWith({
      chapter: () => Promise.reject(new Error("offline")),
    });

    await expect(
      createScriptureReader(data, "BSB").readPassage({
        book: "GEN",
        chapter: 10,
        verse: 8,
      })
    ).resolves.toBeNull();
  });

  it("answers null for a verse the chapter doesn't have", async () => {
    const { data } = dataWith({
      chapter: () => Promise.resolve(chapterOf({ 1: "In the beginning." })),
    });

    await expect(
      createScriptureReader(data, "BSB").readPassage({
        book: "GEN",
        chapter: 10,
        verse: 99,
      })
    ).resolves.toBeNull();
  });
});

describe("reference clicks from a card", () => {
  it("carry the chapter the card was discovered for", async () => {
    const deps = createDeps();
    const results = await discover(CONTEXT, deps);
    const card = results[0];
    if (card?.type !== "content" || !card.content) {
      throw new Error("expected a content result with a card");
    }

    // The card is a VNode; its onReferenceClick is what the chips call.
    const { onReferenceClick } = (
      card.content as { props: { onReferenceClick: (ref: unknown) => void } }
    ).props;
    onReferenceClick({ book: "MIC", chapter: 5, verse: 6 });

    expect(deps.onReferenceClick).toHaveBeenCalledWith(
      { book: "MIC", chapter: 5, verse: 6 },
      { translationId: "eng_kjv", book: "EXO", chapter: 4 }
    );
  });
});
