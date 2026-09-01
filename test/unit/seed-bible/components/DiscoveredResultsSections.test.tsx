import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
} from "@packages/seed-bible/seed-bible/components/DiscoverPane/DiscoveredResultsSections";
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
    },
  } as unknown as ReaderTab;
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
