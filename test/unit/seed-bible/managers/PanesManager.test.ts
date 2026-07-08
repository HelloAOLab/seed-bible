import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { ComponentChild } from "preact";

function componentReturning(value: string): () => ComponentChild {
  return () => value;
}

describe("createPanes", () => {
  it("starts with no panes and no selection", () => {
    const panes = createPanes();

    expect(panes.panes.value).toHaveLength(0);
    expect(panes.selectedPaneId.value).toBeNull();
  });

  describe("openPane placement: floating", () => {
    it("creates a floating pane and selects it", () => {
      const panes = createPanes();

      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes Component"),
      });

      expect(panes.panes.value).toHaveLength(1);
      expect(pane.placement).toBe("floating");
      expect(pane.title).toBe("Notes");
      expect(pane.component()).toBe("Notes Component");
      expect(panes.selectedPaneId.value).toBe(pane.id);
    });

    it("allows multiple floating panes to coexist, stacked/offset from one another", () => {
      const panes = createPanes();

      const first = panes.openPane({
        placement: "floating",
        title: "First",
        component: componentReturning("First"),
      });
      const second = panes.openPane({
        placement: "floating",
        title: "Second",
        component: componentReturning("Second"),
      });

      expect(panes.panes.value).toHaveLength(2);
      expect(panes.panes.value.map((pane) => pane.id)).toEqual([
        first.id,
        second.id,
      ]);
      // Each new floating pane is offset from the previous one so stacked
      // panes don't sit exactly on top of each other.
      expect(second.x).toBeGreaterThan(first.x);
      expect(second.y).toBeGreaterThan(first.y);
    });
  });

  describe("openPane placement: side", () => {
    it("creates a side pane", () => {
      const panes = createPanes();

      const pane = panes.openPane({
        placement: "side",
        title: "Side Panel",
        component: componentReturning("Side Component"),
      });

      expect(pane.placement).toBe("side");
      expect(panes.panes.value).toHaveLength(1);
    });

    it("replaces an existing side pane when a new one is opened", () => {
      const panes = createPanes();

      const firstSide = panes.openPane({
        placement: "side",
        title: "First Side",
        component: componentReturning("First Side"),
      });
      const secondSide = panes.openPane({
        placement: "side",
        title: "Second Side",
        component: componentReturning("Second Side"),
      });

      expect(panes.panes.value).toHaveLength(1);
      expect(panes.panes.value.some((pane) => pane.id === firstSide.id)).toBe(
        false
      );
      expect(panes.panes.value.some((pane) => pane.id === secondSide.id)).toBe(
        true
      );
    });

    it("does not close floating/fullscreen panes when replacing the side pane", () => {
      const panes = createPanes();

      const floating = panes.openPane({
        placement: "floating",
        title: "Floating",
        component: componentReturning("Floating"),
      });
      const fullscreen = panes.openPane({
        placement: "fullscreen",
        title: "Fullscreen",
        component: componentReturning("Fullscreen"),
      });
      panes.openPane({
        placement: "side",
        title: "First Side",
        component: componentReturning("First Side"),
      });
      panes.openPane({
        placement: "side",
        title: "Second Side",
        component: componentReturning("Second Side"),
      });

      expect(panes.panes.value.some((pane) => pane.id === floating.id)).toBe(
        true
      );
      expect(panes.panes.value.some((pane) => pane.id === fullscreen.id)).toBe(
        true
      );
      expect(
        panes.panes.value.filter((pane) => pane.placement === "side")
      ).toHaveLength(1);
    });
  });

  describe("openPane placement: fullscreen", () => {
    it("allows multiple fullscreen panes to coexist", () => {
      const panes = createPanes();

      const first = panes.openPane({
        placement: "fullscreen",
        title: "First",
        component: componentReturning("First"),
      });
      const second = panes.openPane({
        placement: "fullscreen",
        title: "Second",
        component: componentReturning("Second"),
      });

      expect(panes.panes.value).toHaveLength(2);
      expect(panes.panes.value.some((pane) => pane.id === first.id)).toBe(true);
      expect(panes.panes.value.some((pane) => pane.id === second.id)).toBe(
        true
      );
    });
  });

  describe("openPane with a stable custom id", () => {
    it("creates a pane using the provided id", () => {
      const panes = createPanes();

      const pane = panes.openPane({
        id: "my-custom-pane",
        placement: "floating",
        title: "Custom",
        component: componentReturning("Custom"),
      });

      expect(pane.id).toBe("my-custom-pane");
      expect(
        panes.panes.value.find((p) => p.id === "my-custom-pane")
      ).toBeDefined();
    });

    it("reuses the existing pane and updates its title/component instead of creating a duplicate", () => {
      const panes = createPanes();

      panes.openPane({
        id: "reusable-pane",
        placement: "floating",
        title: "First Title",
        component: componentReturning("First Content"),
      });

      const result = panes.openPane({
        id: "reusable-pane",
        placement: "floating",
        title: "Updated Title",
        component: componentReturning("Updated Content"),
      });

      expect(result.id).toBe("reusable-pane");
      expect(result.title).toBe("Updated Title");
      expect(result.component()).toBe("Updated Content");
      expect(
        panes.panes.value.filter((pane) => pane.id === "reusable-pane")
      ).toHaveLength(1);
    });

    it("does not change the placement of an existing pane on a second call, even when a different placement is requested", () => {
      const panes = createPanes();

      panes.openPane({
        id: "reusable-pane",
        placement: "side",
        title: "First Title",
        component: componentReturning("First Content"),
      });

      const result = panes.openPane({
        id: "reusable-pane",
        placement: "floating",
        title: "Updated Title",
        component: componentReturning("Updated Content"),
      });

      // PanesManager's openPane only updates title/component on reuse; the
      // options.placement passed on the second call is ignored entirely.
      expect(result.placement).toBe("side");
    });

    it("selects the reused pane", () => {
      const panes = createPanes();

      panes.openPane({
        id: "reusable-pane",
        placement: "floating",
        title: "First",
        component: componentReturning("First"),
      });
      const otherPane = panes.openPane({
        placement: "floating",
        title: "Other",
        component: componentReturning("Other"),
      });
      expect(panes.selectedPaneId.value).toBe(otherPane.id);

      const result = panes.openPane({
        id: "reusable-pane",
        placement: "floating",
        title: "Updated",
        component: componentReturning("Updated"),
      });

      expect(panes.selectedPaneId.value).toBe(result.id);
    });
  });

  describe("closePane", () => {
    it("removes the pane and returns true", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });

      const result = panes.closePane(pane.id);

      expect(result).toBe(true);
      expect(panes.panes.value.some((p) => p.id === pane.id)).toBe(false);
    });

    it("returns false for an unknown pane id", () => {
      const panes = createPanes();

      const result = panes.closePane("does-not-exist");

      expect(result).toBe(false);
    });

    it("returns false when closing an already-closed pane", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });

      panes.closePane(pane.id);
      const result = panes.closePane(pane.id);

      expect(result).toBe(false);
    });
  });

  describe("selectPane / selectedPaneId", () => {
    it("selects a pane by id", () => {
      const panes = createPanes();
      const first = panes.openPane({
        placement: "floating",
        title: "First",
        component: componentReturning("First"),
      });
      panes.openPane({
        placement: "floating",
        title: "Second",
        component: componentReturning("Second"),
      });

      panes.selectPane(first.id);

      expect(panes.selectedPaneId.value).toBe(first.id);
    });

    it("ignores selecting an unknown pane id", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "First",
        component: componentReturning("First"),
      });

      panes.selectPane("does-not-exist");

      expect(panes.selectedPaneId.value).toBe(pane.id);
    });

    it("keeps the selection when a different pane is closed", () => {
      const panes = createPanes();
      const first = panes.openPane({
        placement: "floating",
        title: "First",
        component: componentReturning("First"),
      });
      const second = panes.openPane({
        placement: "floating",
        title: "Second",
        component: componentReturning("Second"),
      });
      panes.selectPane(first.id);

      panes.closePane(second.id);

      expect(panes.selectedPaneId.value).toBe(first.id);
    });

    it("falls back to the last remaining pane when the selected pane is closed", () => {
      const panes = createPanes();
      panes.openPane({
        placement: "floating",
        title: "First",
        component: componentReturning("First"),
      });
      const second = panes.openPane({
        placement: "floating",
        title: "Second",
        component: componentReturning("Second"),
      });
      const third = panes.openPane({
        placement: "floating",
        title: "Third",
        component: componentReturning("Third"),
      });
      panes.selectPane(third.id);

      panes.closePane(third.id);

      // syncPaneState's fallback picks the last pane in the list, not the
      // first, when the previously-selected pane is gone.
      expect(panes.selectedPaneId.value).toBe(second.id);
    });

    it("clears the selection when the last pane is closed", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Only",
        component: componentReturning("Only"),
      });

      panes.closePane(pane.id);

      expect(panes.selectedPaneId.value).toBeNull();
    });
  });

  describe("setPanePosition", () => {
    it("updates the position of a floating pane", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });

      panes.setPanePosition(pane.id, 120, 240);

      const moved = panes.panes.value.find((p) => p.id === pane.id);
      expect(moved?.x).toBe(120);
      expect(moved?.y).toBe(240);
    });

    it("never positions a floating pane above/left of the origin", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });

      panes.setPanePosition(pane.id, -500, -500);

      const moved = panes.panes.value.find((p) => p.id === pane.id);
      expect(moved?.x).toBe(0);
      expect(moved?.y).toBe(0);
    });

    it("does not move a side pane", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "side",
        title: "Side",
        component: componentReturning("Side"),
      });
      const originalX = pane.x;
      const originalY = pane.y;

      panes.setPanePosition(pane.id, 300, 300);

      const unchanged = panes.panes.value.find((p) => p.id === pane.id);
      expect(unchanged?.x).toBe(originalX);
      expect(unchanged?.y).toBe(originalY);
    });

    it("does not move a fullscreen pane", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "fullscreen",
        title: "Full",
        component: componentReturning("Full"),
      });
      const originalX = pane.x;
      const originalY = pane.y;

      panes.setPanePosition(pane.id, 300, 300);

      const unchanged = panes.panes.value.find((p) => p.id === pane.id);
      expect(unchanged?.x).toBe(originalX);
      expect(unchanged?.y).toBe(originalY);
    });
  });

  describe("resizePane", () => {
    it("resizes a side pane's width only, ignoring height deltas", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "side",
        title: "Side",
        component: componentReturning("Side"),
      });
      const originalHeight = pane.height;

      panes.resizePane(pane.id, 50, 60, 1);

      const resized = panes.panes.value.find((p) => p.id === pane.id);
      expect(resized?.width).toBe(pane.width + 50);
      expect(resized?.height).toBe(originalHeight);
    });

    it("clamps a side pane's width to a 320px minimum", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "side",
        title: "Side",
        component: componentReturning("Side"),
      });

      panes.resizePane(pane.id, -10000, 0, 1);

      const resized = panes.panes.value.find((p) => p.id === pane.id);
      expect(resized?.width).toBe(320);
    });

    it("resizes both width and height for a floating pane", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });

      panes.resizePane(pane.id, 50, 60, 1);

      const resized = panes.panes.value.find((p) => p.id === pane.id);
      expect(resized?.width).toBe(pane.width + 50);
      expect(resized?.height).toBe(pane.height + 60);
    });

    it("clamps a floating pane's width to 280px and height to 180px minimums", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });

      panes.resizePane(pane.id, -10000, -10000, 1);

      const resized = panes.panes.value.find((p) => p.id === pane.id);
      expect(resized?.width).toBe(280);
      expect(resized?.height).toBe(180);
    });

    it("does not resize a fullscreen pane", () => {
      const panes = createPanes();
      const pane = panes.openPane({
        placement: "fullscreen",
        title: "Full",
        component: componentReturning("Full"),
      });

      panes.resizePane(pane.id, 50, 60, 1);

      const resized = panes.panes.value.find((p) => p.id === pane.id);
      expect(resized?.width).toBe(pane.width);
      expect(resized?.height).toBe(pane.height);
    });

    it("does nothing for an unknown pane id", () => {
      const panes = createPanes();
      panes.openPane({
        placement: "floating",
        title: "Notes",
        component: componentReturning("Notes"),
      });
      const before = panes.panes.value;

      panes.resizePane("does-not-exist", 50, 60, 1);

      expect(panes.panes.value).toEqual(before);
    });
  });
});
