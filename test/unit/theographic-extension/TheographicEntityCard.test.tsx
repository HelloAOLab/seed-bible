import { render } from "preact";
import { signal, type ReadonlySignal } from "@preact/signals";
import { act } from "preact/test-utils";
import {
  TheographicEntityCard,
  chapterReferences,
  formatVerseSpan,
  groupVerseRanges,
  highlightName,
} from "@packages/theographic-extension/ext_theographic/TheographicEntityCard";
import type { Dataset } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type {
  ScriptureReader,
  TheographicClient,
  TheographicPersonDetail,
  TheographicPlaceDetail,
  TheographicPersonEntry,
  TheographicPlaceEntry,
} from "@packages/theographic-extension/ext_theographic/provider";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import {
  createIsPlaceOpen,
  createOpenPlace,
  placePaneId,
  type PlaceLocations,
} from "@packages/theographic-extension/ext_theographic/map";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const DATASET = {
  id: "theographic",
  name: "Theographic Bible Metadata",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
} as unknown as Dataset;

const AARON: TheographicPersonEntry = {
  id: "aaron_1",
  name: "Aaron",
  gender: "Male",
  apiLink: "/api/d/theographic/people/aaron_1.json",
  verses: [14, 27, 30],
};

const AARON_DETAIL: TheographicPersonDetail = {
  dataset: DATASET,
  person: {
    id: "aaron_1",
    name: "Aaron",
    gender: "Male",
    description: ["The eldest son of Amram and Jochebed."],
    birthYear: -1574,
    father: [
      {
        id: "amram_242",
        type: "people",
        name: "Amram",
        apiLink: "/api/d/theographic/people/amram_242.json",
      },
    ],
  },
};

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

function renderCard(
  options: {
    getEntity?: (path: string) => Promise<unknown>;
    getResource?: (url: string) => Promise<unknown>;
    locations?: PlaceLocations;
    isMobile?: ReadonlySignal<boolean>;
    onReferenceClick?: (ref: VerseRef) => void;
    verses?: number[];
    contentType?: "person_profile" | "place_profile" | "event";
    entry?: TheographicPersonEntry | TheographicPlaceEntry;
    openPlace?: (entry: TheographicPlaceEntry) => void;
    isPlaceOpen?: (entry: TheographicPlaceEntry) => boolean;
    scripture?: ScriptureReader;
  } = {}
) {
  const getEntity = vi.fn<(path: string) => Promise<unknown>>(
    options.getEntity ?? (() => Promise.resolve(AARON_DETAIL))
  );
  const getResource = vi.fn<(url: string) => Promise<unknown>>(
    options.getResource ?? (() => Promise.reject(new Error("no file")))
  );
  const onReferenceClick = vi.fn(options.onReferenceClick ?? (() => undefined));
  const openPlace = vi.fn(options.openPlace ?? (() => undefined));

  act(() => {
    render(
      <TheographicEntityCard
        contentType={options.contentType ?? "person_profile"}
        entry={options.entry ?? AARON}
        description="Male"
        verses={options.verses ?? AARON.verses}
        book="EXO"
        chapter={4}
        dataset={DATASET}
        client={{ getEntity, getResource } as unknown as TheographicClient}
        onReferenceClick={onReferenceClick}
        openPlace={openPlace}
        isPlaceOpen={options.isPlaceOpen}
        locations={options.locations}
        isMobile={options.isMobile}
        scripture={options.scripture}
      />,
      container
    );
  });

  return { getEntity, getResource, onReferenceClick, openPlace };
}

function verseChips(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll(".sb-theographic-verse-chip"));
}

function expandButton(): HTMLButtonElement {
  return container.querySelector(
    ".sb-theographic-card-header"
  ) as HTMLButtonElement;
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** Lets an awaited fetch settle and the re-render flush. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("TheographicEntityCard", () => {
  it("shows the name and a chip per verse", () => {
    renderCard();

    expect(container.textContent).toContain("Aaron");
    expect(verseChips().map((chip) => chip.textContent)).toEqual([
      "4:14",
      "4:27",
      "4:30",
    ]);
  });

  it("opens the verse a chip names", () => {
    const { onReferenceClick } = renderCard();

    click(verseChips()[1]!);

    expect(onReferenceClick).toHaveBeenCalledWith({
      book: "EXO",
      chapter: 4,
      verse: 27,
    });
  });

  it("shows one chip for a run of consecutive verses", () => {
    // The Fall spans Genesis 3:1-24, which the chapter listing hands over as
    // twenty-four separate numbers.
    renderCard({ verses: Array.from({ length: 24 }, (_, i) => i + 1) });

    expect(verseChips().map((chip) => chip.textContent)).toEqual(["4:1-24"]);
  });

  it("opens a range chip as a range, not just its first verse", () => {
    const { onReferenceClick } = renderCard({ verses: [1, 2, 3] });

    click(verseChips()[0]!);

    expect(onReferenceClick).toHaveBeenCalledWith({
      book: "EXO",
      chapter: 4,
      verse: 1,
      endVerse: 3,
    });
  });

  describe("the map control", () => {
    const EGYPT: TheographicPlaceEntry = {
      id: "egypt_362",
      name: "Egypt",
      featureType: "Region",
      latitude: 26.4902,
      longitude: 29.8808,
      apiLink: "/api/d/theographic/places/egypt_362.json",
      verses: [19],
    };
    const EGYPT_DETAIL = {
      dataset: DATASET,
      place: { id: "egypt_362", name: "Egypt", references: [] },
    };

    const control = () =>
      container.querySelector(".sb-theographic-map-open") as HTMLElement | null;

    async function expandEgypt(
      entry: TheographicPlaceEntry = EGYPT
    ): Promise<ReturnType<typeof renderCard>> {
      const rendered = renderCard({
        contentType: "place_profile",
        entry,
        getEntity: () => Promise.resolve(EGYPT_DETAIL),
      });
      click(expandButton());
      await flush();
      return rendered;
    }

    it("sits on the map, not in the header", async () => {
      renderCard({ contentType: "place_profile", entry: EGYPT });
      // Collapsed there's no map, so nothing to open.
      expect(control()).toBeNull();

      render(null, container);
      await expandEgypt();

      expect(control()?.closest(".sb-theographic-map")).toBeTruthy();
      expect(control()?.getAttribute("aria-label")).toBe("Open in map");
      expect(
        container.querySelector(
          ".sb-theographic-card-header .sb-theographic-map-open"
        )
      ).toBeNull();
    });

    it("stays away from people and events", async () => {
      renderCard({ contentType: "person_profile" });
      click(expandButton());
      await flush();
      expect(control()).toBeNull();
    });

    it("stays away from a place the dataset has no position for", async () => {
      const { latitude: _lat, longitude: _lng, ...noCoords } = EGYPT;
      await expandEgypt(noCoords);

      // No position means no map to put it on, and nothing to open.
      expect(control()).toBeNull();
    });

    it("opens the place in its own pane", async () => {
      const { openPlace } = await expandEgypt();

      click(control() as HTMLElement);

      expect(openPlace).toHaveBeenCalledWith(EGYPT);
    });

    it("isn't offered on a phone-sized screen, and returns when it widens", async () => {
      const isMobile = signal(true);
      renderCard({
        contentType: "place_profile",
        entry: EGYPT,
        getEntity: () => Promise.resolve(EGYPT_DETAIL),
        isMobile,
      });
      click(expandButton());
      await flush();

      // The map itself still shows; only the control to pop it out is gone.
      expect(container.querySelector(".sb-theographic-map")).toBeTruthy();
      expect(control()).toBeNull();

      act(() => {
        isMobile.value = false;
      });

      expect(control()).toBeTruthy();
    });

    it("uses the floating-window icon", async () => {
      await expandEgypt();

      expect(control()?.textContent).toBe("float_landscape_2");
    });

    it("hands the map to the pane, and takes it back when the pane closes", async () => {
      // The real pane manager, so this is the same open and close the reader
      // does — not a flag the test flips.
      const panes = createPanes();
      renderCard({
        contentType: "place_profile",
        entry: EGYPT,
        getEntity: () => Promise.resolve(EGYPT_DETAIL),
        openPlace: createOpenPlace(panes),
        isPlaceOpen: createIsPlaceOpen(panes),
      });
      click(expandButton());
      await flush();

      const inlineMap = () => container.querySelector(".sb-theographic-map");
      expect(inlineMap()).toBeTruthy();

      click(control() as HTMLElement);

      expect(panes.panes.value.map((pane) => pane.id)).toEqual([
        placePaneId(EGYPT),
      ]);
      expect(inlineMap()).toBeNull();

      act(() => {
        panes.closePane(placePaneId(EGYPT));
      });

      expect(inlineMap()).toBeTruthy();
      // Still expanded: only the map moved, the card stayed open.
      expect(expandButton().getAttribute("aria-expanded")).toBe("true");
    });

    it("keeps the rest of the card while the map is in the pane", async () => {
      renderCard({
        contentType: "place_profile",
        entry: EGYPT,
        getEntity: () => Promise.resolve(EGYPT_DETAIL),
        isPlaceOpen: () => true,
      });
      click(expandButton());
      await flush();

      expect(container.querySelector(".sb-theographic-map")).toBeNull();
      expect(
        container.querySelector(".sb-theographic-attribution")
      ).toBeTruthy();
    });

    it("does not collapse the card", async () => {
      await expandEgypt();

      click(control() as HTMLElement);

      expect(expandButton().getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("does not fetch the record until the reader expands the card", () => {
    const { getEntity } = renderCard();
    expect(getEntity).not.toHaveBeenCalled();
  });

  it("fetches and shows the record when expanded", async () => {
    const { getEntity } = renderCard();

    click(expandButton());
    await flush();

    expect(getEntity).toHaveBeenCalledWith(
      "/api/d/theographic/people/aaron_1.json"
    );
    expect(container.textContent).toContain(
      "The eldest son of Amram and Jochebed."
    );
    expect(container.textContent).toContain("Father");
    expect(container.textContent).toContain("Amram");
  });

  it("shimmers while the record loads, then swaps in the real content", async () => {
    // A promise we resolve by hand, so the loading state can be observed
    // rather than raced past.
    let settle: (detail: TheographicPersonDetail) => void = () => undefined;
    const getEntity = vi.fn(
      () =>
        new Promise<TheographicPersonDetail>((resolve) => {
          settle = resolve;
        })
    );
    renderCard({ getEntity });

    click(expandButton());

    const skeletons = () => container.querySelectorAll(".sb-skeleton").length;
    expect(skeletons()).toBeGreaterThan(0);
    // The region announces itself as busy rather than leaving the blocks to
    // be read out one by one.
    const status = container.querySelector(".sb-skeleton-status");
    expect(status?.getAttribute("aria-busy")).toBe("true");
    expect(status?.textContent).toContain("Loading");

    await act(async () => {
      settle(AARON_DETAIL);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(skeletons()).toBe(0);
    expect(container.textContent).toContain(
      "The eldest son of Amram and Jochebed."
    );
  });

  describe("dates", () => {
    const factValues = () =>
      Array.from(container.querySelectorAll(".sb-theographic-fact")).map(
        (fact) => fact.textContent
      );

    async function expandEvent(startDate: string) {
      renderCard({
        contentType: "event",
        entry: {
          id: "e_1",
          name: "An event",
          apiLink: "/api/d/theographic/events/e_1.json",
          verses: [1],
        },
        getEntity: () =>
          Promise.resolve({
            dataset: DATASET,
            event: { id: "e_1", name: "An event", startDate },
          }),
      });
      click(expandButton());
      await flush();
    }

    it("shows a negative year as BC", async () => {
      await expandEvent("-4003");
      expect(factValues()).toContain("Date4003 BC");
    });

    it("shows a positive year as AD, without the dataset's zero padding", async () => {
      await expandEvent("0056");
      expect(factValues()).toContain("Date56 AD");
    });

    it("names the month and day of a full date", async () => {
      await expandEvent("0045-04-01");
      expect(factValues()).toContain("DateApril 1, 45 AD");
    });

    it("shows anything it doesn't recognise as the dataset has it", async () => {
      await expandEvent("about 30");
      expect(factValues()).toContain("Dateabout 30");
    });

    it("formats a person's years the same way", async () => {
      renderCard({
        getEntity: () =>
          Promise.resolve({
            ...AARON_DETAIL,
            person: { ...AARON_DETAIL.person, birthYear: -4, deathYear: 12 },
          }),
      });
      click(expandButton());
      await flush();

      expect(factValues()).toContain("Born4 BC");
      expect(factValues()).toContain("Died12 AD");
    });
  });

  it("renders a negative birth year as BC", async () => {
    renderCard();

    click(expandButton());
    await flush();

    expect(container.textContent).toContain("1574 BC");
  });

  it("credits the dataset, as its licence requires", async () => {
    renderCard();

    click(expandButton());
    await flush();

    const attribution = container.querySelector(
      ".sb-theographic-attribution a"
    ) as HTMLAnchorElement;
    expect(attribution?.textContent).toContain("CC BY-SA 4.0");
    expect(attribution?.getAttribute("href")).toBe(
      "https://creativecommons.org/licenses/by-sa/4.0/"
    );
  });

  it("only fetches once across collapse and re-expand", async () => {
    const { getEntity } = renderCard();

    click(expandButton());
    await flush();
    click(expandButton());
    click(expandButton());
    await flush();

    expect(getEntity).toHaveBeenCalledTimes(1);
  });

  it("offers a retry instead of crashing when the record fails to load", async () => {
    const getEntity = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(AARON_DETAIL);
    renderCard({ getEntity });

    click(expandButton());
    await flush();

    const retry = container.querySelector(
      ".sb-theographic-card-retry"
    ) as HTMLButtonElement;
    expect(retry).toBeTruthy();
    expect(retry.textContent).toContain("Couldn't load details.");

    click(retry);
    await flush();

    expect(container.textContent).toContain(
      "The eldest son of Amram and Jochebed."
    );
    expect(container.querySelector(".sb-theographic-card-retry")).toBeNull();
  });
});

describe("groupVerseRanges", () => {
  it("collapses a consecutive run into one range", () => {
    expect(groupVerseRanges([1, 2, 3, 4])).toEqual([{ start: 1, end: 4 }]);
  });

  it("keeps separate verses separate", () => {
    expect(groupVerseRanges([14, 27, 30])).toEqual([
      { start: 14, end: 14 },
      { start: 27, end: 27 },
      { start: 30, end: 30 },
    ]);
  });

  it("splits a run wherever there is a gap", () => {
    expect(groupVerseRanges([1, 2, 3, 7, 8, 12])).toEqual([
      { start: 1, end: 3 },
      { start: 7, end: 8 },
      { start: 12, end: 12 },
    ]);
  });

  it("sorts and de-duplicates before grouping", () => {
    expect(groupVerseRanges([3, 1, 2, 2])).toEqual([{ start: 1, end: 3 }]);
  });

  it("returns nothing for no verses", () => {
    expect(groupVerseRanges([])).toEqual([]);
  });
});

/** Book names and verse text, standing in for the reader's translation. */
function fakeScripture(
  texts: Record<string, string> = {}
): ScriptureReader & { readPassage: ReturnType<typeof vi.fn> } {
  const names: Record<string, string> = {
    EXO: "Exodus",
    NUM: "Numbers",
    LEV: "Leviticus",
    DEU: "Deuteronomy",
    "1CH": "1 Chronicles",
    PSA: "Psalms",
  };
  return {
    bookName: (bookId: string) => names[bookId] ?? bookId,
    readPassage: vi.fn(
      async (ref: { book: string; chapter: number; verse: number }) => {
        const text = texts[`${ref.book} ${ref.chapter}:${ref.verse}`];
        return text ? { text, translation: "BSB" } : null;
      }
    ),
  };
}

/** Aaron as the dataset has him: three passages here, many more elsewhere. */
const AARON_WITH_REFERENCES: TheographicPersonDetail = {
  ...AARON_DETAIL,
  person: {
    ...AARON_DETAIL.person,
    references: [
      { book: "EXO", chapter: 4, verse: 14 },
      { book: "EXO", chapter: 4, verse: 27 },
      { book: "EXO", chapter: 4, verse: 30 },
      { book: "EXO", chapter: 5, verse: 1 },
      { book: "LEV", chapter: 8, verse: 2 },
      { book: "NUM", chapter: 20, verse: 24, endVerse: 26 },
      { book: "NUM", chapter: 33, verse: 38 },
      { book: "DEU", chapter: 10, verse: 6 },
      { book: "1CH", chapter: 6, verse: 3 },
      { book: "PSA", chapter: 77, verse: 20 },
      { book: "PSA", chapter: 105, verse: 26 },
    ],
  },
};

async function expand(
  scripture: ScriptureReader,
  detail = AARON_WITH_REFERENCES
) {
  const rendered = renderCard({
    scripture,
    getEntity: () => Promise.resolve(detail),
  });
  click(expandButton());
  await flush();
  return rendered;
}

describe("the redesigned card", () => {
  it("labels only places beside the name, not people or events", () => {
    renderCard();

    const header = expandButton();
    expect(header.querySelector(".sb-theographic-card-name")?.textContent).toBe(
      "Aaron"
    );
    expect(header.querySelector(".sb-theographic-card-kind")).toBeNull();

    render(null, container);
    renderCard({
      contentType: "event",
      entry: {
        id: "e_1",
        name: "Creation of all things",
        apiLink: "/api/d/theographic/events/e_1.json",
        verses: [1],
      },
    });
    expect(container.querySelector(".sb-theographic-card-kind")).toBeNull();
  });

  it("labels a place by its feature type, falling back to 'Place'", () => {
    const city: TheographicPlaceEntry = {
      id: "erech_1",
      name: "Erech",
      featureType: "City",
      apiLink: "/api/d/theographic/places/erech_1.json",
      verses: [10],
    };
    renderCard({ contentType: "place_profile", entry: city });
    expect(
      container.querySelector(".sb-theographic-card-kind")?.textContent
    ).toBe("City");

    render(null, container);
    const { featureType: _type, ...untyped } = city;
    renderCard({ contentType: "place_profile", entry: untyped });
    expect(
      container.querySelector(".sb-theographic-card-kind")?.textContent
    ).toBe("Place");
  });

  it("keeps a chevron to collapse and expand", () => {
    renderCard();

    const chevron = () =>
      container.querySelector(".sb-theographic-card-chevron")?.textContent;
    expect(chevron()).toBe("expand_more");
    click(expandButton());
    expect(chevron()).toBe("expand_less");
    click(expandButton());
    expect(chevron()).toBe("expand_more");
  });

  it("puts the chevron after the name and type, at the end of the row", () => {
    renderCard();

    const header = expandButton();
    const children = Array.from(header.children);
    expect(
      children.at(-1)?.classList.contains("sb-theographic-card-chevron")
    ).toBe(true);
    expect(
      children[0]?.querySelector(".sb-theographic-card-name")?.textContent
    ).toBe("Aaron");
  });

  it("lists only this chapter's verses, even once expanded", async () => {
    // Aaron's record has eleven passages across six books; only the three
    // in Exodus 4 belong on a card shown for Exodus 4.
    await expand(fakeScripture());

    expect(verseChips().map((chip) => chip.textContent)).toEqual([
      "4:14",
      "4:27",
      "4:30",
    ]);
  });

  it("quotes the first mention here, with the name marked", async () => {
    const scripture = fakeScripture({
      "EXO 4:14": "Is not Aaron the Levite thy brother?",
    });
    await expand(scripture);
    await flush();

    const quote = container.querySelector(".sb-theographic-quote-text");
    expect(quote?.textContent).toContain(
      "Is not Aaron the Levite thy brother?"
    );
    expect(
      container.querySelector(".sb-theographic-quote-mark")?.textContent
    ).toBe("Aaron");
    expect(
      container.querySelector(".sb-theographic-quote-ref")?.textContent
    ).toBe("Exodus 4:14 · BSB");
    expect(verseChips()[0]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("picking a chip when expanded quotes that mention instead of navigating", async () => {
    const scripture = fakeScripture({
      "EXO 4:27": "And the LORD said to Aaron, Go into the wilderness.",
    });
    const { onReferenceClick } = await expand(scripture);

    const later = verseChips().find((chip) => chip.textContent === "4:27")!;
    click(later);
    await flush();

    expect(onReferenceClick).not.toHaveBeenCalled();
    expect(later.getAttribute("aria-pressed")).toBe("true");
    expect(
      container.querySelector(".sb-theographic-quote-text")?.textContent
    ).toContain("Go into the wilderness");
  });

  it("re-quotes the verse when the reader switches translation", async () => {
    const detail = AARON_WITH_REFERENCES;
    const cardFor = (scripture: ScriptureReader) => (
      <TheographicEntityCard
        contentType="person_profile"
        entry={AARON}
        description="Male"
        verses={AARON.verses}
        book="EXO"
        chapter={4}
        dataset={DATASET}
        client={
          {
            getEntity: () => Promise.resolve(detail),
          } as unknown as TheographicClient
        }
        onReferenceClick={() => undefined}
        scripture={scripture}
      />
    );
    act(() => {
      render(
        cardFor(fakeScripture({ "EXO 4:14": "Is not Aaron the Levite?" })),
        container
      );
    });
    click(expandButton());
    await flush();

    const spanish = {
      bookName: () => "Éxodo",
      readPassage: async () => ({
        text: "¿No está Aarón levita?",
        translation: "RVR",
      }),
    };
    act(() => {
      render(cardFor(spanish), container);
    });
    await flush();

    expect(
      container.querySelector(".sb-theographic-quote-text")?.textContent
    ).toContain("¿No está Aarón levita?");
  });

  it("'Go to verse' opens the quoted verse", async () => {
    const { onReferenceClick } = await expand(fakeScripture());

    click(verseChips().find((chip) => chip.textContent === "4:27")!);
    await flush();
    click(container.querySelector(".sb-theographic-quote-go") as HTMLElement);

    expect(onReferenceClick).toHaveBeenCalledWith({
      book: "EXO",
      chapter: 4,
      verse: 27,
    });
  });

  it("says so when a verse can't be loaded, but still offers to go there", async () => {
    await expand(fakeScripture());
    await flush();

    expect(container.textContent).toContain("This verse couldn't be loaded.");
    expect(container.querySelector(".sb-theographic-quote-go")).toBeTruthy();
  });

  it("counts the passages and names the books they're in", async () => {
    await expand(fakeScripture());

    const facts = Array.from(
      container.querySelectorAll(".sb-theographic-fact")
    ).map((fact) => fact.textContent);
    // 11 references across 6 books: the first three named, the rest counted.
    expect(facts).toContain(
      "Mentioned11 passages · Exodus, Leviticus, Numbers +3"
    );
  });

  it("files the dictionary text under 'Full entry'", async () => {
    await expand(fakeScripture());

    const section = container.querySelector(".sb-theographic-full-entry");
    expect(
      section?.querySelector(".sb-theographic-section-label")?.textContent
    ).toBe("Full entry");
    expect(section?.textContent).toContain(
      "The eldest son of Amram and Jochebed."
    );
  });

  describe("a place", () => {
    const ERECH: TheographicPlaceEntry = {
      id: "erech_1",
      name: "Erech",
      featureType: "City",
      latitude: 31.3222,
      longitude: 45.6361,
      apiLink: "/api/d/theographic/places/erech_1.json",
      verses: [10],
    };
    const ERECH_DETAIL: TheographicPlaceDetail = {
      dataset: DATASET,
      place: {
        id: "erech_1",
        name: "Erech",
        esvName: "Uruk",
        featureType: "City",
        comment: "now Uruk",
        description: ["One of the cities of Nimrod's kingdom."],
        references: [
          { book: "EXO", chapter: 4, verse: 10 },
          { book: "1CH", chapter: 6, verse: 3 },
        ],
      },
    };

    // Erech is in the locations extension's file; Abana isn't.
    const ERECH_GEOJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [] },
          properties: { id: "Erech" },
        },
      ],
    };
    const ERECH_FILE =
      "https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/Erech.geojson";
    const LOCATIONS: PlaceLocations = {
      findLocation: (name) =>
        name.toLowerCase() === "erech"
          ? { place: "Erech", geojson: "Erech" }
          : null,
      getPlaceGeoJsonUrl: () => ERECH_FILE,
    };
    const ABANA: TheographicPlaceEntry = {
      id: "abana_1",
      name: "Abana",
      featureType: "Water",
      latitude: 33.5,
      longitude: 36.3,
      apiLink: "/api/d/theographic/places/abana_1.json",
      verses: [10],
    };

    async function expandPlace(
      entry: TheographicPlaceEntry = ERECH,
      file: () => Promise<unknown> = () => Promise.resolve(ERECH_GEOJSON),
      detail: TheographicPlaceDetail = ERECH_DETAIL
    ) {
      const rendered = renderCard({
        contentType: "place_profile",
        entry,
        scripture: fakeScripture(),
        getEntity: () => Promise.resolve(detail),
        getResource: file,
        locations: LOCATIONS,
      });
      click(expandButton());
      await flush();
      await flush();
      return rendered;
    }

    function mapData(): unknown {
      const iframe = container.querySelector(
        ".sb-theographic-map iframe"
      ) as HTMLIFrameElement | null;
      if (!iframe) {
        return null;
      }
      const src = new URL(iframe.getAttribute("src")!);
      expect(src.host).toBe("ao.bot");
      return JSON.parse(src.searchParams.get("mapData")!);
    }

    it("draws the locations extension's file, in an iframe, only when expanded", async () => {
      renderCard({ contentType: "place_profile", entry: ERECH });
      // Collapsed cards don't load a map each.
      expect(container.querySelector("iframe")).toBeNull();

      render(null, container);
      const { getResource } = await expandPlace();

      expect(getResource).toHaveBeenCalledWith(ERECH_FILE, expect.anything());
      expect(mapData()).toEqual(ERECH_GEOJSON);
      expect(
        container.querySelector(".sb-theographic-map-coords")?.textContent
      ).toBe("31.3222, 45.6361");
    });

    it("holds the map's space while the file loads", async () => {
      await expandPlace(ERECH, () => new Promise(() => undefined));

      expect(
        container.querySelector(
          ".sb-theographic-map .sb-theographic-map-loading"
        )
      ).toBeTruthy();
      expect(container.querySelector(".sb-theographic-map iframe")).toBeNull();
    });

    it("draws a point from the coordinates for a place the file doesn't list", async () => {
      const { getResource } = await expandPlace(ABANA);

      expect(getResource).not.toHaveBeenCalled();
      expect(mapData()).toMatchObject({
        type: "Feature",
        geometry: { type: "Point", coordinates: [33.5, 36.3] },
        properties: { id: "Abana" },
      });
    });

    it("falls back to the coordinates when the file can't be fetched", async () => {
      await expandPlace(ERECH, () => Promise.reject(new Error("offline")));

      expect(mapData()).toMatchObject({
        type: "Feature",
        geometry: { type: "Point", coordinates: [31.3222, 45.6361] },
        properties: { id: "Erech" },
      });
    });

    it("falls back to the coordinates when the file is too big for the map's URL", async () => {
      // Crete's outline is 1.35 MB once encoded; ao.bot drops any request
      // past about 16 KB, so the map would never load.
      const crete = {
        type: "FeatureCollection",
        features: [{ type: "Feature", big: "x".repeat(20_000) }],
      };
      await expandPlace(ERECH, () => Promise.resolve(crete));

      expect(mapData()).toMatchObject({
        geometry: { type: "Point", coordinates: [31.3222, 45.6361] },
      });
    });

    it("still maps a listed place that has no coordinates", async () => {
      const { latitude: _lat, longitude: _lng, ...unplaced } = ERECH;
      await expandPlace(unplaced);

      expect(mapData()).toEqual(ERECH_GEOJSON);
      // No coordinates to label the map with.
      expect(container.querySelector(".sb-theographic-map-coords")).toBeNull();
    });

    it("leaves no empty map behind when the file fails and there are no coordinates", async () => {
      const { latitude: _lat, longitude: _lng, ...unplaced } = ERECH;
      await expandPlace(unplaced, () => Promise.reject(new Error("offline")));

      expect(container.querySelector(".sb-theographic-map")).toBeNull();
      expect(container.querySelector(".sb-theographic-map-open")).toBeNull();
    });

    it("shows its broad type collapsed, and its sub type once opened", async () => {
      renderCard({ contentType: "place_profile", entry: ABANA });
      const kind = () =>
        container.querySelector(".sb-theographic-card-kind")?.textContent;
      expect(kind()).toBe("Water");

      render(null, container);
      await expandPlace(ABANA, undefined, {
        dataset: DATASET,
        place: { id: "abana_1", name: "Abana", featureSubType: "River" },
      });

      expect(kind()).toBe("River");
    });

    it("shows its other names and what it's called today", async () => {
      await expandPlace();

      const facts = Array.from(
        container.querySelectorAll(".sb-theographic-fact")
      ).map((fact) => fact.textContent);
      expect(facts).toContain("Also known asUruk");
      expect(facts).toContain("Todaynow Uruk");
    });

    it("has no map for an unlisted place without a position", async () => {
      const { latitude: _lat, longitude: _lng, ...unplaced } = ABANA;
      await expandPlace(unplaced);

      expect(container.querySelector(".sb-theographic-map")).toBeNull();
      expect(container.querySelector(".sb-theographic-map-open")).toBeNull();
    });
  });
});

describe("reference helpers", () => {
  it("turns this chapter's verses into passages, one per run", () => {
    expect(chapterReferences("GEN", 3, [1, 2, 3, 9])).toEqual([
      { book: "GEN", chapter: 3, verse: 1, endVerse: 3 },
      { book: "GEN", chapter: 3, verse: 9 },
    ]);
  });

  it("formats a verse or a span", () => {
    expect(formatVerseSpan({ book: "GEN", chapter: 10, verse: 8 })).toBe(
      "10:8"
    );
    expect(
      formatVerseSpan({ book: "GEN", chapter: 10, verse: 8, endVerse: 9 })
    ).toBe("10:8-9");
    expect(
      formatVerseSpan({ book: "GEN", chapter: 10, verse: 8, endVerse: 8 })
    ).toBe("10:8");
  });
});

describe("highlightName", () => {
  const marked = (text: string, name: string) =>
    highlightName(text, name)
      .filter((part) => part.match)
      .map((part) => part.text);

  it("marks each whole-word mention, whatever its case", () => {
    expect(marked("Cush begat NIMROD; Nimrod was mighty", "Nimrod")).toEqual([
      "NIMROD",
      "Nimrod",
    ]);
  });

  it("drops the dataset's disambiguator before matching", () => {
    expect(marked("the God of Jacob", "Jacob (Israel)")).toEqual(["Jacob"]);
  });

  it("doesn't mark a name inside a longer word", () => {
    expect(marked("the Danites gathered", "Dan")).toEqual([]);
  });

  it("keeps all the text, marked or not, in order", () => {
    expect(
      highlightName("Is not Aaron the Levite", "Aaron")
        .map((part) => part.text)
        .join("")
    ).toBe("Is not Aaron the Levite");
  });

  it("treats a name with regex characters literally", () => {
    expect(marked("see a.b here and axb there", "a.b")).toEqual(["a.b"]);
  });
});
