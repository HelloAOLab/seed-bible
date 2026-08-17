import type { Mock } from "vitest";
import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { todayStub, loginWithName } from "../../testUtils/todayStubs";
const themeStub = () =>
  signal({
    variables: {},
  } as unknown as import("@packages/seed-bible/seed-bible/managers/ThemeManager").BibleTheme);

import { SocialSection } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSection";
import { useSocialSection } from "@packages/seed-bible/seed-bible/components/TodayPane/useSocialSection";
import { SocialSectionProvider } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext";
import { TitledSection } from "@packages/seed-bible/seed-bible/components/TodayPane/TitledSection";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/useSocialSection",
  () => ({
    useSocialSection: vi.fn(),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext",
  () => ({
    SocialSectionProvider: vi.fn(
      ({ children }: { value: unknown; children: ComponentChildren }) => (
        <div data-testid="social-provider">{children}</div>
      )
    ),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TitledSection",
  () => ({
    TitledSection: vi.fn(
      ({ title, children }: { title: string; children: ComponentChildren }) => (
        <div data-testid="titled-section" data-title={title}>
          {children}
        </div>
      )
    ),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/HistoryCard",
  () => ({
    HistoryCard: vi.fn(() => <div data-testid="history-card" />),
  })
);

type Result = ReturnType<typeof useSocialSection>;

function makeResult(overrides: Partial<Result> = {}): Result {
  return {
    title: "COMMUNITY",
    userFilters: new Map([["u1", true]]),
    userProfileMap: new Map(),
    toggleUserFilter: vi.fn(),
    year: 2026,
    timespan: { from: 1, to: 2 },
    communityReading: {},
    selectYear: vi.fn(),
    selectDay: vi.fn(),
    ...overrides,
  } as unknown as Result;
}

describe("SocialSection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(overrides: Partial<Result> = {}) {
    const result = makeResult(overrides);
    (useSocialSection as Mock).mockReturnValue(result);
    act(() =>
      render(
        <SocialSection
          today={todayStub({})}
          login={loginWithName("Tester")}
          theme={themeStub()}
          onOpenPassage={vi.fn()}
        />,
        container
      )
    );
    return result;
  }

  const q = (sel: string) => container.querySelector(sel);

  it("renders the provider wrapping the titled section and history card", () => {
    setup();
    const provider = q("[data-testid='social-provider']")!;
    expect(provider).not.toBeNull();
    const titled = provider.querySelector("[data-testid='titled-section']")!;
    expect(titled).not.toBeNull();
    expect(titled.querySelector("[data-testid='history-card']")).not.toBeNull();
  });

  it("forwards the title to the TitledSection", () => {
    setup({ title: "Comunidad" });
    expect(
      q("[data-testid='titled-section']")!.getAttribute("data-title")
    ).toBe("Comunidad");
  });

  it("passes the social-section state (without title) to the provider value", () => {
    const result = setup();
    const value = (SocialSectionProvider as Mock).mock.calls[0]![0].value;

    expect(value).toEqual({
      userFilters: result.userFilters,
      userProfileMap: result.userProfileMap,
      toggleUserFilter: result.toggleUserFilter,
      year: result.year,
      timespan: result.timespan,
      communityReading: result.communityReading,
      selectYear: result.selectYear,
      selectDay: result.selectDay,
    });
    expect(value).not.toHaveProperty("title");
  });

  it("forwards the title only to TitledSection, not into the provider value", () => {
    setup({ title: "COMMUNITY" });
    expect((TitledSection as Mock).mock.calls[0]![0].title).toBe("COMMUNITY");
  });
});
