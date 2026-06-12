import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { SocialSection } from "todayScreen.infrastructure.presentation.components.containers.SocialSection";
import { useSocialSection } from "todayScreen.infrastructure.presentation.hooks.useSocialSection";
import { SocialSectionProvider } from "todayScreen.infrastructure.presentation.contexts.socialSection.SocialSectionContext";
import { TitledSection } from "todayScreen.infrastructure.presentation.components.ui.TitledSection";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useSocialSection",
  () => ({
    useSocialSection: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.socialSection.SocialSectionContext",
  () => ({
    SocialSectionProvider: jest.fn(
      ({ children }: { value: unknown; children: ComponentChildren }) => (
        <div data-testid="social-provider">{children}</div>
      )
    ),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.TitledSection",
  () => ({
    TitledSection: jest.fn(
      ({ title, children }: { title: string; children: ComponentChildren }) => (
        <div data-testid="titled-section" data-title={title}>
          {children}
        </div>
      )
    ),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.HistoryCard",
  () => ({
    HistoryCard: jest.fn(() => <div data-testid="history-card" />),
  })
);

type Result = ReturnType<typeof useSocialSection>;

function makeResult(overrides: Partial<Result> = {}): Result {
  return {
    title: "COMMUNITY",
    userFilters: new Map([["u1", true]]),
    userProfileMap: new Map(),
    toggleUserFilter: jest.fn(),
    year: 2026,
    timespan: { from: 1, to: 2 },
    communityReading: {},
    selectYear: jest.fn(),
    selectDay: jest.fn(),
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
    jest.clearAllMocks();
  });

  function setup(overrides: Partial<Result> = {}) {
    const result = makeResult(overrides);
    (useSocialSection as jest.Mock).mockReturnValue(result);
    act(() => render(<SocialSection />, container));
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
    const value = (SocialSectionProvider as jest.Mock).mock.calls[0]![0].value;

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
    expect((TitledSection as jest.Mock).mock.calls[0]![0].title).toBe(
      "COMMUNITY"
    );
  });
});
