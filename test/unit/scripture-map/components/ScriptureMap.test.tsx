import { render } from "preact";
import { act } from "preact/test-utils";
import { ScriptureMap } from "../../../../packages/scripture-map/components/ScriptureMap";
import { ScriptureMapModes } from "../../../../packages/scripture-map/models/scriptureMap";

vi.mock("../../../../packages/scripture-map/contexts/Time/TimeContext", () => ({
  TimeProvider: ({ children }: { children: preact.ComponentChildren }) =>
    children,
}));

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    ScriptureMapProvider: ({
      children,
    }: {
      children: preact.ComponentChildren;
    }) => children,
  })
);

vi.mock(
  "../../../../packages/scripture-map/contexts/ReadingHistory/ReadingHistoryContext",
  () => ({
    ReadingHistoryProvider: ({
      children,
    }: {
      children: preact.ComponentChildren;
    }) => children,
  })
);

vi.mock(
  "../../../../packages/scripture-map/components/containers/ScriptureMapWrapper",
  () => ({
    ScriptureMapWrapper: () => <div data-testid="wrapper" />,
  })
);

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

  // The `customCSS` prop / <style> injection was removed from ScriptureMap;
  // the component now only accepts a `config` prop and never renders a <style> tag.
  describe("customCSS", () => {
    it("does not inject a <style> tag", () => {
      act(() => render(<ScriptureMap config={makeConfig()} />, container));
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
