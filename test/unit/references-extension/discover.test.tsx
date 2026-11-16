import { signal } from "@preact/signals";
import type { DiscoverContentResult } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
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

const { REFERENCES_CONTENT_TYPE, createReferencesDiscoverProvider } =
  await import("@packages/references-extension/references/manager/discover");
const {
  buttonNamed,
  click,
  createFakeState,
  ref,
  renderInto,
  verseChapter,
  waitForCondition,
} = await import("./referencesTestState");

const CONTEXT = {
  translationId: "WEB",
  book: "GEN",
  chapter: 1,
  language: "en",
};

/** Serves one chapter of the cross-reference dataset. */
function serveChapter(
  verses: Array<{ verse: number; references: CrossReference[] }>
) {
  get.mockResolvedValue({
    data: { chapter: { content: verses } },
    status: 200,
  });
}

async function discover(fake: ReturnType<typeof createFakeState>) {
  const provider = createReferencesDiscoverProvider({
    context: fake.state,
    currentPane: signal<Pane | null>(null),
  });
  return (await provider.discover(CONTEXT)) as DiscoverContentResult[];
}

/** Renders results the way Discover does: an index-keyed list of cards. */
function DiscoverList(props: { results: DiscoverContentResult[] }) {
  return (
    <ul>
      {props.results.map((result, index) => (
        <li key={index}>{result.content}</li>
      ))}
    </ul>
  );
}

beforeEach(() => {
  get.mockReset();
  document.body.innerHTML = "";
});

describe("the references Discover provider", () => {
  it("makes one card per verse that has scored references", async () => {
    serveChapter([
      { verse: 1, references: [ref({ book: "JHN", chapter: 1, verse: 1 })] },
      { verse: 2, references: [ref({ book: "JHN", score: undefined })] },
      { verse: 3, references: [ref({ book: "ISA", chapter: 45, verse: 18 })] },
    ]);

    const results = await discover(createFakeState());

    expect(
      results.map((result) => [result.title, result.verses, result.contentType])
    ).toEqual([
      ["Genesis 1:1", [1], REFERENCES_CONTENT_TYPE],
      ["Genesis 1:3", [3], REFERENCES_CONTENT_TYPE],
    ]);
  });

  it("finds nothing, rather than failing, when the references can't load", async () => {
    // Discover waits on every provider, so a rejection here would take the
    // other providers' results down with it.
    get.mockRejectedValue(new Error("offline"));

    await expect(discover(createFakeState())).resolves.toEqual([]);
  });

  it("falls back to book ids when book names can't load", async () => {
    serveChapter([{ verse: 1, references: [ref({ book: "JHN" })] }]);

    const results = await discover(createFakeState({ booksUnavailable: true }));

    expect(results.map((result) => result.title)).toEqual(["GEN 1:1"]);
  });
});

describe("a references Discover card", () => {
  async function renderCard(
    references: CrossReference[],
    fake = createFakeState()
  ) {
    serveChapter([{ verse: 1, references }]);
    const [result] = await discover(fake);
    const container = renderInto(<DiscoverList results={[result!]} />);
    return { container, fake };
  }

  it("lists the strongest six references and folds the rest away", async () => {
    const references = Array.from({ length: 8 }, (_, index) =>
      ref({ book: "PSA", chapter: index + 1, verse: 1, score: 10 - index })
    );

    const { container } = await renderCard(references);

    const chips = [...container.querySelectorAll(".sb-references-chip")].map(
      (chip) => chip.textContent
    );
    expect(chips).toEqual([
      "Psalms 1:1",
      "Psalms 2:1",
      "Psalms 3:1",
      "Psalms 4:1",
      "Psalms 5:1",
      "Psalms 6:1",
      "+2 more",
    ]);
  });

  it("opens to quote the chip that was picked, without leaving the chapter", async () => {
    const fake = createFakeState({
      chapters: {
        "JHN.1": verseChapter(1, "In the beginning was the Word"),
        "ISA.45": verseChapter(18, "who formed the earth"),
      },
    });
    const { container } = await renderCard(
      [
        ref({ book: "JHN", chapter: 1, verse: 1, score: 9 }),
        ref({ book: "ISA", chapter: 45, verse: 18, score: 5 }),
      ],
      fake
    );

    click(buttonNamed(container, "Isaiah 45:18"));
    await waitForCondition(
      () => !!container.textContent?.includes("who formed the earth")
    );

    expect(container.textContent).not.toContain("In the beginning");
    expect(container.textContent).toContain("Isaiah 45:18 · WEB");
    expect(fake.navigations).toEqual([]);
  });

  it("goes to the quoted reference from Go to verse", async () => {
    const fake = createFakeState({
      chapters: { "JHN.1": verseChapter(1, "In the beginning") },
    });
    const { container } = await renderCard(
      [ref({ book: "JHN", chapter: 1, verse: 1, endVerse: 2 })],
      fake
    );

    click(buttonNamed(container, "John 1:1–2"));
    click(buttonNamed(container, "Go to verse"));

    expect(fake.navigations).toEqual([
      { book: "JHN", chapter: 1, verse: 1, endVerse: 2 },
    ]);
  });

  it("says so when the quoted reference's text can't load", async () => {
    const { container } = await renderCard([ref({ book: "JHN" })]);

    click(buttonNamed(container, "John 1:1"));
    await waitForCondition(
      () => !!container.textContent?.includes("Verse text unavailable.")
    );
  });

  it("opens the verse in a floating references pane from its title", async () => {
    const { container, fake } = await renderCard([ref({ book: "JHN" })]);

    click(buttonNamed(container, "Genesis 1:1"));

    expect(fake.state.panes.panes.value.map((pane) => pane.placement)).toEqual([
      "floating",
    ]);
  });

  it("keeps a docked references pane docked", async () => {
    serveChapter([
      { verse: 1, references: [ref({ book: "JHN" })] },
      { verse: 2, references: [ref({ book: "ROM" })] },
    ]);
    const fake = createFakeState();
    const currentPane = signal<Pane | null>(null);
    const provider = createReferencesDiscoverProvider({
      context: fake.state,
      currentPane,
    });
    const results = (await provider.discover(
      CONTEXT
    )) as DiscoverContentResult[];
    const container = renderInto(<DiscoverList results={results} />);

    click(buttonNamed(container, "Genesis 1:1"));
    const docked = fake.state.panes.panes.value[0]!;
    fake.state.panes.closePane(docked.id);
    currentPane.value = fake.state.panes.openPane({
      ...docked,
      id: "docked",
      placement: "side",
    });
    click(buttonNamed(container, "Genesis 1:2"));

    expect(
      fake.state.panes.panes.value.map((pane) => [pane.id, pane.placement])
    ).toEqual([["docked", "side"]]);
  });

  it("doesn't carry one verse's open state over to another's card", async () => {
    // Discover keys its list by position, so selecting a different verse puts
    // a new card in the slot an open one was in.
    serveChapter([
      { verse: 1, references: [ref({ book: "JHN" })] },
      { verse: 5, references: [ref({ book: "ROM" })] },
    ]);
    const [verseOne, verseFive] = await discover(createFakeState());

    const container = renderInto(<DiscoverList results={[verseOne!]} />);
    click(buttonNamed(container, "John 1:1"));
    expect(container.querySelector(".sb-references-quote")).not.toBeNull();

    const { render } = await import("preact");
    const { act } = await import("preact/test-utils");
    act(() => {
      render(<DiscoverList results={[verseFive!]} />, container);
    });

    expect(container.textContent).toContain("Genesis 1:5");
    expect(container.querySelector(".sb-references-quote")).toBeNull();
  });
});
