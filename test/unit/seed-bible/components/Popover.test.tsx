import { render } from "preact";
import { useRef, useState } from "preact/hooks";
import { act } from "preact/test-utils";
import {
  Popover,
  type PopoverProps,
} from "@packages/seed-bible/seed-bible/components/Popover/Popover";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "@packages/seed-bible/seed-bible/components/ContextMenu/ContextMenu";

function mockRect(element: Element, rect: Partial<DOMRect>) {
  const full = {
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    width: (rect.right ?? 0) - (rect.left ?? 0),
    height: (rect.bottom ?? 0) - (rect.top ?? 0),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...rect,
    toJSON: () => ({}),
  } as DOMRect;
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(full);
}

function pressKey(
  key: string,
  target: Element = document.body,
  init: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => void target.dispatchEvent(event));
  return event;
}

function pressOn(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
}

/** A trigger and a popover the way a screen wires them. */
function Harness(
  props: Partial<PopoverProps> & { startOpen?: boolean; onClosed?: () => void }
) {
  const { startOpen = true, onClosed, ...popoverProps } = props;
  const [open, setOpen] = useState(startOpen);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <div id="anchor" ref={anchorRef}>
        <button
          id="trigger"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          Open
        </button>
      </div>
      <Popover
        open={open}
        onClose={() => {
          setOpen(false);
          onClosed?.();
        }}
        anchorRef={anchorRef}
        returnFocusRef={triggerRef}
        role="dialog"
        aria-label="Choices"
        className="my-popover"
        {...popoverProps}
      >
        <button id="first">First</button>
        <button id="second" aria-checked="true" role="radio">
          Second
        </button>
      </Popover>
    </div>
  );
}

describe("Popover", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(window, "innerWidth", {
      value: 1000,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.restoreAllMocks();
  });

  const show = (node: preact.ComponentChild) =>
    act(() => render(node, container));
  const popover = () => document.body.querySelector<HTMLElement>(".sb-popover");

  it("draws into the page's body, not where it was written, and only while open", () => {
    show(<Harness />);

    expect(popover()).not.toBeNull();
    expect(container.querySelector(".sb-popover")).toBeNull();
    expect(popover()!.className).toContain("my-popover");
    expect(popover()!.getAttribute("role")).toBe("dialog");

    act(() => render(null, container));
    show(<Harness startOpen={false} />);
    expect(popover()).toBeNull();
  });

  describe("placement", () => {
    function place(anchorRect: Partial<DOMRect>) {
      show(<Harness startOpen={false} gap={8} />);
      mockRect(container.querySelector("#anchor")!, anchorRect);
      act(() => (container.querySelector("#trigger") as HTMLElement).click());
      return popover()!;
    }

    it("opens below the anchor, lined up with its left edge, when it sits near the left", () => {
      const el = place({ left: 20, right: 60, top: 40, bottom: 70 });

      expect(el.style.position).toBe("fixed");
      expect(el.style.left).toBe("20px");
      expect(el.style.top).toBe("78px");
      expect(el.style.transformOrigin).toBe("left top");
    });

    it("lines up with the right edge when the anchor is nearer the right", () => {
      const el = place({ left: 900, right: 960, top: 40, bottom: 70 });

      expect(el.style.right).toBe("40px");
      expect(el.style.transformOrigin).toBe("right top");
    });

    it("opens above the anchor when there is more room there", () => {
      const el = place({ left: 20, right: 60, top: 700, bottom: 730 });

      expect(el.style.bottom).toBe("108px");
      expect(el.style.transformOrigin).toBe("left bottom");
    });
  });

  describe("closing", () => {
    it("closes on Escape and gives focus back to the trigger", () => {
      const onClosed = vi.fn();
      show(<Harness onClosed={onClosed} />);

      pressKey("Escape", popover()!.querySelector("#first")!);

      expect(onClosed).toHaveBeenCalledTimes(1);
      expect(popover()).toBeNull();
      expect(document.activeElement?.id).toBe("trigger");
    });

    it("closes on Escape even when focus is still on the trigger", () => {
      show(<Harness initialFocus={false} />);
      const trigger = container.querySelector<HTMLElement>("#trigger")!;
      act(() => trigger.focus());

      pressKey("Escape", trigger);

      expect(popover()).toBeNull();
      expect(document.activeElement?.id).toBe("trigger");
    });

    it("closes on a press outside, and leaves focus where the press put it", () => {
      const onClosed = vi.fn();
      show(<Harness onClosed={onClosed} />);
      const outside = document.createElement("div");
      document.body.appendChild(outside);

      pressOn(outside);
      outside.remove();

      expect(onClosed).toHaveBeenCalledTimes(1);
      expect(popover()).toBeNull();
    });

    it("stays open for a press inside it, or on its anchor", () => {
      const onClosed = vi.fn();
      show(<Harness onClosed={onClosed} />);

      pressOn(popover()!.querySelector("#first")!);
      pressOn(container.querySelector("#trigger")!);

      expect(onClosed).not.toHaveBeenCalled();
      expect(popover()).not.toBeNull();
    });

    it("closes on Tab from inside, handing focus to the trigger for Tab to carry on from", () => {
      show(<Harness />);

      pressKey("Tab", popover()!.querySelector("#second")!);

      expect(popover()).toBeNull();
      expect(document.activeElement?.id).toBe("trigger");
    });

    it("ignores Escape pressed somewhere else entirely, such as a text box focused by a shortcut", () => {
      const onClosed = vi.fn();
      show(<Harness onClosed={onClosed} />);
      const field = document.createElement("input");
      document.body.appendChild(field);

      pressKey("Escape", field);
      field.remove();

      expect(onClosed).not.toHaveBeenCalled();
      expect(popover()).not.toBeNull();
    });

    it("keeps Shift+Tab on the trigger rather than skipping it for the control before", () => {
      show(<Harness />);

      const event = pressKey("Tab", popover()!.querySelector("#first")!, {
        shiftKey: true,
      });

      expect(event.defaultPrevented).toBe(true);
      expect(popover()).toBeNull();
      expect(document.activeElement?.id).toBe("trigger");
    });

    it("leaves Tab to carry on from the trigger", () => {
      show(<Harness />);

      const event = pressKey("Tab", popover()!.querySelector("#first")!);

      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves Escape to whoever already handled it", () => {
      const onClosed = vi.fn();
      show(<Harness onClosed={onClosed} />);
      const field = container.ownerDocument.createElement("input");
      field.addEventListener("keydown", (event) => event.preventDefault());
      document.body.appendChild(field);

      pressKey("Escape", field);
      field.remove();

      expect(onClosed).not.toHaveBeenCalled();
    });

    it("lets only the newest of several open popovers answer Escape", () => {
      const closed: string[] = [];
      show(
        <div>
          <Harness
            id="older"
            onClosed={() => closed.push("older")}
            aria-label="Older"
          />
          <Harness
            id="newer"
            onClosed={() => closed.push("newer")}
            aria-label="Newer"
          />
        </div>
      );
      // Mounted in order, so the second is the newest.
      pressKey("Escape");

      expect(closed).toEqual(["newer"]);
      pressKey("Escape");
      expect(closed).toEqual(["newer", "older"]);
    });
  });

  describe("when something else holds it open", () => {
    it("neither closes nor takes focus while it is not dismissible", () => {
      const onClosed = vi.fn();
      show(
        <Harness dismissible={false} initialFocus={false} onClosed={onClosed} />
      );
      const outside = document.createElement("div");
      document.body.appendChild(outside);

      pressKey("Escape", popover()!);
      pressKey("Tab", popover()!.querySelector("#first")!);
      pressOn(outside);
      outside.remove();

      expect(onClosed).not.toHaveBeenCalled();
      expect(popover()).not.toBeNull();
      expect(document.activeElement?.id).not.toBe("trigger");
    });
  });

  describe("opened from inside another popover", () => {
    function Nested(props: {
      onItem: () => void;
      onOuterClose: () => void;
      onInnerClose?: () => void;
    }) {
      const [open, setOpen] = useState(true);
      const [innerOpen, setInnerOpen] = useState(true);
      const outerAnchor = useRef<HTMLDivElement | null>(null);
      const innerAnchor = useRef<HTMLDivElement | null>(null);
      return (
        <div>
          <div id="outer-anchor" ref={outerAnchor} />
          <Popover
            open={open}
            onClose={() => {
              setOpen(false);
              props.onOuterClose();
            }}
            anchorRef={outerAnchor}
            className="outer"
            aria-label="Outer"
            initialFocus={false}
          >
            <div id="inner-anchor" ref={innerAnchor} />
            <Popover
              open={innerOpen}
              onClose={() => {
                setInnerOpen(false);
                props.onInnerClose?.();
              }}
              anchorRef={innerAnchor}
              className="inner"
              aria-label="Inner"
              initialFocus={false}
            >
              <button id="inner-button">Inner</button>
            </Popover>
            <ContextMenuWithButton label="More">
              <ContextMenuItem onClick={props.onItem}>Do it</ContextMenuItem>
            </ContextMenuWithButton>
          </Popover>
        </div>
      );
    }

    it("lets a menu opened from it be used without closing it", () => {
      const onItem = vi.fn();
      const onOuterClose = vi.fn();
      show(<Nested onItem={onItem} onOuterClose={onOuterClose} />);
      act(() =>
        document.body
          .querySelector<HTMLElement>(".sb-context-menu-button")!
          .click()
      );
      const item = document.body.querySelector<HTMLElement>(
        ".sb-context-menu-item"
      )!;

      // A press is a mousedown and then a click; the menu isn't part of the
      // popover's element, but it is part of what the popover holds.
      pressOn(item);
      act(() => item.click());

      expect(onItem).toHaveBeenCalledTimes(1);
      expect(onOuterClose).not.toHaveBeenCalled();
      expect(document.body.querySelector(".outer")).not.toBeNull();
    });

    it("answers Escape with the one opened last, even when both opened in the same render", () => {
      const onOuterClose = vi.fn();
      const onInnerClose = vi.fn();
      show(
        <Nested
          onItem={() => {}}
          onOuterClose={onOuterClose}
          onInnerClose={onInnerClose}
        />
      );

      pressKey("Escape");

      expect(onInnerClose).toHaveBeenCalledTimes(1);
      expect(onOuterClose).not.toHaveBeenCalled();

      pressKey("Escape");
      expect(onOuterClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("focus on open", () => {
    it("moves focus to the chosen option", () => {
      show(<Harness />);

      expect(document.activeElement?.id).toBe("second");
    });

    it("moves focus to the first thing that can take it when nothing is chosen", () => {
      show(<Harness initialFocus='[aria-checked="mixed"]' />);

      expect(document.activeElement?.id).toBe("first");
    });

    it("leaves focus alone when told to", () => {
      show(<Harness initialFocus={false} />);

      expect(document.activeElement?.id).not.toBe("first");
      expect(document.activeElement?.id).not.toBe("second");
    });
  });

  it("stops listening for keys and presses once closed", () => {
    const onClosed = vi.fn();
    show(<Harness onClosed={onClosed} />);
    act(() => (container.querySelector("#trigger") as HTMLElement).click());
    expect(popover()).toBeNull();

    pressKey("Escape");
    pressOn(document.body);

    expect(onClosed).not.toHaveBeenCalled();
  });
});
