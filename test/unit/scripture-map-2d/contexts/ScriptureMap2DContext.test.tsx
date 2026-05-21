import { render } from "preact";
import { act } from "preact/test-utils";
import {
  ScriptureMap2DProvider,
  useScriptureMap2DContext,
} from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useScriptureMap2DProvider } from "scriptureMap2D.contexts.ScriptureMap2D.useScriptureMap2DProvider";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";

jest.mock(
  "scriptureMap2D.contexts.ScriptureMap2D.useScriptureMap2DProvider",
  () => ({
    useScriptureMap2DProvider: jest.fn(() => ({})),
  })
);

const minimalConfig = {
  mode: ScriptureMap2DModes.Viewer,
  onChapterClick: jest.fn(),
} as never;

describe("ScriptureMap2DContext", () => {
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

  describe("useScriptureMap2DContext", () => {
    it("throws when called outside a provider", () => {
      function TestComponent() {
        useScriptureMap2DContext();
        return null;
      }

      expect(() => {
        act(() => render(<TestComponent />, container));
      }).toThrow(
        "useScriptureMap2DContext must be used within a ScriptureMap2DContext"
      );
    });

    it("returns the context value when called inside a provider", () => {
      const contextValue = { arrangement: { name: "default", testaments: [] } };
      (useScriptureMap2DProvider as jest.Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useScriptureMap2DContext();
        return null;
      }

      act(() =>
        render(
          <ScriptureMap2DProvider config={minimalConfig}>
            <Consumer />
          </ScriptureMap2DProvider>,
          container
        )
      );

      expect(receivedContext).toBe(contextValue);
    });
  });

  describe("ScriptureMap2DProvider", () => {
    it("renders nothing when value.arrangement is undefined", () => {
      (useScriptureMap2DProvider as jest.Mock).mockReturnValue({
        arrangement: undefined,
      });

      act(() =>
        render(
          <ScriptureMap2DProvider config={minimalConfig}>
            <div data-testid="child" />
          </ScriptureMap2DProvider>,
          container
        )
      );

      expect(container.querySelector("[data-testid='child']")).toBeNull();
    });

    it("renders children when value.arrangement is defined", () => {
      (useScriptureMap2DProvider as jest.Mock).mockReturnValue({
        arrangement: { name: "default", testaments: [] },
      });

      act(() =>
        render(
          <ScriptureMap2DProvider config={minimalConfig}>
            <div data-testid="child" />
          </ScriptureMap2DProvider>,
          container
        )
      );

      expect(container.querySelector("[data-testid='child']")).not.toBeNull();
    });

    it("calls useScriptureMap2DProvider with the config prop", () => {
      (useScriptureMap2DProvider as jest.Mock).mockReturnValue({
        arrangement: { name: "default", testaments: [] },
      });

      act(() =>
        render(
          <ScriptureMap2DProvider config={minimalConfig}>
            <span />
          </ScriptureMap2DProvider>,
          container
        )
      );

      expect(useScriptureMap2DProvider).toHaveBeenCalledWith(minimalConfig);
    });

    it("passes the value from useScriptureMap2DProvider to consumers", () => {
      const contextValue = {
        arrangement: { name: "default", testaments: [] },
        scaleFactor: 1,
      };
      (useScriptureMap2DProvider as jest.Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useScriptureMap2DContext();
        return null;
      }

      act(() =>
        render(
          <ScriptureMap2DProvider config={minimalConfig}>
            <Consumer />
          </ScriptureMap2DProvider>,
          container
        )
      );

      expect(receivedContext).toBe(contextValue);
    });
  });
});
