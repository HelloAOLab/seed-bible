import { render } from "preact";
import { act } from "preact/test-utils";
import {
  SocialSectionProvider,
  useSocialSectionContext,
  type SocialSectionContextType,
} from "todayScreen.infrastructure.presentation.contexts.socialSection.SocialSectionContext";

function makeValue(
  overrides: Partial<SocialSectionContextType> = {}
): SocialSectionContextType {
  return {
    userFilters: new Map([["u1", true]]),
    userProfileMap: new Map(),
    year: 2026,
    timespan: undefined,
    communityReading: {},
    selectYear: jest.fn(),
    selectDay: jest.fn(),
    toggleUserFilter: jest.fn(),
    ...overrides,
  };
}

describe("SocialSectionContext", () => {
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

  it("provides the context value to consumers within the provider", () => {
    const value = makeValue();
    const captured = { current: null as SocialSectionContextType | null };

    function Consumer() {
      captured.current = useSocialSectionContext();
      return null;
    }

    act(() =>
      render(
        <SocialSectionProvider value={value}>
          <Consumer />
        </SocialSectionProvider>,
        container
      )
    );

    expect(captured.current).toBe(value);
  });

  it("renders its children", () => {
    act(() =>
      render(
        <SocialSectionProvider value={makeValue()}>
          <div data-testid="child" />
        </SocialSectionProvider>,
        container
      )
    );

    expect(container.querySelector("[data-testid='child']")).not.toBeNull();
  });

  it("throws when used outside of a provider", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function OrphanConsumer() {
      useSocialSectionContext();
      return null;
    }

    expect(() => act(() => render(<OrphanConsumer />, container))).toThrow(
      "useSocialSectionContext must be used within a SocialSectionProvider"
    );

    consoleError.mockRestore();
  });
});
