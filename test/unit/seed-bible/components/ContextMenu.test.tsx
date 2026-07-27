import { render } from "preact";
import { act } from "preact/test-utils";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuWithButton,
} from "@packages/seed-bible/seed-bible/components/ContextMenu/ContextMenu";

function createDomRect(partial: Partial<DOMRect> = {}): DOMRect {
  return {
    x: partial.x ?? partial.left ?? 0,
    y: partial.y ?? partial.top ?? 0,
    width: partial.width ?? 100,
    height: partial.height ?? 40,
    top: partial.top ?? 0,
    right: partial.right ?? 100,
    bottom: partial.bottom ?? 40,
    left: partial.left ?? 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("ContextMenu", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    // The menu portals directly to document.body; make sure nothing survives
    // between tests even if a test forgot to unmount cleanly.
    document.body
      .querySelectorAll('[role="menu"]')
      .forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  it("renders individual menu items", () => {
    const menuElementRef = { current: null as HTMLDivElement | null };

    act(() => {
      render(
        <ContextMenu isOpen={true} menuElementRef={menuElementRef}>
          <ContextMenuItem>Copy</ContextMenuItem>
          <ContextMenuItem>Paste</ContextMenuItem>
        </ContextMenu>,
        container
      );
    });

    const items = Array.from(container.querySelectorAll('[role="menuitem"]'));
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent?.trim()).toBe("Copy");
    expect(items[1]?.textContent?.trim()).toBe("Paste");
  });

  it("supports clicking menu items", () => {
    const menuElementRef = { current: null as HTMLDivElement | null };
    const onClick = vi.fn();

    act(() => {
      render(
        <ContextMenu isOpen={true} menuElementRef={menuElementRef}>
          <ContextMenuItem onClick={onClick}>Rename</ContextMenuItem>
        </ContextMenu>,
        container
      );
    });

    const item = container.querySelector(
      '[role="menuitem"]'
    ) as HTMLButtonElement | null;

    expect(item).not.toBeNull();

    act(() => {
      item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports custom CSS classes on items", () => {
    const menuElementRef = { current: null as HTMLDivElement | null };

    act(() => {
      render(
        <ContextMenu isOpen={true} menuElementRef={menuElementRef}>
          <ContextMenuItem className="custom-item">Share</ContextMenuItem>
        </ContextMenu>,
        container
      );
    });

    const item = container.querySelector('[role="menuitem"]');
    expect(item?.classList.contains("sb-context-menu-item")).toBe(true);
    expect(item?.classList.contains("custom-item")).toBe(true);
  });

  it("supports a custom CSS class on the menu", () => {
    const menuElementRef = { current: null as HTMLDivElement | null };

    act(() => {
      render(
        <ContextMenu
          isOpen={true}
          menuElementRef={menuElementRef}
          className="custom-menu"
        >
          <ContextMenuItem>Open</ContextMenuItem>
        </ContextMenu>,
        container
      );
    });

    const menu = container.querySelector('[role="menu"]');
    expect(menu?.classList.contains("sb-context-menu")).toBe(true);
    expect(menu?.classList.contains("custom-menu")).toBe(true);
  });

  it("shows menu when ContextMenuWithButton button is clicked", () => {
    act(() => {
      render(
        <ContextMenuWithButton aria-label="More actions">
          <ContextMenuItem>Delete</ContextMenuItem>
        </ContextMenuWithButton>,
        container
      );
    });

    expect(document.body.querySelector('[role="menu"]')).toBeNull();

    const button = container.querySelector(
      ".sb-context-menu-button"
    ) as HTMLButtonElement | null;

    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain("Delete");
  });

  it("positions menu to stay visible near screen sides", () => {
    act(() => {
      render(
        <div>
          <ContextMenuWithButton buttonClassName="left-trigger">
            <ContextMenuItem>Left action</ContextMenuItem>
          </ContextMenuWithButton>
          <ContextMenuWithButton buttonClassName="right-trigger">
            <ContextMenuItem>Right action</ContextMenuItem>
          </ContextMenuWithButton>
        </div>,
        container
      );
    });

    const anchors = Array.from(
      container.querySelectorAll(".sb-context-menu-anchor")
    ) as HTMLDivElement[];
    expect(anchors).toHaveLength(2);

    Object.defineProperty(anchors[0], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() =>
        createDomRect({
          left: 10,
          right: 110,
          top: 0,
          bottom: 40,
          width: 100,
          height: 40,
        })
      ),
    });

    Object.defineProperty(anchors[1], "getBoundingClientRect", {
      configurable: true,
      value: vi.fn(() =>
        createDomRect({
          left: window.innerWidth - 110,
          right: window.innerWidth - 10,
          top: 0,
          bottom: 40,
          width: 100,
          height: 40,
        })
      ),
    });

    const leftButton = container.querySelector(
      ".left-trigger"
    ) as HTMLButtonElement | null;
    const rightButton = container.querySelector(
      ".right-trigger"
    ) as HTMLButtonElement | null;

    expect(leftButton).not.toBeNull();
    expect(rightButton).not.toBeNull();

    act(() => {
      leftButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const leftMenu = document.body.querySelector(
      '[role="menu"]'
    ) as HTMLDivElement | null;

    expect(leftMenu).not.toBeNull();
    // Menu is portaled to document.body and positioned in viewport-fixed
    // coordinates, so its left edge lines up with the anchor's left edge.
    expect(leftMenu?.style.left).toBe("10px");
    expect(leftMenu?.style.right).toBe("");

    act(() => {
      rightButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const rightMenu = document.body.querySelector(
      '[role="menu"]'
    ) as HTMLDivElement | null;

    expect(rightMenu).not.toBeNull();
    // Right anchor sits at `window.innerWidth - 10`, so its right edge is
    // 10px from the viewport's right edge.
    expect(rightMenu?.style.right).toBe("10px");
    expect(rightMenu?.style.left).toBe("");
  });
});
