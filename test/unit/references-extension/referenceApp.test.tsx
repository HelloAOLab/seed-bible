import { signal } from "@preact/signals";
import { act } from "preact/test-utils";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { CrossReference } from "@packages/references-extension/references/manager/interfaces";

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const axios = (await import("axios")).default;
const get = vi.mocked(axios.get);

const { openReferencePane } =
  await import("@packages/references-extension/references/manager/referenceApp");
const {
  buttonNamed,
  click,
  createFakeState,
  ref,
  renderInto,
  verseChapter,
  waitForCondition,
} = await import("./referencesTestState");

type FakeState = ReturnType<typeof createFakeState>;

/**
 * Lets a test set the pane's width. jsdom lays nothing out, so without this
 * every pane measures 0px wide and only the narrow layout is reachable.
 */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  static resizeTo(width: number) {
    act(() => {
      for (const observer of FakeResizeObserver.instances) {
        observer.callback(
          [{ contentRect: { width } } as ResizeObserverEntry],
          observer as unknown as ResizeObserver
        );
      }
    });
  }
}

/** Renders every open pane's title and body, the way the app's layout does. */
function PaneHost(props: { fake: FakeState }) {
  return (
    <div>
      {props.fake.state.panes.panes.value.map((pane) => {
        const Title = pane.title;
        const Body = pane.component;
        return (
          <section key={pane.id} data-pane-id={pane.id}>
            <header>{typeof Title === "function" ? <Title /> : Title}</header>
            <Body />
          </section>
        );
      })}
    </div>
  );
}

function openPane(
  fake: FakeState,
  references: CrossReference[],
  title = "Genesis 12:1"
) {
  const currentPane = signal<Pane | null>(null);
  openReferencePane({
    seedBibleState: fake.state,
    currentPane,
    translationId: "WEB",
    references,
    title,
  });
  const container = renderInto(<PaneHost fake={fake} />);
  return { container, currentPane };
}

/** The reference label of the row that's open in the narrow layout. */
function openRow(container: HTMLElement): string | null {
  return (
    container.querySelector(
      ".sb-references-row.is-expanded .sb-references-row-reference"
    )?.textContent ?? null
  );
}

beforeEach(() => {
  get.mockReset();
  document.body.innerHTML = "";
  FakeResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openReferencePane()", () => {
  it("opens a floating pane big enough for the side-by-side layout", () => {
    const fake = createFakeState();

    openPane(fake, [ref()]);

    const [pane] = fake.state.panes.panes.value;
    expect([pane?.placement, pane?.width, pane?.height]).toEqual([
      "floating",
      600,
      560,
    ]);
  });

  it("titles the pane with the verse and how many references it has", async () => {
    const fake = createFakeState();

    const { container } = openPane(fake, [
      ref({ book: "JHN" }),
      ref({ book: "ROM" }),
      ref({ book: "ISA", score: undefined }),
    ]);

    await waitForCondition(
      () => !!container.querySelector("header")?.textContent?.includes("2")
    );
    expect(container.querySelector("header")?.textContent).toBe(
      "Genesis 12:12 cross-references"
    );
  });

  it("shows a verse's own references in the same pane, where it was left", async () => {
    get.mockResolvedValue({
      data: {
        chapter: {
          content: [
            { verse: 1, references: [ref({ book: "ROM", chapter: 4 })] },
          ],
        },
      },
      status: 200,
    });
    const fake = createFakeState();
    const { container } = openPane(fake, [
      ref({ book: "JHN", chapter: 3, verse: 1 }),
    ]);
    const [before] = fake.state.panes.panes.value;
    fake.state.panes.setPanePosition(before!.id, 300, 200);

    click(buttonNamed(container, "John 3:1"));
    await waitForCondition(
      () => !!container.textContent?.includes("Romans 4:1")
    );

    const panes = fake.state.panes.panes.value;
    expect(panes.map((pane) => [pane.id, pane.x, pane.y])).toEqual([
      [before!.id, 300, 200],
    ]);
    expect(container.querySelector("header")?.textContent).toContain(
      "John 3:1"
    );
  });

  it("says so when there are no references", () => {
    const { container } = openPane(createFakeState(), []);

    expect(container.textContent).toContain(
      "No cross references for this verse."
    );
  });

  it("says so when a verse's references can't load", async () => {
    get.mockRejectedValue(new Error("offline"));
    const fake = createFakeState();
    openReferencePane({
      seedBibleState: fake.state,
      currentPane: signal<Pane | null>(null),
      translationId: "WEB",
      referenceById: { bookId: "JHN", chapter: 3, verse: 16 },
      title: "John 3:16",
    });
    const container = renderInto(<PaneHost fake={fake} />);

    await waitForCondition(
      () =>
        !!container.textContent?.includes(
          "Could not load the references for this verse."
        )
    );
  });
});

describe("the narrow references layout", () => {
  it("files references under their sections in canonical order", () => {
    const { container } = openPane(createFakeState(), [
      ref({ book: "ROM", score: 9 }),
      ref({ book: "GEN", chapter: 15, score: 5 }),
      ref({ book: "PSA", score: 3 }),
    ]);

    const headings = [
      ...container.querySelectorAll(".sb-references-section-title"),
    ].map((heading) => heading.textContent);
    expect(headings).toEqual(["Law", "Wisdom", "New Testament"]);
  });

  it("starts with the top row open, even when a lower one is strongest", () => {
    // The strongest reference is in the New Testament, at the bottom; opening
    // it would leave the only open row off screen.
    const { container } = openPane(createFakeState(), [
      ref({ book: "ROM", chapter: 8, verse: 28, score: 9 }),
      ref({ book: "GEN", chapter: 15, verse: 7, score: 5 }),
    ]);

    expect(openRow(container)).toBe("Genesis 15:7");
  });

  it("opens one row at a time", () => {
    const { container } = openPane(createFakeState(), [
      ref({ book: "GEN", chapter: 15, verse: 7, score: 9 }),
      ref({ book: "GEN", chapter: 22, verse: 18, score: 5 }),
    ]);

    click(buttonNamed(container, "Show the text of Genesis 22:18"));

    expect(
      container.querySelectorAll(".sb-references-row.is-expanded")
    ).toHaveLength(1);
    expect(openRow(container)).toBe("Genesis 22:18");
  });

  it("opens the strongest newly loaded reference after Show more", () => {
    // Eleven references: the first page shows ten, one in Genesis at the top
    // and the rest in Romans. The eleventh is a psalm, so it's filed between
    // them, above the button the reader just pressed.
    const references = [
      ref({ book: "GEN", chapter: 15, verse: 7, score: 30 }),
      ...Array.from({ length: 9 }, (_, index) =>
        ref({ book: "ROM", chapter: index + 1, verse: 1, score: 20 - index })
      ),
      ref({ book: "PSA", chapter: 105, verse: 9, score: 1 }),
    ];
    const { container } = openPane(createFakeState(), references);
    expect(container.textContent).not.toContain("Psalms 105:9");

    click(buttonNamed(container, "Show more references"));

    expect(openRow(container)).toBe("Psalms 105:9");
  });

  it("shows each reference's text, and marks only the one that failed", async () => {
    const fake = createFakeState({
      chapters: { "JHN.1": verseChapter(1, "In the beginning was the Word") },
    });
    const { container } = openPane(fake, [
      ref({ book: "JHN", chapter: 1, verse: 1, score: 9 }),
      ref({ book: "MAT", chapter: 1, verse: 1, score: 5 }),
    ]);

    await waitForCondition(
      () => !!container.textContent?.includes("In the beginning was the Word")
    );
    click(buttonNamed(container, "Show the text of Matthew 1:1"));

    expect(
      container.querySelector(".sb-references-row.is-expanded")?.textContent
    ).toContain("Verse text unavailable.");
  });

  it("goes to the chapter in a new tab with the verse highlighted", () => {
    get.mockResolvedValue({
      data: { chapter: { content: [] } },
      status: 200,
    });
    const fake = createFakeState();
    const { container } = openPane(fake, [
      ref({ book: "GEN", chapter: 15, verse: 4, endVerse: 5 }),
    ]);

    click(buttonNamed(container, "Go to chapter"));

    expect(fake.openedTabs.map((tab) => tab.options)).toEqual([
      {
        initialTranslationId: "WEB",
        initialBookId: "GEN",
        initialChapterNumber: 15,
        scrollToVerse: 4,
      },
    ]);
    expect(fake.decorations).toEqual([
      { book: "GEN", chapter: 15, verses: [4, 5] },
    ]);
  });
});

describe("the wide references layout", () => {
  const references = [
    ref({ book: "GEN", chapter: 15, verse: 7, score: 9 }),
    ref({ book: "ROM", chapter: 4, verse: 3, score: 8 }),
    ref({ book: "JHN", chapter: 8, verse: 56, score: 7 }),
  ];

  function selectedInList(container: HTMLElement): string | null {
    return (
      container.querySelector(
        '.sb-references-index-item[aria-current="true"] .sb-references-row-reference'
      )?.textContent ?? null
    );
  }

  it("lists the references beside the selected one's text", () => {
    const { container } = openPane(createFakeState(), references);

    FakeResizeObserver.resizeTo(600);

    expect(selectedInList(container)).toBe("Genesis 15:7");
    expect(container.textContent).toContain("1 of 3");
  });

  it("pages through the references", () => {
    const { container } = openPane(createFakeState(), references);
    FakeResizeObserver.resizeTo(600);

    click(buttonNamed(container, "Next reference"));
    click(buttonNamed(container, "Next reference"));

    expect(selectedInList(container)).toBe("John 8:56");
    expect(container.textContent).toContain("3 of 3");
    expect(buttonNamed(container, "Next reference").disabled).toBe(true);
  });

  it("keeps the reader's place when the pane is resized across layouts", () => {
    const { container } = openPane(createFakeState(), references);
    FakeResizeObserver.resizeTo(600);
    click(
      container.querySelectorAll<HTMLButtonElement>(
        ".sb-references-index-item"
      )[2]!
    );

    FakeResizeObserver.resizeTo(400);
    expect(openRow(container)).toBe("John 8:56");

    FakeResizeObserver.resizeTo(600);
    expect(selectedInList(container)).toBe("John 8:56");
  });
});
