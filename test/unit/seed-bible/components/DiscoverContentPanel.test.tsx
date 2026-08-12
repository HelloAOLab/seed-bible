import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DiscoverContentPanel } from "@packages/seed-bible/seed-bible/components/DiscoverContentPanel/DiscoverContentPanel";
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

const RESULTS_FIXTURE = [
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
];

function createMockTab(
  overrides: {
    discoverContentPanelVisible?: boolean;
    discoveredCrossReferences?: unknown[];
  } = {}
): ReaderTab {
  return {
    id: "tab-1",
    readingState: {
      discoverContentPanelVisible: signal(
        overrides.discoverContentPanelVisible ?? true
      ),
      discoveredCrossReferences: signal(
        overrides.discoveredCrossReferences ?? []
      ),
      discoveredStudyNotes: signal([]),
      discoveredContent: signal([]),
    },
  } as unknown as ReaderTab;
}

describe("DiscoverContentPanel", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders nothing when there is no tab", () => {
    act(() => {
      render(<DiscoverContentPanel tab={null} variant="side" />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when the tab's toggle is off, even with results", () => {
    const tab = createMockTab({
      discoverContentPanelVisible: false,
      discoveredCrossReferences: RESULTS_FIXTURE,
    });

    act(() => {
      render(<DiscoverContentPanel tab={tab} variant="side" />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when there are no discovered results, even with the toggle on", () => {
    const tab = createMockTab({ discoverContentPanelVisible: true });

    act(() => {
      render(<DiscoverContentPanel tab={tab} variant="side" />, container);
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders the discovered content with the side variant class", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });

    act(() => {
      render(<DiscoverContentPanel tab={tab} variant="side" />, container);
    });

    const panel = container.querySelector(".sb-discover-content-panel");
    expect(panel?.classList.contains("sb-discover-content-panel--side")).toBe(
      true
    );
    expect(container.textContent).toContain("Exodus 5:3");
  });

  it("renders the discovered content with the inline variant class", () => {
    const tab = createMockTab({ discoveredCrossReferences: RESULTS_FIXTURE });

    act(() => {
      render(<DiscoverContentPanel tab={tab} variant="inline" />, container);
    });

    const panel = container.querySelector(".sb-discover-content-panel");
    expect(panel?.classList.contains("sb-discover-content-panel--inline")).toBe(
      true
    );
  });
});
