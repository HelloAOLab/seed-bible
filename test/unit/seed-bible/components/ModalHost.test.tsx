import { signal } from "@preact/signals";
import { render } from "preact";
import { act } from "preact/test-utils";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import {
  createModalManager,
  type ModalManager,
  type ModalRegistration,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { pressAndRelease } from "../testUtils/pressAndRelease";
import { TestHost } from "./TestHost";

describe("ModalHost", () => {
  let container: HTMLDivElement;
  let opener: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement("div");
    opener = document.createElement("button");
    document.body.append(container, opener);
    opener.focus();
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    opener.remove();
  });

  async function renderHost(
    registration: Partial<ModalRegistration> = {},
    options: { isMobile?: boolean; manager?: ModalManager } = {}
  ) {
    const state = await createTestSeedBibleState();
    const manager = options.manager ?? createModalManager();
    const isMobile = signal(options.isMobile ?? false);
    act(() => {
      manager.openModal({
        title: "Settings",
        content: () => <input className="test-input" />,
        useCasualOSApp: false,
        ...registration,
      });
    });
    act(() => {
      render(
        <TestHost state={state}>
          <ModalHost manager={manager} isMobile={isMobile} />
        </TestHost>,
        container
      );
    });
    return { manager, isMobile };
  }

  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const backdrop = () =>
    document.querySelector<HTMLElement>(
      ".sb-dialog-backdrop, .sb-bottom-sheet-backdrop"
    )!;
  const input = () => document.querySelector<HTMLElement>(".test-input")!;
  const closeButton = () =>
    document.querySelector<HTMLButtonElement>(
      ".sb-dialog-close, .sb-bottom-sheet-close"
    )!;

  function pressEscape(target: EventTarget) {
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  describe("as a centered dialog", () => {
    it("is a modal dialog named by its title", async () => {
      await renderHost();

      const element = dialog()!;
      expect(element.classList.contains("sb-dialog")).toBe(true);
      expect(element.getAttribute("aria-modal")).toBe("true");
      const titleId = element.getAttribute("aria-labelledby")!;
      expect(document.getElementById(titleId)?.textContent).toBe("Settings");
    });

    it("closes when the dimmed page around it is clicked", async () => {
      const { manager } = await renderHost();

      pressAndRelease(backdrop(), backdrop());

      expect(manager.modals.value).toHaveLength(0);
      expect(dialog()).toBeNull();
    });

    it("stays open when a drag starts in an input and is released outside", async () => {
      const { manager } = await renderHost();

      pressAndRelease(input(), backdrop());

      expect(manager.modals.value).toHaveLength(1);
      expect(document.querySelector(".test-input")).not.toBeNull();
    });

    it("stays open when its content is clicked", async () => {
      const { manager } = await renderHost();

      pressAndRelease(input(), input());

      expect(manager.modals.value).toHaveLength(1);
    });

    it("closes on Escape", async () => {
      const { manager } = await renderHost();

      pressEscape(input());

      expect(manager.modals.value).toHaveLength(0);
    });

    it("shows the footer under the content", async () => {
      await renderHost({
        footer: () => <button className="test-footer">Next</button>,
      });

      expect(closeButton()).not.toBeNull();
      expect(
        document.querySelector(".sb-dialog-footer .test-footer")
      ).not.toBeNull();
    });

    it("has no footer by default", async () => {
      await renderHost();

      expect(document.querySelector(".sb-dialog-footer")).toBeNull();
    });
  });

  describe("focus", () => {
    it("moves into the window when it opens and back to the opener when it closes", async () => {
      const { manager } = await renderHost({ id: "settings" });
      expect(dialog()!.contains(document.activeElement)).toBe(true);

      act(() => manager.closeModal("settings"));

      expect(document.activeElement).toBe(opener);
    });

    it("moves into a window that replaces the one it was in", async () => {
      const { manager } = await renderHost({
        id: "participants",
        title: "Participants",
        content: () => <button className="test-person">Alice</button>,
      });
      document.querySelector<HTMLElement>(".test-person")!.focus();

      // Picking a person closes the list and opens their profile.
      act(() => {
        manager.closeModal("participants");
        manager.openModal({
          id: "profile",
          title: "Alice",
          content: () => <p>Profile</p>,
          useCasualOSApp: false,
        });
      });

      expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      expect(dialog()!.contains(document.activeElement)).toBe(true);

      act(() => manager.closeModal("profile"));
      expect(document.activeElement).toBe(opener);
    });
  });

  describe("with mobileSheet", () => {
    it("opens as a bottom sheet on a phone", async () => {
      const { manager } = await renderHost(
        {
          mobileSheet: true,
          footer: () => <button className="test-footer">Save</button>,
        },
        { isMobile: true }
      );

      const element = dialog()!;
      expect(element.classList.contains("sb-bottom-sheet")).toBe(true);
      expect(element.getAttribute("aria-label")).toBe("Settings");
      expect(element.contains(input())).toBe(true);
      expect(element.querySelector(".test-footer")).not.toBeNull();

      act(() => closeButton().click());
      expect(manager.modals.value).toHaveLength(0);
    });

    it("stays a centered dialog on a wider screen", async () => {
      await renderHost({ mobileSheet: true });

      expect(dialog()!.classList.contains("sb-dialog")).toBe(true);
      expect(document.querySelector(".sb-bottom-sheet")).toBeNull();
    });

    it("leaves other windows centered on a phone", async () => {
      await renderHost({}, { isMobile: true });

      expect(dialog()!.classList.contains("sb-dialog")).toBe(true);
    });

    it("can't be closed while canDismiss is false", async () => {
      const busy = signal(true);
      const { manager } = await renderHost(
        { mobileSheet: true, canDismiss: () => !busy.value },
        { isMobile: true }
      );

      expect(closeButton().disabled).toBe(true);
      pressAndRelease(backdrop(), backdrop());
      pressEscape(input());
      expect(manager.modals.value).toHaveLength(1);

      act(() => {
        busy.value = false;
      });
      act(() => closeButton().click());
      expect(manager.modals.value).toHaveLength(0);
    });
  });

  describe("onDismiss", () => {
    async function renderDismissable() {
      const onDismiss = vi.fn();
      const { manager } = await renderHost({
        id: "dismissable",
        title: "Step",
        content: () => <p className="test-body">Body</p>,
        onDismiss,
      });
      return { manager, onDismiss };
    }

    it("runs when the X button closes the modal", async () => {
      const { manager, onDismiss } = await renderDismissable();

      act(() => closeButton().click());

      expect(manager.modals.value).toHaveLength(0);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("runs when the backdrop closes the modal", async () => {
      const { manager, onDismiss } = await renderDismissable();

      pressAndRelease(backdrop(), backdrop());

      expect(manager.modals.value).toHaveLength(0);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("runs when Escape closes the modal", async () => {
      const { onDismiss } = await renderDismissable();

      pressEscape(dialog()!);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("can't be closed with the X, the backdrop or Escape while canDismiss is false", async () => {
      const busy = signal(true);
      const { manager } = await renderHost({
        id: "busy",
        title: "Step",
        canDismiss: () => !busy.value,
      });

      expect(closeButton().disabled).toBe(true);
      pressAndRelease(backdrop(), backdrop());
      pressEscape(input());
      expect(manager.modals.value).toHaveLength(1);

      act(() => {
        busy.value = false;
      });
      expect(closeButton().disabled).toBe(false);
      act(() => closeButton().click());
      expect(manager.modals.value).toHaveLength(0);
    });

    it("does not run when code closes the modal or the body is clicked", async () => {
      const { manager, onDismiss } = await renderDismissable();
      const body = document.querySelector(".test-body") as HTMLElement;

      pressAndRelease(body, body);
      act(() => manager.closeModal("dismissable"));

      expect(manager.modals.value).toHaveLength(0);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
