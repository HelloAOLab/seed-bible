import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  BottomSheet,
  type BottomSheetProps,
} from "@packages/seed-bible/seed-bible/components/BottomSheet/BottomSheet";

const direction = vi.hoisted(() => ({ rtl: false }));

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager({
    get isRtl() {
      return direction.rtl;
    },
  });
});

describe("BottomSheet", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      render(null, container);
    });
    container.remove();
    direction.rtl = false;
  });

  const sheet = () =>
    document.querySelector<HTMLElement>(".sb-bottom-sheet") ?? null;
  const backdrop = () =>
    document.querySelector<HTMLElement>(".sb-bottom-sheet-backdrop");
  const handle = () =>
    document.querySelector<HTMLElement>(".sb-bottom-sheet-handle-area")!;
  const closeButton = () =>
    document.querySelector<HTMLButtonElement>(".sb-bottom-sheet-close");

  /**
   * Renders a sheet that unmounts itself when closed, the way every caller
   * uses it, so "closed" can be checked by the sheet leaving the page.
   */
  function renderSheet(props: Partial<BottomSheetProps> = {}) {
    const open = signal(true);
    const onClose = vi.fn(() => {
      open.value = false;
    });
    function Host() {
      return open.value ? (
        <BottomSheet label="Reading settings" onClose={onClose} {...props}>
          {props.children ?? (
            <>
              <p className="content">Font size</p>
              <button type="button" className="first-action">
                Bigger
              </button>
            </>
          )}
        </BottomSheet>
      ) : null;
    }
    act(() => {
      render(<Host />, container);
    });
    return { onClose, open };
  }

  function pointer(
    target: HTMLElement,
    type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    clientY: number
  ) {
    act(() => {
      target.dispatchEvent(
        new window.PointerEvent(type, {
          pointerId: 1,
          clientY,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  function drag(target: HTMLElement, fromY: number, toY: number) {
    pointer(target, "pointerdown", fromY);
    pointer(target, "pointermove", toY);
    pointer(target, "pointerup", toY);
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
    it("shows its title and content as a labelled modal dialog over the page", () => {
      renderSheet({ title: "Theme & text", titleIcon: "auto_stories" });

      const dialog = sheet();
      expect(dialog).not.toBeNull();
      expect(dialog!.getAttribute("role")).toBe("dialog");
      expect(dialog!.getAttribute("aria-modal")).toBe("true");
      expect(dialog!.getAttribute("aria-label")).toBe("Reading settings");
      expect(
        dialog!.querySelector(".sb-bottom-sheet-title")?.textContent
      ).toContain("Theme & text");
      expect(dialog!.querySelector(".content")?.textContent).toBe("Font size");
      expect(backdrop()).not.toBeNull();
    });

    it("renders into <body> so no parent stacking context can cover it", () => {
      renderSheet();
      expect(container.querySelector(".sb-bottom-sheet")).toBeNull();
      expect(sheet()?.parentElement).toBe(document.body);
    });

    it("keeps right-to-left languages right-to-left outside the app root", () => {
      direction.rtl = true;
      renderSheet();
      expect(sheet()!.getAttribute("dir")).toBe("rtl");
    });

    it("lays out left-to-right otherwise", () => {
      renderSheet();
      expect(sheet()!.getAttribute("dir")).toBe("ltr");
    });

    it("stays in place when portal is off", () => {
      renderSheet({ portal: false });
      expect(container.querySelector(".sb-bottom-sheet")).not.toBeNull();
    });

    it("puts the footer after the scrolling body", () => {
      renderSheet({ footer: <button className="footer-action">Share</button> });
      const body = sheet()!.querySelector(".sb-bottom-sheet-body")!;
      expect(body.querySelector(".content")).not.toBeNull();
      expect(body.querySelector(".footer-action")).toBeNull();
      expect(sheet()!.querySelector(".footer-action")).not.toBeNull();
    });
  });

  describe("closing", () => {
    it("closes when the backdrop is tapped", () => {
      const { onClose } = renderSheet();
      act(() => {
        backdrop()!.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true })
        );
        backdrop()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(sheet()).toBeNull();
    });

    it("stays open when a press inside the sheet is released over the backdrop", () => {
      const { onClose } = renderSheet();
      act(() => {
        sheet()!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        backdrop()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(sheet()).not.toBeNull();
    });

    it("stays open when its content is tapped", () => {
      const { onClose } = renderSheet();
      act(() => {
        document.querySelector<HTMLElement>(".first-action")!.click();
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes from the ✕ button", () => {
      const { onClose } = renderSheet({ title: "Participants" });
      expect(closeButton()!.getAttribute("aria-label")).toBe("Close");
      act(() => {
        closeButton()!.click();
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(sheet()).toBeNull();
    });

    it("lets the ✕ button do something else, such as going back", () => {
      const onBack = vi.fn();
      const { onClose } = renderSheet({
        onCloseButton: onBack,
        closeLabel: "Back",
        closeIcon: "arrow_back",
      });
      expect(closeButton()!.getAttribute("aria-label")).toBe("Back");
      // A back arrow has to point the other way in right-to-left languages.
      expect(closeButton()!.querySelector(".rtl-mirror")?.textContent).toBe(
        "arrow_back"
      );
      act(() => {
        closeButton()!.click();
      });
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("has no ✕ button when asked not to", () => {
      renderSheet({ showClose: false, title: "Participants" });
      expect(closeButton()).toBeNull();
    });

    it("closes on Escape", () => {
      const { onClose } = renderSheet();
      const event = pressKey(
        document.querySelector<HTMLElement>(".first-action")!,
        "Escape"
      );
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
      expect(sheet()).toBeNull();
    });

    it("leaves Escape to a control inside it that already handled it", () => {
      const { onClose } = renderSheet({
        children: (
          <input
            className="search"
            onKeyDown={(event) => {
              if (event.key === "Escape") event.preventDefault();
            }}
          />
        ),
      });
      pressKey(document.querySelector(".search")!, "Escape");
      expect(onClose).not.toHaveBeenCalled();
    });

    it("leaves Escape alone when focus is in something stacked above it", () => {
      const { onClose } = renderSheet();
      const otherDialog = document.createElement("input");
      document.body.appendChild(otherDialog);
      try {
        pressKey(otherDialog, "Escape");
        expect(onClose).not.toHaveBeenCalled();
      } finally {
        otherDialog.remove();
      }
    });
  });

  describe("focus", () => {
    it("moves focus into the sheet and hands it back to the opener on close", () => {
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      try {
        const { open } = renderSheet();
        expect(sheet()!.contains(document.activeElement)).toBe(true);

        act(() => {
          open.value = false;
        });
        expect(document.activeElement).toBe(opener);
      } finally {
        opener.remove();
      }
    });

    it("keeps Tab inside the sheet", () => {
      renderSheet({ title: "Settings" });
      const close = closeButton()!;
      const last = document.querySelector<HTMLElement>(".first-action")!;

      last.focus();
      const forward = pressKey(last, "Tab");
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(close);

      const backward = pressKey(close, "Tab", true);
      expect(backward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(last);
    });
  });

  describe("without a backdrop", () => {
    it("is a non-modal dialog that leaves the page usable and focus where it was", () => {
      const reader = document.createElement("button");
      document.body.appendChild(reader);
      reader.focus();
      try {
        renderSheet({ backdrop: false });
        expect(backdrop()).toBeNull();
        expect(sheet()!.getAttribute("role")).toBe("dialog");
        expect(sheet()!.hasAttribute("aria-modal")).toBe(false);
        expect(document.activeElement).toBe(reader);

        // Escape pressed on the page is the page's business...
        pressKey(reader, "Escape");
        expect(sheet()).not.toBeNull();
      } finally {
        reader.remove();
      }
    });

    it("still closes on Escape from inside the sheet", () => {
      const { onClose } = renderSheet({ backdrop: false });
      pressKey(document.querySelector(".first-action")!, "Escape");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("dragging the handle", () => {
    it("closes when dragged down far enough", () => {
      const { onClose } = renderSheet();
      drag(handle(), 500, 600);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(sheet()).toBeNull();
    });

    it("follows the finger down, then springs back when let go too early", () => {
      const { onClose } = renderSheet();
      pointer(handle(), "pointerdown", 500);
      pointer(handle(), "pointermove", 530);
      expect(sheet()!.style.transform).toBe("translateY(30px)");
      expect(sheet()!.className).toContain("sb-bottom-sheet-dragging");

      pointer(handle(), "pointerup", 530);
      expect(onClose).not.toHaveBeenCalled();
      expect(sheet()!.style.transform).toBe("");
      expect(sheet()!.className).not.toContain("sb-bottom-sheet-dragging");
    });

    it("doesn't move up past where it rests", () => {
      renderSheet();
      pointer(handle(), "pointerdown", 500);
      pointer(handle(), "pointermove", 400);
      expect(sheet()!.style.transform).toBe("");
    });

    it("also drags from the title row", () => {
      const { onClose } = renderSheet({ title: "Participants" });
      drag(
        document.querySelector<HTMLElement>(".sb-bottom-sheet-title")!,
        500,
        600
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("leaves the body free to scroll", () => {
      const { onClose } = renderSheet();
      drag(document.querySelector<HTMLElement>(".content")!, 500, 600);
      expect(onClose).not.toHaveBeenCalled();
      expect(sheet()!.style.transform).toBe("");
    });

    it("drags from anywhere outside buttons when asked to", () => {
      const { onClose } = renderSheet({ dragSurface: "sheet" });
      drag(document.querySelector<HTMLElement>(".first-action")!, 500, 600);
      expect(onClose).not.toHaveBeenCalled();

      drag(document.querySelector<HTMLElement>(".content")!, 500, 600);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("doesn't drag while dragging is turned off", () => {
      const { onClose } = renderSheet({ dragDisabled: true });
      drag(handle(), 500, 700);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("springs back when the gesture is cancelled", () => {
      const { onClose } = renderSheet();
      pointer(handle(), "pointerdown", 500);
      pointer(handle(), "pointermove", 600);
      pointer(handle(), "pointercancel", 600);
      expect(onClose).not.toHaveBeenCalled();
      expect(sheet()!.style.transform).toBe("");
    });

    it("is hidden from assistive tech when there is nothing to expand", () => {
      renderSheet();
      expect(handle().getAttribute("aria-hidden")).toBe("true");
      expect(handle().hasAttribute("role")).toBe(false);
    });
  });

  describe("expanding", () => {
    function renderExpandable(canExpand = true) {
      const expanded = signal(false);
      const reveals: Array<number | null> = [];
      const result = renderSheet({
        get expansion() {
          return {
            expanded: expanded.value,
            onExpandedChange: (next: boolean) => {
              expanded.value = next;
            },
            canExpand,
            distance: 200,
            onDragReveal: (reveal: number | null) => {
              reveals.push(reveal);
            },
            expandLabel: "Show more",
            collapseLabel: "Show less",
          };
        },
      });
      return { ...result, expanded, reveals };
    }

    it("expands when the handle is dragged up past the snap distance", () => {
      const { expanded, reveals } = renderExpandable();
      pointer(handle(), "pointerdown", 500);
      pointer(handle(), "pointermove", 420);
      expect(reveals.at(-1)).toBe(80);
      pointer(handle(), "pointerup", 420);
      expect(expanded.value).toBe(true);
      expect(reveals.at(-1)).toBeNull();
    });

    it("stays collapsed when the drag up stops short", () => {
      const { expanded } = renderExpandable();
      drag(handle(), 500, 480);
      expect(expanded.value).toBe(false);
    });

    it("never reveals more than there is", () => {
      const { reveals } = renderExpandable();
      pointer(handle(), "pointerdown", 500);
      pointer(handle(), "pointermove", 0);
      expect(reveals.at(-1)).toBe(200);
    });

    it("collapses, then dismisses, in one continuous drag down", () => {
      const { expanded, onClose } = renderExpandable();
      act(() => {
        expanded.value = true;
      });
      pointer(handle(), "pointerdown", 300);
      pointer(handle(), "pointermove", 500);
      // The expanded content has closed; nothing has moved the sheet yet.
      expect(sheet()!.style.transform).toBe("");
      pointer(handle(), "pointermove", 580);
      expect(sheet()!.style.transform).toBe("translateY(80px)");
      pointer(handle(), "pointerup", 580);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("toggles on a tap", () => {
      const { expanded } = renderExpandable();
      drag(handle(), 500, 502);
      expect(expanded.value).toBe(true);
      drag(handle(), 500, 500);
      expect(expanded.value).toBe(false);
    });

    it("ignores a tap when there is nothing to reveal", () => {
      const { expanded } = renderExpandable(false);
      drag(handle(), 500, 500);
      expect(expanded.value).toBe(false);
      expect(handle().tabIndex).toBe(-1);
    });

    it("restores the starting state when the gesture is cancelled", () => {
      const { expanded } = renderExpandable();
      pointer(handle(), "pointerdown", 500);
      pointer(handle(), "pointermove", 300);
      pointer(handle(), "pointercancel", 300);
      expect(expanded.value).toBe(false);
    });

    it("works from the keyboard, and Escape collapses before it closes", () => {
      const { expanded, onClose } = renderExpandable();
      expect(handle().getAttribute("role")).toBe("button");
      expect(handle().tabIndex).toBe(0);
      expect(handle().getAttribute("aria-expanded")).toBe("false");
      expect(handle().getAttribute("aria-label")).toBe("Show more");

      pressKey(handle(), "Enter");
      expect(expanded.value).toBe(true);
      expect(handle().getAttribute("aria-expanded")).toBe("true");
      expect(handle().getAttribute("aria-label")).toBe("Show less");

      pressKey(handle(), "Escape");
      expect(expanded.value).toBe(false);
      expect(onClose).not.toHaveBeenCalled();

      pressKey(handle(), "ArrowUp");
      expect(expanded.value).toBe(true);
      pressKey(handle(), "ArrowDown");
      expect(expanded.value).toBe(false);

      pressKey(handle(), "Escape");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
