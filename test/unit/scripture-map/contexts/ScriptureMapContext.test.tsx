import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import {
  ScriptureMapProvider,
  useScriptureMapContext,
} from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";
import { useScriptureMapProvider } from "../../../../packages/scripture-map/contexts/ScriptureMap/useScriptureMapProvider";
import { ScriptureMapModes } from "../../../../packages/scripture-map/models/scriptureMap";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/useScriptureMapProvider",
  () => ({
    useScriptureMapProvider: vi.fn(() => ({})),
  })
);

const minimalConfig = {
  mode: ScriptureMapModes.Viewer,
  onChapterClick: vi.fn(),
} as never;

describe("ScriptureMapContext", () => {
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

  describe("useScriptureMapContext", () => {
    it("throws when called outside a provider", () => {
      function TestComponent() {
        useScriptureMapContext();
        return null;
      }

      expect(() => {
        act(() => render(<TestComponent />, container));
      }).toThrow(
        "useScriptureMapContext must be used within a ScriptureMapContext"
      );
    });

    it("returns the context value when called inside a provider", () => {
      const contextValue = { arrangement: { name: "default", testaments: [] } };
      (useScriptureMapProvider as Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useScriptureMapContext();
        return null;
      }

      act(() =>
        render(
          <ScriptureMapProvider config={minimalConfig}>
            <Consumer />
          </ScriptureMapProvider>,
          container
        )
      );

      expect(receivedContext).toBe(contextValue);
    });
  });

  describe("ScriptureMapProvider", () => {
    it("renders nothing when value.arrangement is undefined", () => {
      (useScriptureMapProvider as Mock).mockReturnValue({
        arrangement: undefined,
      });

      act(() =>
        render(
          <ScriptureMapProvider config={minimalConfig}>
            <div data-testid="child" />
          </ScriptureMapProvider>,
          container
        )
      );

      expect(container.querySelector("[data-testid='child']")).toBeNull();
    });

    it("renders children when value.arrangement is defined", () => {
      (useScriptureMapProvider as Mock).mockReturnValue({
        arrangement: { name: "default", testaments: [] },
      });

      act(() =>
        render(
          <ScriptureMapProvider config={minimalConfig}>
            <div data-testid="child" />
          </ScriptureMapProvider>,
          container
        )
      );

      expect(container.querySelector("[data-testid='child']")).not.toBeNull();
    });

    it("calls useScriptureMapProvider with the config prop", () => {
      (useScriptureMapProvider as Mock).mockReturnValue({
        arrangement: { name: "default", testaments: [] },
      });

      act(() =>
        render(
          <ScriptureMapProvider config={minimalConfig}>
            <span />
          </ScriptureMapProvider>,
          container
        )
      );

      expect(useScriptureMapProvider).toHaveBeenCalledWith(minimalConfig);
    });

    it("passes the value from useScriptureMapProvider to consumers", () => {
      const contextValue = {
        arrangement: { name: "default", testaments: [] },
        scaleFactor: 1,
      };
      (useScriptureMapProvider as Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useScriptureMapContext();
        return null;
      }

      act(() =>
        render(
          <ScriptureMapProvider config={minimalConfig}>
            <Consumer />
          </ScriptureMapProvider>,
          container
        )
      );

      expect(receivedContext).toBe(contextValue);
    });
  });
});
