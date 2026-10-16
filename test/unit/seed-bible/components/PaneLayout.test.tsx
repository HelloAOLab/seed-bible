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
import { describe, beforeEach, afterEach, it, expect } from "vitest";

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
});
