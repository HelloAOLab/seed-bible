import { render } from "preact";
import { act } from "preact/test-utils";
import { ScriptureMap2D } from "scriptureMap2D.components.ScriptureMap2D";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";

jest.mock("scriptureMap2D.contexts.Time.TimeContext", () => ({
  TimeProvider: ({ children }: { children: preact.ComponentChildren }) =>
    children,
}));

jest.mock(
  "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext",
  () => ({
    ScriptureMap2DProvider: ({
      children,
    }: {
      children: preact.ComponentChildren;
    }) => children,
  })
);

jest.mock(
  "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext",
  () => ({
    ReadingHistoryProvider: ({
      children,
    }: {
      children: preact.ComponentChildren;
    }) => children,
  })
);

jest.mock("scriptureMap2D.components.containers.ScriptureMap2DWrapper", () => ({
  ScriptureMap2DWrapper: () => <div data-testid="wrapper" />,
}));

function makeConfig(
  overrides: Partial<{ mode: string; project: unknown }> = {}
) {
  return {
    mode: ScriptureMap2DModes.Viewer,
    project: undefined,
    ...overrides,
  } as never;
}

describe("ScriptureMap2D", () => {
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
          <ScriptureMap2D
            config={makeConfig({ mode: ScriptureMap2DModes.Project })}
          />,
          container
        )
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders when mode is Project and project is provided", () => {
      act(() =>
        render(
          <ScriptureMap2D
            config={makeConfig({
              mode: ScriptureMap2DModes.Project,
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
          <ScriptureMap2D
            config={makeConfig({ mode: ScriptureMap2DModes.Viewer })}
          />,
          container
        )
      );
      expect(container.querySelector("[data-testid='wrapper']")).not.toBeNull();
    });

    it("renders when mode is Checkbox regardless of project", () => {
      act(() =>
        render(
          <ScriptureMap2D
            config={makeConfig({ mode: ScriptureMap2DModes.Checkbox })}
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
          <ScriptureMap2D
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
      act(() => render(<ScriptureMap2D config={makeConfig()} />, container));
      expect(container.querySelector("style")).toBeNull();
    });

    it("does not inject a <style> tag when customCSS is empty string", () => {
      act(() =>
        render(<ScriptureMap2D config={makeConfig()} customCSS="" />, container)
      );
      expect(container.querySelector("style")).toBeNull();
    });
  });

  describe("provider composition", () => {
    it("renders the ScriptureMap2DWrapper inside providers", () => {
      act(() => render(<ScriptureMap2D config={makeConfig()} />, container));
      expect(container.querySelector("[data-testid='wrapper']")).not.toBeNull();
    });
  });
});
