import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
  ContentTypeSection,
  contentTypeResultsFor,
} from "@packages/seed-bible/seed-bible/components/DiscoverPane/DiscoveredResultsSections";
import type { DiscoverContentTypeDefinition } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { hasAnyDiscoverResults } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) =>
        (options?.defaultValue as string | undefined) ?? key,
      language: "en",
    }),
  };
});

function createMockTab(
  overrides: {
    discoveredCrossReferences?: unknown[];
    discoveredStudyNotes?: unknown[];
    discoveredContent?: unknown[];
    selectedVerses?: number[];
  } = {}
): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      discoveredCrossReferences: signal(
        overrides.discoveredCrossReferences ?? []
      ),
      discoveredStudyNotes: signal(overrides.discoveredStudyNotes ?? []),
      discoveredContent: signal(overrides.discoveredContent ?? []),
      selectedVerses: signal(
        (overrides.selectedVerses ?? []).map((verse) => ({
          verse: { number: verse },
        }))
      ),
    },
  } as unknown as ReaderTab;
}

/** A content result of a given type, as an extension's provider would build it. */
function typedResult(contentType: string, title: string, verses?: number[]) {
  return {
    type: "content",
    contentType,
    ...(verses ? { verses } : {}),
    title,
    description: `${title} description`,
    reference: { book: "EXO", chapter: 4, verse: verses?.[0] },
    content: <span>{title} card</span>,
  };
}

/** A registered type definition, with a plain-string title for readable asserts. */
function definition(
  id: string,
  overrides: Partial<DiscoverContentTypeDefinition> = {}
): DiscoverContentTypeDefinition {
  return { id, title: `${id} title`, ...overrides };
}

describe("CrossReferencesSection / StudyNotesSection / ContentSection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("shows the select-a-tab hint when there is no tab", () => {
    act(() => {
      render(<CrossReferencesSection tab={null} />, container);
    });

    expect(
      container.querySelector(".sb-discover-section-title")?.textContent
    ).toBe("Cross references");
    expect(container.textContent).toContain(
      "Select a tab to discover related material."
    );
  });

  it("renders nothing when the tab has no cross references", () => {
    const tab = createMockTab({ discoveredCrossReferences: [] });

    act(() => {
      render(<CrossReferencesSection tab={tab} />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders cross reference results for the tab", () => {
    const tab = createMockTab({
      discoveredCrossReferences: [
        {
          providerId: "p1",
          results: [
            {
              type: "cross-reference",
              reference: { chapter: 1, bookData: { name: "Genesis" } },
              crossReference: {
                chapter: 5,
                verse: 3,
                bookData: { commonName: "Exodus", name: "Exodus" },
              },
            },
          ],
        },
      ],
    });

    act(() => {
      render(<CrossReferencesSection tab={tab} />, container);
    });

    expect(container.textContent).toContain("Exodus 5:3");
  });

  it("renders nothing when the tab has no study notes", () => {
    const tab = createMockTab({ discoveredStudyNotes: [] });

    act(() => {
      render(<StudyNotesSection tab={tab} />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders study note results for the tab", () => {
    const tab = createMockTab({
      discoveredStudyNotes: [
        {
          providerId: "p1",
          results: [
            {
              type: "study-note",
              reference: { chapter: 1, bookData: { name: "Genesis" } },
              content: "A helpful note.",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<StudyNotesSection tab={tab} />, container);
    });

    expect(container.textContent).toContain("A helpful note.");
  });

  it("renders nothing when the tab has no content", () => {
    const tab = createMockTab({ discoveredContent: [] });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders content results for the tab", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "Some context",
              content: "The full article.",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    expect(container.textContent).toContain("Background");
    expect(container.textContent).toContain("The full article.");
  });

  it("renders a content result's description with ExpandableText", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "Some context",
              content: "The full article.",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    const description = container.querySelector(
      ".sb-discover-item-description"
    );
    expect(description?.classList.contains("sb-expandable-text")).toBe(true);
    expect(description?.textContent).toContain("Some context");
  });

  it("renders an item's image above its title when provided", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "",
              content: "The full article.",
              image: "https://example.com/thumb.jpg",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    const item = container.querySelector(".sb-discover-item");
    const image = item?.querySelector(".sb-discover-item-image");
    expect(image?.getAttribute("src")).toBe("https://example.com/thumb.jpg");

    const children = Array.from(item?.children ?? []);
    const imageIndex = children.findIndex((el) =>
      el.classList.contains("sb-discover-item-image")
    );
    const titleIndex = children.findIndex((el) =>
      el.classList.contains("sb-discover-item-title")
    );
    expect(imageIndex).toBe(0);
    expect(imageIndex).toBeLessThan(titleIndex);
  });

  it("renders no image when the result doesn't provide one", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "",
              content: "The full article.",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    expect(container.querySelector(".sb-discover-item-image")).toBeNull();
  });

  it("calls the result's onClick when the card is clicked", () => {
    const onClick = vi.fn();
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "",
              content: "The full article.",
              onClick,
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    const item = container.querySelector(".sb-discover-item");
    expect(item?.classList.contains("sb-discover-item--clickable")).toBe(true);

    act(() => {
      item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not mark the card clickable when there's no onClick", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "",
              content: "The full article.",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    const item = container.querySelector(".sb-discover-item");
    expect(item?.classList.contains("sb-discover-item--clickable")).toBe(false);
  });

  it("groups content results into one section per author", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Video 1",
              description: "",
              content: "Video 1 body.",
              author: "Bible Project",
            },
            {
              type: "content",
              title: "Video 2",
              description: "",
              content: "Video 2 body.",
              author: "Bible Project",
            },
            {
              type: "content",
              title: "Article",
              description: "",
              content: "Article body.",
              author: "Jane Doe",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).toEqual(["Bible Project", "Jane Doe"]);
    expect(sectionTitles).not.toContain("Content");

    const bibleProjectSection = Array.from(
      container.querySelectorAll(".sb-discover-section")
    ).find(
      (section) =>
        section.querySelector(".sb-discover-section-title")?.textContent ===
        "Bible Project"
    );
    expect(bibleProjectSection?.textContent).toContain("Video 1");
    expect(bibleProjectSection?.textContent).toContain("Video 2");
    expect(bibleProjectSection?.textContent).not.toContain("Article");
  });

  it("puts authorless results in a general 'Content' section alongside author sections", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Video 1",
              description: "",
              content: "Video 1 body.",
              author: "Bible Project",
            },
            {
              type: "content",
              title: "Untitled note",
              description: "",
              content: "No author here.",
            },
          ],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} />, container);
    });

    const sectionTitles = Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
    expect(sectionTitles).toEqual(["Bible Project", "Content"]);
    expect(container.textContent).toContain("No author here.");
  });

  it("leaves a registered type to its own section", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [
            {
              type: "content",
              title: "Background",
              description: "Some context",
              content: "The full article.",
            },
            typedResult("person_profile", "Aaron", [14]),
          ],
        },
      ],
    });

    act(() => {
      render(
        <ContentSection
          tab={tab}
          contentTypes={[definition("person_profile")]}
        />,
        container
      );
    });

    expect(container.textContent).toContain("The full article.");
    expect(container.textContent).not.toContain("Aaron");
  });

  it("still shows content whose type nobody has registered", () => {
    // An extension that forgets to register its type, or is uninstalled
    // mid-session, must not make its results silently disappear.
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "p1",
          results: [typedResult("person_profile", "Aaron", [14])],
        },
      ],
    });

    act(() => {
      render(<ContentSection tab={tab} contentTypes={[]} />, container);
    });

    expect(container.textContent).toContain("Aaron");
  });

  it("renders nothing at all when the only content is of a registered type", () => {
    const tab = createMockTab({
      discoveredContent: [
        {
          providerId: "extension",
          results: [typedResult("place_profile", "Egypt", [19])],
        },
      ],
    });

    act(() => {
      render(
        <ContentSection
          tab={tab}
          contentTypes={[definition("place_profile")]}
        />,
        container
      );
    });

    expect(container.innerHTML).toBe("");
  });
});

describe("hasAnyDiscoverResults", () => {
  it("is false for a null or undefined reading state", () => {
    expect(hasAnyDiscoverResults(null)).toBe(false);
    expect(hasAnyDiscoverResults(undefined)).toBe(false);
  });

  it("is false when every discovered-results signal is empty", () => {
    const tab = createMockTab();

    expect(hasAnyDiscoverResults(tab.readingState)).toBe(false);
  });

  it("is true when there are cross references, study notes, or content", () => {
    const withCrossReferences = createMockTab({
      discoveredCrossReferences: [{ providerId: "p1", results: [{}] }],
    });
    const withStudyNotes = createMockTab({
      discoveredStudyNotes: [{ providerId: "p1", results: [{}] }],
    });
    const withContent = createMockTab({
      discoveredContent: [{ providerId: "p1", results: [{}] }],
    });

    expect(hasAnyDiscoverResults(withCrossReferences.readingState)).toBe(true);
    expect(hasAnyDiscoverResults(withStudyNotes.readingState)).toBe(true);
    expect(hasAnyDiscoverResults(withContent.readingState)).toBe(true);
  });
});

describe("contentTypeResultsFor", () => {
  const tab = () =>
    createMockTab({
      discoveredContent: [
        {
          providerId: "theographic",
          results: [
            typedResult("person_profile", "Aaron", [14, 27]),
            typedResult("person_profile", "Moses", [1, 14]),
            typedResult("place_profile", "Egypt", [19]),
          ],
        },
      ],
    });

  it("returns only the requested type", () => {
    expect(
      contentTypeResultsFor(tab(), "person_profile").map(
        (result) => result.title
      )
    ).toEqual(["Aaron", "Moses"]);
    expect(
      contentTypeResultsFor(tab(), "place_profile").map(
        (result) => result.title
      )
    ).toEqual(["Egypt"]);
  });

  it("returns the whole chapter when no verse is selected", () => {
    expect(contentTypeResultsFor(tab(), "person_profile")).toHaveLength(2);
  });

  it("keeps only entries appearing in the selected verse", () => {
    const selected = createMockTab({
      discoveredContent: tab().readingState.discoveredContent.value,
      selectedVerses: [27],
    });

    expect(
      contentTypeResultsFor(selected, "person_profile").map(
        (result) => result.title
      )
    ).toEqual(["Aaron"]);
  });

  it("keeps an entry matching any of several selected verses", () => {
    const selected = createMockTab({
      discoveredContent: tab().readingState.discoveredContent.value,
      selectedVerses: [1, 27],
    });

    expect(
      contentTypeResultsFor(selected, "person_profile").map(
        (result) => result.title
      )
    ).toEqual(["Aaron", "Moses"]);
  });

  it("keeps a result that doesn't say which verses it covers", () => {
    // Without `verses`, a result is about the chapter as a whole, so no single
    // verse selection can rule it out.
    const selected = createMockTab({
      discoveredContent: [
        { providerId: "p1", results: [typedResult("note", "Overview")] },
      ],
      selectedVerses: [3],
    });

    expect(
      contentTypeResultsFor(selected, "note").map((result) => result.title)
    ).toEqual(["Overview"]);
  });

  it("returns nothing for a selected verse that names no one", () => {
    const selected = createMockTab({
      discoveredContent: tab().readingState.discoveredContent.value,
      selectedVerses: [99],
    });

    expect(contentTypeResultsFor(selected, "person_profile")).toEqual([]);
  });
});

describe("hasAnyDiscoverResults", () => {
  it("is false for a null or undefined reading state", () => {
    expect(hasAnyDiscoverResults(null)).toBe(false);
    expect(hasAnyDiscoverResults(undefined)).toBe(false);
  });

  it("is false when every discovered-results signal is empty", () => {
    const tab = createMockTab();

    expect(hasAnyDiscoverResults(tab.readingState)).toBe(false);
  });

  it("is true when there are cross references, study notes, or content", () => {
    const withCrossReferences = createMockTab({
      discoveredCrossReferences: [{ providerId: "p1", results: [{}] }],
    });
    const withStudyNotes = createMockTab({
      discoveredStudyNotes: [{ providerId: "p1", results: [{}] }],
    });
    const withContent = createMockTab({
      discoveredContent: [{ providerId: "p1", results: [{}] }],
    });

    expect(hasAnyDiscoverResults(withCrossReferences.readingState)).toBe(true);
    expect(hasAnyDiscoverResults(withStudyNotes.readingState)).toBe(true);
    expect(hasAnyDiscoverResults(withContent.readingState)).toBe(true);
  });
});

describe("ContentTypeSection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const tabWith = (...results: unknown[]) =>
    createMockTab({ discoveredContent: [{ providerId: "p1", results }] });

  function sectionTitles() {
    return Array.from(
      container.querySelectorAll(".sb-discover-section-title")
    ).map((el) => el.textContent);
  }

  it("titles itself from the definition and counts its results", () => {
    const tab = tabWith(
      typedResult("sermon", "First"),
      typedResult("sermon", "Second")
    );

    act(() => {
      render(
        <ContentTypeSection
          tab={tab}
          definition={definition("sermon", { title: "Sermons" })}
        />,
        container
      );
    });

    expect(sectionTitles()).toEqual(["Sermons (2)"]);
  });

  it("resolves a translatable title", () => {
    const tab = tabWith(typedResult("sermon", "First"));

    act(() => {
      render(
        <ContentTypeSection
          tab={tab}
          definition={definition("sermon", {
            title: { key: "sermons", ns: "ext", defaultValue: "Sermons" },
          })}
        />,
        container
      );
    });

    expect(sectionTitles()).toEqual(["Sermons (1)"]);
  });

  it("lays standard results out like ordinary content", () => {
    const tab = tabWith(typedResult("sermon", "First"));

    act(() => {
      render(
        <ContentTypeSection tab={tab} definition={definition("sermon")} />,
        container
      );
    });

    expect(
      container.querySelector(".sb-discover-item-title")?.textContent
    ).toBe("First");
    expect(container.textContent).toContain("First description");
    expect(container.textContent).toContain("First card");
  });

  it("renders only the content for a custom layout, which is the whole card", () => {
    const tab = tabWith(typedResult("person", "Aaron"));

    act(() => {
      render(
        <ContentTypeSection
          tab={tab}
          definition={definition("person", { layout: "custom" })}
        />,
        container
      );
    });

    expect(container.textContent).toContain("Aaron card");
    // Nothing printed around it: no separate title or description.
    expect(container.querySelector(".sb-discover-item-title")).toBeNull();
    expect(container.textContent).not.toContain("Aaron description");
  });

  it("renders nothing when the chapter has none of that type", () => {
    const tab = tabWith(typedResult("other", "Elsewhere"));

    act(() => {
      render(
        <ContentTypeSection tab={tab} definition={definition("sermon")} />,
        container
      );
    });

    expect(container.innerHTML).toBe("");
  });

  it("starts folded when collapsible and hidden by default", () => {
    const tab = tabWith(typedResult("person", "Aaron"));

    act(() => {
      render(
        <ContentTypeSection
          tab={tab}
          definition={definition("person", { hiddenByDefault: true })}
          collapsible
        />,
        container
      );
    });

    expect(sectionTitles()).toEqual(["person title (1)"]);
    expect(container.textContent).not.toContain("Aaron card");
  });

  it("starts open when collapsible but not hidden by default", () => {
    const tab = tabWith(typedResult("sermon", "First"));

    act(() => {
      render(
        <ContentTypeSection
          tab={tab}
          definition={definition("sermon")}
          collapsible
        />,
        container
      );
    });

    expect(container.textContent).toContain("First card");
  });
});
