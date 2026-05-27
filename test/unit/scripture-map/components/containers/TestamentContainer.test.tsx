import { render } from "preact";
import { act } from "preact/test-utils";
import { TestamentContainer } from "scriptureMap.components.containers.TestamentContainer";
import { useTestamentContainer } from "scriptureMap.hooks.useTestamentContainer";
import type { TestamentInfo } from "bibleVizUtils.domain.models.arrangement";

jest.mock("scriptureMap.hooks.useTestamentContainer", () => ({
  useTestamentContainer: jest.fn(),
}));

jest.mock("scriptureMap.contexts.Testament.TestamentContext", () => ({
  TestamentProvider: ({ children }: { children: preact.ComponentChildren }) =>
    children,
}));

jest.mock("scriptureMap.components.containers.TestamentToggle", () => ({
  TestamentToggle: ({
    toggleshowContent,
    showingContent,
  }: {
    toggleshowContent: () => void;
    showingContent: boolean;
  }) => (
    <div
      data-testid="testament-toggle"
      data-showing={String(showingContent)}
      onClick={toggleshowContent}
    />
  ),
}));

jest.mock("scriptureMap.components.containers.TestamentContent", () => ({
  TestamentContent: ({ hidden }: { hidden: boolean }) => (
    <div data-testid="testament-content" data-hidden={String(hidden)} />
  ),
}));

function makeTestament(overrides: Partial<TestamentInfo> = {}): TestamentInfo {
  return {
    name: "Old Testament",
    sections: [],
    ...overrides,
  } as TestamentInfo;
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    showTestamentLabels: false,
    toggleshowContent: jest.fn(),
    showContent: true,
    ...overrides,
  };
}

describe("TestamentContainer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useTestamentContainer as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(
    testament = makeTestament(),
    testamentIndex = 0,
    hookOverrides: Record<string, unknown> = {}
  ) {
    if (Object.keys(hookOverrides).length > 0) {
      (useTestamentContainer as jest.Mock).mockReturnValue(
        makeHookResult(hookOverrides)
      );
    }
    act(() =>
      render(
        <TestamentContainer
          testament={testament}
          testamentIndex={testamentIndex}
        />,
        container
      )
    );
    return container;
  }

  describe("structure", () => {
    it("renders the .testament-container div", () => {
      setup();
      expect(container.querySelector(".testament-container")).not.toBeNull();
    });
  });

  describe("TestamentToggle", () => {
    it("renders TestamentToggle when showTestamentLabels is true", () => {
      setup(makeTestament(), 0, { showTestamentLabels: true });
      expect(
        container.querySelector("[data-testid='testament-toggle']")
      ).not.toBeNull();
    });

    it("does not render TestamentToggle when showTestamentLabels is false", () => {
      setup(makeTestament(), 0, { showTestamentLabels: false });
      expect(
        container.querySelector("[data-testid='testament-toggle']")
      ).toBeNull();
    });

    it("passes showContent as showingContent to TestamentToggle", () => {
      setup(makeTestament(), 0, {
        showTestamentLabels: true,
        showContent: false,
      });
      const toggle = container.querySelector(
        "[data-testid='testament-toggle']"
      )!;
      expect(toggle.getAttribute("data-showing")).toBe("false");
    });

    it("passes toggleshowContent to TestamentToggle", () => {
      const toggleshowContent = jest.fn();
      setup(makeTestament(), 0, {
        showTestamentLabels: true,
        toggleshowContent,
      });
      act(() => {
        container
          .querySelector("[data-testid='testament-toggle']")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleshowContent).toHaveBeenCalledTimes(1);
    });
  });

  describe("TestamentContent", () => {
    it("always renders TestamentContent", () => {
      setup();
      expect(
        container.querySelector("[data-testid='testament-content']")
      ).not.toBeNull();
    });

    it("passes hidden=false to TestamentContent when showContent is true", () => {
      setup(makeTestament(), 0, { showContent: true });
      const content = container.querySelector(
        "[data-testid='testament-content']"
      )!;
      expect(content.getAttribute("data-hidden")).toBe("false");
    });

    it("passes hidden=true to TestamentContent when showContent is false", () => {
      setup(makeTestament(), 0, { showContent: false });
      const content = container.querySelector(
        "[data-testid='testament-content']"
      )!;
      expect(content.getAttribute("data-hidden")).toBe("true");
    });
  });
});
