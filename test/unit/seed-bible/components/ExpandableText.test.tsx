import { render } from "preact";
import { act } from "preact/test-utils";
import { ExpandableText } from "@packages/seed-bible/seed-bible/components/ExpandableText/ExpandableText";
import { mockBodyMetrics } from "../testUtils/mockExpandableTextMetrics";

/** A collapsed line whose text is wider than the space it has. */
const clipped = () => mockBodyMetrics({ scrollWidth: 400, clientWidth: 200 });
/** A collapsed line whose text fits, with a pixel of rounding noise. */
const fits = () => mockBodyMetrics({ scrollWidth: 201, clientWidth: 200 });
/** A multi-line clamp whose text runs past its last visible line. */
const clampedTall = () =>
  mockBodyMetrics({ scrollHeight: 60, clientHeight: 30 });
/** A multi-line clamp whose text fits, with a pixel of rounding noise. */
const clampedFits = () =>
  mockBodyMetrics({ scrollHeight: 31, clientHeight: 30 });

function renderText(
  container: HTMLElement,
  text: string,
  props: { className?: string; lines?: number } = {}
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
    const restore = mockBodyMetrics({ scrollWidth: 201, clientWidth: 200 });
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

  describe("with more than one line", () => {
    const root = () => container.querySelector(".sb-expandable-text")!;

    it("shows no control when the text fits within its lines", () => {
      const restore = clampedFits();
      try {
        renderText(container, "Fits in two lines", { lines: 2 });

        expect(root().textContent).toBe("Fits in two lines");
        expect(toggle(container)).toBeNull();
      } finally {
        restore();
      }
    });

    it("shows the whole text wrapping, not just its first line, when collapsed", () => {
      const restore = clampedTall();
      try {
        const text = "Line one\nLine two\nLine three";
        renderText(container, text, { lines: 2 });

        // The clamp, not the component, decides what is visible; every line
        // is handed to it.
        expect(root().textContent).toContain(text);
        expect(ellipsis(container)).toBeNull();
        expect(toggle(container)?.textContent).toBe("Read more");
      } finally {
        restore();
      }
    });

    it("expands to the full text and collapses again", () => {
      const restore = clampedTall();
      try {
        renderText(
          container,
          "A description long enough to need a third line",
          {
            lines: 2,
          }
        );

        expect(root().classList.contains("sb-expandable-text--clamped")).toBe(
          true
        );
        expect(root().getAttribute("style")).toContain(
          "--sb-expandable-text-lines: 2"
        );

        click(toggle(container)!);

        expect(toggle(container)?.textContent).toBe("Read less");
        expect(toggle(container)?.getAttribute("aria-expanded")).toBe("true");
        expect(root().classList.contains("sb-expandable-text--clamped")).toBe(
          false
        );

        click(toggle(container)!);

        expect(toggle(container)?.textContent).toBe("Read more");
        expect(root().classList.contains("sb-expandable-text--clamped")).toBe(
          true
        );
      } finally {
        restore();
      }
    });

    it("does not treat a line break as overflow when the lines fit", () => {
      // Single-line mode reads extra lines off the text; with a multi-line
      // budget, two short lines are exactly what it has room for.
      const restore = clampedFits();
      try {
        renderText(container, "Line one\nLine two", { lines: 2 });

        expect(toggle(container)).toBeNull();
      } finally {
        restore();
      }
    });
  });
});
