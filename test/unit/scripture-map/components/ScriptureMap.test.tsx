import { render } from "preact";
import { act } from "preact/test-utils";
import { ScriptureMap } from "scriptureMap.components.ScriptureMap";
import { ScriptureMapModes } from "scriptureMap.models.scriptureMap";

jest.mock("scriptureMap.contexts.Time.TimeContext", () => ({
  TimeProvider: ({ children }: { children: preact.ComponentChildren }) =>
    children,
}));

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  ScriptureMapProvider: ({
    children,
  }: {
    children: preact.ComponentChildren;
  }) => children,
}));

jest.mock("scriptureMap.contexts.ReadingHistory.ReadingHistoryContext", () => ({
  ReadingHistoryProvider: ({
    children,
  }: {
    children: preact.ComponentChildren;
  }) => children,
}));

jest.mock("scriptureMap.components.containers.ScriptureMapWrapper", () => ({
  ScriptureMapWrapper: () => <div data-testid="wrapper" />,
}));

function makeConfig(
  overrides: Partial<{ mode: string; project: unknown }> = {}
) {
  return {
    mode: ScriptureMapModes.Viewer,
    project: undefined,
    ...overrides,
  } as never;
}

describe("ScriptureMap", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  describe("null guard", () => {
    it("renders null when mode is Project and project is undefined", () => {
      act(() =>
        render(
          <ScriptureMap
            config={makeConfig({ mode: ScriptureMapModes.Project })}
          />,
          container
        )
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders when mode is Project and project is provided", () => {
      act(() =>
        render(
          <ScriptureMap
            config={makeConfig({
              mode: ScriptureMapModes.Project,
              project: { name: "Test", structure: {} },
            })}
          />,
          container
        )
      );
      expect(container.querySelector("[data-testid='wrapper']")).not.toBeNull();
    });

    it("renders when mode is Viewer regardless of project", () => {
      act(() =>
        render(
          <ScriptureMap
            config={makeConfig({ mode: ScriptureMapModes.Viewer })}
          />,
          container
        )
      );
      expect(container.querySelector("[data-testid='wrapper']")).not.toBeNull();
    });

    it("renders when mode is Checkbox regardless of project", () => {
      act(() =>
        render(
          <ScriptureMap
            config={makeConfig({ mode: ScriptureMapModes.Checkbox })}
          />,
          container
        )
      );
      expect(container.querySelector("[data-testid='wrapper']")).not.toBeNull();
    });
  });

  describe("customCSS", () => {
    it("injects a <style> tag when customCSS is provided", () => {
      act(() =>
        render(
          <ScriptureMap
            config={makeConfig()}
            customCSS=".foo { color: red; }"
          />,
          container
        )
      );
      const style = container.querySelector("style");
      expect(style).not.toBeNull();
      expect(style!.textContent).toBe(".foo { color: red; }");
    });

    it("does not inject a <style> tag when customCSS is undefined", () => {
      act(() => render(<ScriptureMap config={makeConfig()} />, container));
      expect(container.querySelector("style")).toBeNull();
    });

    it("does not inject a <style> tag when customCSS is empty string", () => {
      act(() =>
        render(<ScriptureMap config={makeConfig()} customCSS="" />, container)
      );
      expect(container.querySelector("style")).toBeNull();
    });
  });

  describe("provider composition", () => {
    it("renders the ScriptureMapWrapper inside providers", () => {
      act(() => render(<ScriptureMap config={makeConfig()} />, container));
      expect(container.querySelector("[data-testid='wrapper']")).not.toBeNull();
    });
  });
});
