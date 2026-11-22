import { render } from "preact";
import { useRef, useState } from "preact/hooks";
import { act } from "preact/test-utils";
import {
  Popover,
  type PopoverProps,
} from "@packages/seed-bible/seed-bible/components/Popover/Popover";

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

function pressKey(key: string, target: Element = document.body) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
    );
  });
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
