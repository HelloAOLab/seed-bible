import { render } from "preact";
import { act } from "preact/test-utils";
import { ToolActionElement } from "@packages/seed-bible/seed-bible/components/ToolActionElement";

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

function click(
  element: Element,
  init: MouseEventInit = {}
): { defaultPrevented: boolean } {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  act(() => {
    element.dispatchEvent(event);
  });
  return { defaultPrevented: event.defaultPrevented };
}

function keyDown(element: Element, key: string): { defaultPrevented: boolean } {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
  });
  act(() => {
    element.dispatchEvent(event);
  });
  return { defaultPrevented: event.defaultPrevented };
}

describe("ToolActionElement", () => {
  it("renders a real link when it has an address", () => {
    render(
      <ToolActionElement
        href="/en/BSB/john/4"
        onActivate={vi.fn()}
        className="sb-reader-toolbar-button"
        ariaLabel="Next Chapter"
      >
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    // The attribute, not the resolved `.href` property — this is what a
    // crawler reads out of the markup.
    expect(anchor?.getAttribute("href")).toBe("/en/BSB/john/4");
    expect(anchor?.getAttribute("aria-label")).toBe("Next Chapter");
    expect(anchor?.className).toBe("sb-reader-toolbar-button");
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders a button when there is no address", () => {
    render(
      <ToolActionElement onActivate={vi.fn()} ariaLabel="Books">
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    expect(container.querySelector("button")).not.toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("stays a button when disabled, even with an address", () => {
    // `disabled` has no anchor equivalent, and an aria-disabled link is still
    // followable by anything that follows links.
    render(
      <ToolActionElement
        href="/en/BSB/john/4"
        disabled
        onActivate={vi.fn()}
        ariaLabel="Next Chapter"
      >
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(container.querySelector("a")).toBeNull();
  });

  it("handles a plain click in-app instead of navigating", () => {
    const onActivate = vi.fn();
    render(
      <ToolActionElement href="/en/BSB/john/4" onActivate={onActivate}>
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    const { defaultPrevented } = click(container.querySelector("a")!);

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(defaultPrevented).toBe(true);
  });

  it.each([
    ["metaKey", { metaKey: true }],
    ["ctrlKey", { ctrlKey: true }],
    ["shiftKey", { shiftKey: true }],
    ["altKey", { altKey: true }],
  ])("lets the browser handle a %s click", (_name, init) => {
    const onActivate = vi.fn();
    render(
      <ToolActionElement href="/en/BSB/john/4" onActivate={onActivate}>
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    const { defaultPrevented } = click(container.querySelector("a")!, init);

    // Opening in a new tab is the whole point of having a real href.
    expect(onActivate).not.toHaveBeenCalled();
    expect(defaultPrevented).toBe(false);
  });

  it.each([
    [" ", "the standard key value"],
    ["Spacebar", "the legacy key value some browsers still send"],
  ])("activates on Space (%s) the same as a native <button> would", (key) => {
    // A native <a> only activates on Enter, not Space — only a <button>
    // does that. This tool used to be a plain <button>, so a keyboard
    // reader who tabs to it and presses Space, as they always could,
    // has to keep advancing rather than silently scrolling the page.
    const onActivate = vi.fn();
    render(
      <ToolActionElement href="/en/BSB/john/4" onActivate={onActivate}>
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    const { defaultPrevented } = keyDown(container.querySelector("a")!, key);

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(defaultPrevented).toBe(true);
  });

  it("ignores non-Space keys on the anchor", () => {
    const onActivate = vi.fn();
    render(
      <ToolActionElement href="/en/BSB/john/4" onActivate={onActivate}>
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    // Enter is left to the browser's native anchor activation (which fires a
    // click, already covered above), not this handler.
    const { defaultPrevented } = keyDown(
      container.querySelector("a")!,
      "Enter"
    );

    expect(onActivate).not.toHaveBeenCalled();
    expect(defaultPrevented).toBe(false);
  });

  it("activates on a button click", () => {
    const onActivate = vi.fn();
    render(
      <ToolActionElement onActivate={onActivate}>
        <span>icon</span>
      </ToolActionElement>,
      container
    );

    click(container.querySelector("button")!);

    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
