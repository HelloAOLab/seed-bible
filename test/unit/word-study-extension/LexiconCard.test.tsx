import { render, type ComponentChild } from "preact";
import { act } from "preact/test-utils";
import { createInMemoryDatasetStore } from "@packages/seed-bible/seed-bible/managers/OfflineDatasetStore";
import type { DatasetLexiconEntry } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { G3056, H0430 } from "./fixtures";
import {
  createProvider,
  goOffline,
  serve,
  useFetchMock,
  waitForCondition,
} from "./harness";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

const { LexiconCard } =
  await import("@packages/word-study-extension/ext_WordStudy/LexiconCard");

const getFetchMock = useFetchMock();

const LEXICON = "api/d/stepbible-lexicon/lexicon";

/** G3056 with its definition replaced, to pin down exactly what links. */
function g3056With(definition: string): DatasetLexiconEntry {
  const entry = structuredClone(G3056);
  entry.entry.senses[0]!.definition = definition;
  return entry;
}

const containers: HTMLDivElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) {
    render(null, container);
    container.remove();
  }
});

function mount(node: ComponentChild) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);
  act(() => {
    render(node, container);
  });
  return container;
}

function showCard(strongsId: string) {
  const onOpenStrongs = vi.fn();
  const onReferenceClick = vi.fn();
  const container = mount(
    <LexiconCard
      provider={createProvider(createInMemoryDatasetStore())}
      strongsId={strongsId}
      onOpenStrongs={onOpenStrongs}
      onReferenceClick={onReferenceClick}
    />
  );
  return { container, onOpenStrongs, onReferenceClick };
}

async function senses(container: HTMLElement) {
  await waitForCondition(
    () => !!container.querySelector(".sb-word-study-sense")
  );
  return [...container.querySelectorAll(".sb-word-study-sense")];
}

function senseIds(container: HTMLElement) {
  return [...container.querySelectorAll(".sb-word-study-sense-meta")].map(
    (meta) => meta.textContent?.split(" · ")[1]
  );
}

function attribution(container: HTMLElement) {
  const credit = container.querySelector(".sb-word-study-attribution");
  return {
    text: credit?.textContent,
    links: [...(credit?.querySelectorAll("a") ?? [])].map((link) =>
      link.getAttribute("href")
    ),
  };
}

describe("LexiconCard", () => {
  it("shows the entry's lemma, transliteration, gloss and part of speech", async () => {
    serve(getFetchMock(), { [`${LEXICON}/G3056.json`]: G3056 });
    const { container } = showCard("G3056");

    const [sense] = await senses(container);

    expect(sense!.querySelector(".sb-word-study-lemma")?.textContent).toBe(
      "λόγος"
    );
    expect(
      sense!.querySelector(".sb-word-study-transliteration")?.textContent
    ).toBe("logos");
    expect(sense!.querySelector(".sb-word-study-gloss")?.textContent).toBe(
      "word"
    );
    expect(senseIds(container)).toEqual(["G3056"]);
  });

  it("lists every sense, the one an extended id names first", async () => {
    serve(getFetchMock(), { [`${LEXICON}/H0430.json`]: H0430 });
    const { container } = showCard("H0430H");

    await senses(container);

    expect(senseIds(container)).toEqual(["H0430H", "H0430G", "H0430I"]);
    expect(
      [...container.querySelectorAll(".sb-word-study-sense-group")].map(
        (heading) => heading.textContent
      )
    ).toEqual(["Sense referred to", "Other senses"]);
  });

  it("keeps the lexicon's order, unlabelled, for a plain id", async () => {
    serve(getFetchMock(), { [`${LEXICON}/H0430.json`]: H0430 });
    const { container } = showCard("H0430");

    await senses(container);

    expect(senseIds(container)).toEqual(["H0430G", "H0430H", "H0430I"]);
    expect(container.querySelector(".sb-word-study-sense-group")).toBeNull();
  });

  it("writes a Hebrew lemma right to left", async () => {
    serve(getFetchMock(), { [`${LEXICON}/H0430.json`]: H0430 });
    const { container } = showCard("H0430");

    const [sense] = await senses(container);

    const lemma = sense!.querySelector(".sb-word-study-lemma");
    expect(lemma?.getAttribute("dir")).toBe("rtl");
    expect(lemma?.getAttribute("lang")).toBe("hbo");
  });

  it("turns the definition's outline headings into a nested list", async () => {
    serve(getFetchMock(), { [`${LEXICON}/G3056.json`]: G3056 });
    const { container } = showCard("G3056");

    const [sense] = await senses(container);

    const outline = sense!.querySelector(".sb-word-study-outline")!;
    const topMarkers = [...outline.children].map(
      (item) =>
        item.querySelector(":scope > .sb-word-study-outline-marker")
          ?.textContent
    );
    expect(topMarkers).toEqual(["I.", "II.", "III."]);
    const firstChildren = outline.querySelector(
      ":scope > li > .sb-word-study-outline"
    );
    expect(
      firstChildren?.querySelector(".sb-word-study-outline-marker")?.textContent
    ).toBe("1.");
    expect(sense!.textContent).not.toContain("__");
  });

  it("links the references it can read and leaves the rest as text", async () => {
    serve(getFetchMock(), {
      [`${LEXICON}/G3056.json`]: g3056With(
        "a word: Mat.8:8, Xyz.1:2 and Luk.7:7"
      ),
    });
    const { container, onReferenceClick } = showCard("G3056");

    const [sense] = await senses(container);
    const links = [...sense!.querySelectorAll("a")];

    expect(links.map((link) => link.textContent)).toEqual([
      "Mat.8:8",
      "Luk.7:7",
    ]);
    expect(sense!.querySelector(".sb-word-study-definition")?.textContent).toBe(
      "a word: Mat.8:8, Xyz.1:2 and Luk.7:7"
    );

    await act(async () => {
      links[0]!.click();
    });
    expect(onReferenceClick).toHaveBeenCalledWith(
      expect.objectContaining({ book: "MAT", chapter: 8, verse: 8 })
    );
  });

  it("opens a Strong's number named in a definition", async () => {
    serve(getFetchMock(), { [`${LEXICON}/H0430.json`]: H0430 });
    const { container, onOpenStrongs } = showCard("H0430");
    await senses(container);

    const link = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open the lexicon entry for H3068G"]'
    );
    expect(link?.textContent).toBe("H3068G");

    await act(async () => {
      link!.click();
    });
    expect(onOpenStrongs).toHaveBeenCalledWith("H3068G");
  });

  it("credits STEPBible, linking the dataset's website and license", async () => {
    serve(getFetchMock(), { [`${LEXICON}/G3056.json`]: G3056 });
    const { container } = showCard("G3056");
    await senses(container);

    expect(attribution(container)).toEqual({
      text: "Definitions: STEPBible.org / Tyndale House, Cambridge, CC BY 4.0",
      links: [G3056.dataset.website, G3056.dataset.licenseUrl],
    });
  });

  it("says there's no definition for an entry the lexicon lacks, still crediting it", async () => {
    serve(getFetchMock(), {});
    const { container } = showCard("H9999");

    await waitForCondition(
      () => !!container.querySelector(".sb-word-study-message")
    );

    expect(container.querySelector(".sb-word-study-message")?.textContent).toBe(
      "No definition available"
    );
    expect(attribution(container).text).toBe(
      "Definitions: STEPBible.org / Tyndale House, Cambridge, CC BY 4.0"
    );
  });

  it("offers a retry when offline, still crediting the lexicon", async () => {
    goOffline(getFetchMock());
    const { container } = showCard("G3056");

    await waitForCondition(() => !!container.querySelector('[role="alert"]'));
    expect(attribution(container).links).toEqual([
      "https://github.com/STEPBible/STEPBible-Data",
      "https://creativecommons.org/licenses/by/4.0/",
    ]);

    serve(getFetchMock(), { [`${LEXICON}/G3056.json`]: G3056 });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-word-study-retry")!
        .click();
    });

    expect(await senses(container)).toHaveLength(1);
  });
});
