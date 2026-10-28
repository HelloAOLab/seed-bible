import { render } from "preact";
import { act } from "preact/test-utils";
import {
  FullscreenPane,
  PaneLayout,
  SidePane,
} from "@packages/seed-bible/seed-bible/components/PaneLayout/PaneLayout";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";

describe("PaneLayout", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  describe("header visibility", () => {
    it("shows the header by default", async () => {
      const state = await createTestSeedBibleState({
        config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: false },
      });
      const pane = state.panes.openPane({
        placement: "fullscreen",
        title: "Notes",
        component: () => <div className="notes-body">Notes</div>,
      });

      act(() => {
        render(
          <TestHost state={state}>
            <FullscreenPane state={state} pane={pane} />
          </TestHost>,
          container
        );
      });

      const shell = container.querySelector('[data-placement="fullscreen"]');
      expect(shell?.querySelector(".notes-body")).not.toBeNull();
      expect(shell?.querySelector(".sb-pane-header")).not.toBeNull();
    });

    it("successfully hides the header for fullscreen panes", async () => {
      const state = await createTestSeedBibleState({
        config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: false },
      });
      const pane = state.panes.openPane({
        placement: "fullscreen",
        title: "Notes",
        component: () => <div className="notes-body">Notes</div>,
        showHeader: false,
      });

      act(() => {
        render(
          <TestHost state={state}>
            <FullscreenPane state={state} pane={pane} />
          </TestHost>,
          container
        );
      });

      const shell = container.querySelector('[data-placement="fullscreen"]');
      expect(shell?.querySelector(".notes-body")).not.toBeNull();
      expect(shell?.querySelector(".sb-pane-header")).toBeNull();
    });

    it("successfully hides the header for side panes", async () => {
      const state = await createTestSeedBibleState({
        config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: false },
      });
      const pane = state.panes.openPane({
        placement: "side",
        title: "Notes",
        component: () => <div className="notes-body">Notes</div>,
        showHeader: false,
      });

      act(() => {
        render(
          <TestHost state={state}>
            <SidePane state={state} pane={pane} />
          </TestHost>,
          container
        );
      });

      const shell = container.querySelector('[data-placement="side"]');
      expect(shell?.querySelector(".notes-body")).not.toBeNull();
      expect(shell?.querySelector(".sb-pane-header")).toBeNull();
    });

    it("always keeps the header for floating panes on desktop", async () => {
      const state = await createTestSeedBibleState({
        config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: false },
      });
      state.panes.openPane({
        placement: "floating",
        title: "Notes",
        component: () => <div className="notes-body">Notes</div>,
        showHeader: false,
      });

      act(() => {
        render(
          <TestHost state={state}>
            <PaneLayout state={state} />
          </TestHost>,
          container
        );
      });

      const shell = container.querySelector('[data-placement="floating"]');
      expect(shell?.querySelector(".notes-body")).not.toBeNull();
      expect(shell?.querySelector(".sb-pane-header")).not.toBeNull();
    });

    it("successfully hides the header for floating panes on mobile, as it is treated as a fullscreen pane", async () => {
      const state = await createTestSeedBibleState({
        config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: true },
      });
      state.panes.openPane({
        placement: "floating",
        title: "Notes",
        component: () => <div className="notes-body">Notes</div>,
        showHeader: false,
      });
      const fullscreenPane = state.app.effectivePanes.value.find(
        (pane) => pane.placement === "fullscreen"
      );
      if (!fullscreenPane) {
        throw new Error("Expected the floating pane to display fullscreen");
      }

      act(() => {
        render(
          <TestHost state={state}>
            <FullscreenPane state={state} pane={fullscreenPane} />
            <PaneLayout state={state} />
          </TestHost>,
          container
        );
      });

      const shell = container.querySelector('[data-placement="fullscreen"]');
      expect(shell?.querySelector(".notes-body")).not.toBeNull();
      expect(container.querySelector(".sb-pane-header")).toBeNull();
      expect(container.querySelector('[data-placement="floating"]')).toBeNull();
    });
  });

  describe("sliding a side pane in and out", () => {
    /** Whether the browser counts the user as having just clicked. */
    const setUserActive = (isActive: boolean) => {
      Object.defineProperty(navigator, "userActivation", {
        configurable: true,
        value: { isActive, hasBeenActive: isActive },
      });
    };

    afterEach(() => {
      vi.useRealTimers();
      Reflect.deleteProperty(navigator, "userActivation");
    });

    /** The content row as app/main.tsx lays it out. */
    const Row = (props: {
      state: Awaited<ReturnType<typeof createTestSeedBibleState>>;
      open: boolean;
    }) => {
      const pane = props.state.panes.panes.value.find(
        (candidate) => candidate.placement === "side"
      );
      return (
        <TestHost state={props.state}>
          <div className="sb-content-row">
            {props.open && pane ? (
              <SidePane state={props.state} pane={pane} />
            ) : null}
            <div className="sb-pane-side-ghost-host" />
          </div>
        </TestHost>
      );
    };

    const openNotes = async () => {
      const state = await createTestSeedBibleState({
        config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: false },
      });
      state.panes.openPane({
        placement: "side",
        title: "Notes",
        component: () => (
          <div id="notes-body" className="notes-body">
            Notes
          </div>
        ),
      });
      return state;
    };

    it("slides in when opened just after a click, and a copy slides out when closed", async () => {
      const state = await openNotes();
      vi.useFakeTimers();
      setUserActive(true);

      act(() => render(<Row state={state} open />, container));
      const shell = container.querySelector('[data-placement="side"]');
      expect(shell?.classList.contains("sb-pane-side-shell-entering")).toBe(
        true
      );
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(shell?.classList.contains("sb-pane-side-shell-entering")).toBe(
        false
      );

      act(() => render(<Row state={state} open={false} />, container));

      expect(container.querySelector('[data-placement="side"]')).toBeNull();
      const copy = container.querySelector<HTMLElement>(
        ".sb-pane-side-ghost-host > .sb-pane-side-shell-leaving"
      );
      expect(copy?.textContent).toContain("Notes");
      // Looks like the pane, but can't be used or clash with the page.
      expect(copy?.hasAttribute("inert")).toBe(true);
      expect(copy?.getAttribute("aria-hidden")).toBe("true");
      expect(copy?.querySelector("#notes-body")).toBeNull();
      expect(copy?.querySelector(".notes-body")).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(
        container.querySelector(".sb-pane-side-ghost-host")?.children
      ).toHaveLength(0);
    });

    it("just appears and goes when the user didn't just click", async () => {
      const state = await openNotes();
      setUserActive(false);

      act(() => render(<Row state={state} open />, container));
      expect(
        container
          .querySelector('[data-placement="side"]')
          ?.classList.contains("sb-pane-side-shell-entering")
      ).toBe(false);

      act(() => render(<Row state={state} open={false} />, container));
      expect(
        container.querySelector(".sb-pane-side-ghost-host")?.children
      ).toHaveLength(0);
    });
  });
});
