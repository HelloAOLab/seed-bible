import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TheographicEntityCard,
  groupVerseRanges,
} from "@packages/seed-bible/seed-bible/components/TheographicEntityCard/TheographicEntityCard";
import type { Dataset } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type {
  TheographicClient,
  TheographicPersonDetail,
  TheographicPersonEntry,
  TheographicPlaceEntry,
} from "@packages/seed-bible/seed-bible/managers/TheographicDiscoverProvider";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
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
    getEntity?: () => Promise<unknown>;
    onReferenceClick?: (ref: VerseRef) => void;
    verses?: number[];
    contentType?: "person_profile" | "place_profile" | "event";
    entry?: TheographicPersonEntry | TheographicPlaceEntry;
    openPlace?: (entry: TheographicPlaceEntry) => void;
  } = {}
) {
  const getEntity = vi.fn(
    options.getEntity ?? (() => Promise.resolve(AARON_DETAIL))
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
        client={{ getEntity } as unknown as TheographicClient}
        onReferenceClick={onReferenceClick}
        openPlace={openPlace}
      />,
      container
    );
  });

  return { getEntity, onReferenceClick, openPlace };
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
      "14",
      "27",
      "30",
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

    expect(verseChips().map((chip) => chip.textContent)).toEqual(["1-24"]);
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

    const control = () =>
      container.querySelector(
        ".sb-theographic-card-open"
      ) as HTMLElement | null;

    it("appears on a place that has a position", () => {
      renderCard({ contentType: "place_profile", entry: EGYPT });
      expect(control()).toBeTruthy();
    });

    it("stays away from people and events", () => {
      renderCard({ contentType: "person_profile" });
      expect(control()).toBeNull();

      render(null, container);
      renderCard({ contentType: "event" });
      expect(control()).toBeNull();
    });

    it("stays away from a place the dataset has no position for", () => {
      const { latitude: _lat, longitude: _lng, ...noCoords } = EGYPT;
      renderCard({ contentType: "place_profile", entry: noCoords });

      // Offering it would open a map with nothing to show.
      expect(control()).toBeNull();
    });

    it("hands the place to openPlace", () => {
      const { openPlace } = renderCard({
        contentType: "place_profile",
        entry: EGYPT,
      });

      click(control() as HTMLElement);

      expect(openPlace).toHaveBeenCalledWith(EGYPT);
    });

    it("does not also expand the card", () => {
      const { getEntity } = renderCard({
        contentType: "place_profile",
        entry: EGYPT,
      });

      click(control() as HTMLElement);

      // The control sits beside the expand button, not inside it.
      expect(expandButton().getAttribute("aria-expanded")).toBe("false");
      expect(getEntity).not.toHaveBeenCalled();
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
