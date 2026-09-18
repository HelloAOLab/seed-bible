import {
  chapterVerseText,
  createTheographicDiscoverProvider,
  mentionsName,
  createOpenPlace,
  narrowToMentionedVerses,
  placeToGeoJson,
  primaryName,
} from "@packages/seed-bible/seed-bible/managers/TheographicDiscoverProvider";
import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type {
  Dataset,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type {
  TheographicBookChapter,
  TheographicClient,
} from "@packages/seed-bible/seed-bible/managers/TheographicDiscoverProvider";
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

/** Only the verses the assertions depend on, worded as the KJV has them. */
const EXODUS_4_TEXT: Record<number, string> = {
  5: "That they may believe that the LORD God of their fathers, the God of Abraham, the God of Isaac, and the God of Jacob, hath appeared unto thee.",
  14: "And the anger of the LORD was kindled against Moses, and he said, Is not Aaron the Levite thy brother?",
  19: "And the LORD said unto Moses in Midian, Go, return into Egypt.",
  20: "And Moses took his wife and his sons, and returned to the land of Egypt.",
  22: "And thou shalt say unto Pharaoh, Thus saith the LORD, Israel is my son, even my firstborn.",
  27: "And the LORD said to Aaron, Go into the wilderness to meet Moses.",
  28: "And Moses told Aaron all the words of the LORD who had sent him.",
  29: "And Moses and Aaron went and gathered together all the elders of the children of Israel.",
  30: "And Aaron spake all the words which the LORD had spoken unto Moses.",
  31: "And the people believed: and when they heard that the LORD had visited the children of Israel.",
};

function chapterText(
  text: Record<number, string> = EXODUS_4_TEXT
): TranslationBookChapter {
  return {
    chapter: {
      number: 4,
      content: Object.entries(text).map(([number, prose]) => ({
        type: "verse" as const,
        number: Number(number),
        content: [prose],
      })),
    },
  } as unknown as TranslationBookChapter;
}

function createDeps(
  options: {
    chapter?: () => Promise<TheographicBookChapter>;
    text?: () => Promise<TranslationBookChapter>;
  } = {}
) {
  const getChapter = vi.fn(
    options.chapter ?? (() => Promise.resolve(exodus4()))
  );
  const getTranslationBookChapter = vi.fn(
    options.text ?? (() => Promise.resolve(chapterText()))
  );

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

describe("primaryName", () => {
  it("drops a trailing parenthetical, whether it's an alias or a qualifier", () => {
    expect(primaryName("Jacob (Israel)")).toBe("Jacob");
    expect(primaryName("Pharaoh (of the Exodus)")).toBe("Pharaoh");
    expect(primaryName("Aaron")).toBe("Aaron");
  });
});

describe("mentionsName", () => {
  it("matches a name as a whole word", () => {
    expect(mentionsName("Is not Aaron the Levite thy brother?", "Aaron")).toBe(
      true
    );
  });

  it("matches a possessive", () => {
    expect(
      mentionsName("And Aaron's rod swallowed up their rods.", "Aaron")
    ).toBe(true);
  });

  it("matches a multi-word name", () => {
    expect(mentionsName("they came unto Mount Hor.", "Mount Hor")).toBe(true);
  });

  it("ignores accents and case", () => {
    expect(mentionsName("the men of Sïdon gathered.", "sidon")).toBe(true);
  });

  it("does not match a name buried inside a longer word", () => {
    expect(mentionsName("He went to Aaronsburg.", "Aaron")).toBe(false);
    expect(mentionsName("the danites gathered", "Dan")).toBe(false);
  });
});

describe("narrowToMentionedVerses", () => {
  const verseText = chapterVerseText(chapterText());

  it("keeps only the verses whose text names the person", () => {
    expect(
      narrowToMentionedVerses([14, 27, 28, 29, 30], "Aaron", verseText)
    ).toEqual([14, 27, 28, 29, 30]);
  });

  it("drops verses that use an alternate name instead", () => {
    // 5 says "the God of Jacob"; 22, 29 and 31 say "Israel", which in 29 and
    // 31 is the nation rather than the man.
    expect(
      narrowToMentionedVerses([5, 22, 29, 31], "Jacob (Israel)", verseText)
    ).toEqual([5]);
  });

  it("keeps a verse the translation has no text for rather than guessing", () => {
    expect(narrowToMentionedVerses([99], "Aaron", verseText)).toEqual([99]);
  });
});

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
          new Error(
            "Failed request to https://example.test/api/d/theographic/PRO/27.json. Status: 404 Not Found"
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
          new Error(
            "Failed request to https://example.test. Status: 500 Server Error"
          )
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
    // importer maps coordinates[0] to dimension X, which this map portal reads
    // as the latitude. Flipping these lands every place ~1,500 km away, and
    // both numbers stay valid coordinates, so nothing else catches it.
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
