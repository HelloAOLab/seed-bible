import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  Dialog,
  type DialogProps,
} from "@packages/seed-bible/seed-bible/components/Dialog/Dialog";
import { pressAndRelease } from "../testUtils/pressAndRelease";

const direction = vi.hoisted(() => ({ rtl: false }));

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nContext", async () => {
  const { mockI18nContext } = await import("../testUtils/mockI18n");
  return mockI18nContext({
    get isRtl() {
      return direction.rtl;
    },
  });
});

describe("Dialog", () => {
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
    direction.rtl = false;
  });

  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const backdrop = () =>
    document.querySelector<HTMLElement>(".sb-dialog-backdrop")!;
  const closeButton = () =>
    document.querySelector<HTMLButtonElement>(".sb-dialog-close");
  const action = () => document.querySelector<HTMLElement>(".action")!;

  /**
   * Renders a dialog that unmounts itself when closed, the way callers use
   * it, so "closed" can be checked by the dialog leaving the page.
   */
  function renderDialog(props: Partial<DialogProps> = {}) {
    const open = signal(true);
    const onClose = vi.fn(() => {
      open.value = false;
    });
    function Host() {
      return open.value ? (
        <Dialog title="Delete note?" onClose={onClose} {...props}>
          {props.children ?? (
            <>
              <p className="content">This can't be undone.</p>
              <button type="button" className="action">
                Delete
              </button>
            </>
          )}
        </Dialog>
      ) : null;
    }
    act(() => render(<Host />, container));
    return { onClose, open };
  }

  function pressKey(target: EventTarget, key: string, shiftKey = false) {
    const event = new KeyboardEvent("keydown", {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  }

  describe("opening", () => {
    it("is a modal dialog named by its visible title", () => {
      renderDialog();

      const element = dialog()!;
      expect(element.getAttribute("aria-modal")).toBe("true");
      const titleId = element.getAttribute("aria-labelledby")!;
      expect(document.getElementById(titleId)?.textContent).toBe(
        "Delete note?"
      );
      expect(element.querySelector(".content")?.textContent).toBe(
        "This can't be undone."
      );
    });

    it("takes its name from `label` when it has no visible title", () => {
      renderDialog({ title: undefined, label: "Choose a color" });

      expect(dialog()!.getAttribute("aria-label")).toBe("Choose a color");
      expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
      expect(closeButton()).not.toBeNull();
    });

    it("renders into <body> so no parent stacking context can cover it", () => {
      renderDialog();
      expect(container.querySelector('[role="dialog"]')).toBeNull();
      expect(backdrop().parentElement).toBe(document.body);
    });

    it("stays in place when portal is off", () => {
      renderDialog({ portal: false });
      expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it("keeps right-to-left languages right-to-left outside the app root", () => {
      direction.rtl = true;
      renderDialog();
      expect(dialog()!.getAttribute("dir")).toBe("rtl");
    });

    it("puts the footer after the scrolling body", () => {
      renderDialog({
        footer: (
          <button type="button" className="footer-action">
            Done
          </button>
        ),
      });
      const footer = document.querySelector(".sb-dialog-footer")!;
      expect(footer.previousElementSibling?.className).toBe("sb-dialog-body");
      expect(footer.querySelector(".footer-action")).not.toBeNull();
    });
  });

  describe("closing", () => {
    it("closes from the ✕ button", () => {
      const { onClose } = renderDialog();
      act(() => closeButton()!.click());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(dialog()).toBeNull();
    });

    it("closes when the dimmed page around it is clicked", () => {
      const { onClose } = renderDialog();
      act(() => pressAndRelease(backdrop(), backdrop()));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("stays open when a press inside it is released outside", () => {
      const { onClose } = renderDialog();
      act(() => pressAndRelease(action(), backdrop()));
      act(() => pressAndRelease(action(), action()));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes on Escape", () => {
      const { onClose } = renderDialog();
      const event = pressKey(action(), "Escape");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("can't be closed at all while it isn't dismissible", () => {
      const panelEscape = vi.fn();
      document.addEventListener("keydown", panelEscape);
      const { onClose } = renderDialog({ dismissible: false });

      expect(closeButton()!.disabled).toBe(true);
      pressKey(action(), "Escape");
      act(() => pressAndRelease(backdrop(), backdrop()));
      document.removeEventListener("keydown", panelEscape);

      expect(onClose).not.toHaveBeenCalled();
      // Nor does Escape fall through to what's behind it.
      expect(panelEscape).not.toHaveBeenCalled();
    });
  });

  describe("focus", () => {
    it("moves focus in and gives it back to the opener on close", () => {
      const { open } = renderDialog();
      expect(dialog()!.contains(document.activeElement)).toBe(true);

      act(() => {
        open.value = false;
      });
      expect(document.activeElement).toBe(opener);
    });

    it("can start on a chosen control", () => {
      const start = { current: null as HTMLElement | null };
      renderDialog({
        initialFocusRef: start,
        children: (
          <input
            className="name"
            ref={(el) => {
              start.current = el;
            }}
          />
        ),
      });
      expect(document.activeElement).toBe(document.querySelector(".name"));
    });

    it("keeps Tab inside", () => {
      renderDialog();
      action().focus();

      pressKey(action(), "Tab");
      expect(document.activeElement).toBe(closeButton());

      pressKey(closeButton()!, "Tab", true);
      expect(document.activeElement).toBe(action());
    });
  });
});
