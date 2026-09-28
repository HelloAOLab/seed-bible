import { render } from "preact";
import { act } from "preact/test-utils";
import { ExpandableText } from "@packages/seed-bible/seed-bible/components/ExpandableText/ExpandableText";

/**
 * jsdom does no layout: every element reports 0 for both widths, so the
 * collapsed line never looks clipped and "Read more" would never appear.
 * These fakes stand in for the browser's measurement of the collapsed line,
 * which is what the component compares.
 *
 * They can only check that the component reacts correctly to a given
 * measurement. Whether the CSS actually clips the line — and so whether the
 * real measurement is the one we think it is — is not observable here, and
 * needs a browser.
 */
function mockLineWidths(options: { scrollWidth: number; clientWidth: number }) {
  const isBody = (el: HTMLElement) =>
    el.classList.contains("sb-expandable-text-body");
  const originals = (["scrollWidth", "clientWidth"] as const).map(
    (name) =>
      [
        name,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
      ] as const
  );

  for (const name of ["scrollWidth", "clientWidth"] as const) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get(this: HTMLElement) {
        return isBody(this) ? options[name] : 0;
      },
    });
  }

  return () => {
    for (const [name, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, name, descriptor);
      }
    }
  };
}

/** A collapsed line whose text is wider than the space it has. */
const clipped = () => mockLineWidths({ scrollWidth: 400, clientWidth: 200 });
/** A collapsed line whose text fits, with a pixel of rounding noise. */
const fits = () => mockLineWidths({ scrollWidth: 201, clientWidth: 200 });

function renderText(
  container: HTMLElement,
  text: string,
  props: { className?: string } = {}
) {
  act(() => {
    render(
      <ExpandableText
        readMoreLabel="Read more"
        readLessLabel="Read less"
        {...props}
      >
        {text}
      </ExpandableText>,
      container
    );
  });
}

const body = (container: HTMLElement) =>
  container.querySelector(".sb-expandable-text-body")?.textContent;
const toggle = (container: HTMLElement) =>
  container.querySelector(
    ".sb-expandable-text-toggle"
  ) as HTMLButtonElement | null;
const ellipsis = (container: HTMLElement) =>
  container.querySelector(".sb-expandable-text-ellipsis");
const click = (el: HTMLElement) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

describe("ExpandableText", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders nothing for empty text", () => {
    renderText(container, "");

    expect(container.querySelector(".sb-expandable-text")).toBeNull();
  });

  it("shows no control when the line fits", () => {
    const restore = fits();
    try {
      renderText(container, "A short evening study");

      expect(body(container)).toBe("A short evening study");
      expect(toggle(container)).toBeNull();
      expect(ellipsis(container)).toBeNull();
    } finally {
      restore();
    }
  });

  it("tolerates a pixel of rounding rather than reporting overflow", () => {
    // scrollWidth one above clientWidth is the rounding case, not real
    // overflow — a description that fits must not be given a control that
    // expands to reveal nothing.
    const restore = mockLineWidths({ scrollWidth: 201, clientWidth: 200 });
    try {
      renderText(container, "A short evening study");

      expect(toggle(container)).toBeNull();
    } finally {
      restore();
    }
  });

  it("shows Read more once the line is genuinely clipped", () => {
    const restore = clipped();
    try {
      renderText(container, "A much longer description than the card can fit");

      expect(toggle(container)?.textContent).toBe("Read more");
      expect(ellipsis(container)?.textContent).toBe("...");
    } finally {
      restore();
    }
  });

  it("expands to the full text and collapses again", () => {
    const restore = clipped();
    try {
      const text = "A much longer description than the card can fit";
      renderText(container, text, { className: "my-extra-class" });

      const root = container.querySelector(".sb-expandable-text")!;
      expect(root.classList.contains("my-extra-class")).toBe(true);
      expect(root.classList.contains("sb-expandable-text--clamped")).toBe(true);

      const button = toggle(container)!;
      expect(button.getAttribute("aria-expanded")).toBe("false");

      click(button);

      expect(button.textContent).toBe("Read less");
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(body(container)).toBe(text);
      expect(ellipsis(container)).toBeNull();
      // Expanded, the group goes back to plain inline flow so the text wraps.
      expect(root.classList.contains("sb-expandable-text--clamped")).toBe(
        false
      );

      click(button);

      expect(button.textContent).toBe("Read more");
      expect(ellipsis(container)?.textContent).toBe("...");
      expect(root.classList.contains("sb-expandable-text--clamped")).toBe(true);
    } finally {
      restore();
    }
  });

  it("keeps the control while expanded, when there is nothing left to measure", () => {
    // Expanded, the body wraps rather than being clipped, so the measurement
    // stops applying — "Read less" still has to be there to get back.
    const restore = clipped();
    try {
      renderText(container, "A much longer description than the card can fit");
      click(toggle(container)!);
      expect(toggle(container)?.textContent).toBe("Read less");
    } finally {
      restore();
    }
  });

  it("offers the control for a multi-line description whose first line fits", () => {
    // No measurement involved: more lines than the one shown is read off the
    // text itself, so this holds even where nothing can be measured.
    renderText(container, "Line one\nLine two");

    expect(body(container)).toBe("Line one");
    expect(ellipsis(container)?.textContent).toBe("...");

    click(toggle(container)!);

    expect(body(container)).toBe("Line one\nLine two");
    expect(ellipsis(container)).toBeNull();
  });

  it("shows a single line in full when it fits, newlines and all", () => {
    const restore = fits();
    try {
      renderText(container, "Just the one line");

      expect(body(container)).toBe("Just the one line");
      expect(toggle(container)).toBeNull();
    } finally {
      restore();
    }
  });

  it("re-collapses when the text changes, so a new profile starts collapsed", () => {
    const restore = clipped();
    try {
      renderText(container, "A much longer description than the card can fit");
      click(toggle(container)!);
      expect(toggle(container)?.textContent).toBe("Read less");

      renderText(container, "Another description, also too long for the card");

      expect(toggle(container)?.textContent).toBe("Read more");
      expect(ellipsis(container)?.textContent).toBe("...");
    } finally {
      restore();
    }
  });

  it("does not let the toggle click bubble to a parent click handler", () => {
    const restore = clipped();
    const onParentClick = vi.fn();
    try {
      act(() => {
        render(
          <div onClick={onParentClick}>
            <ExpandableText readMoreLabel="Read more" readLessLabel="Read less">
              Overflowing description
            </ExpandableText>
          </div>,
          container
        );
      });

      click(toggle(container)!);

      expect(onParentClick).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});
