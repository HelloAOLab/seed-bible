import { render } from "preact";
import { act } from "preact/test-utils";
import { ExpandableText } from "@packages/seed-bible/seed-bible/components/ExpandableText/ExpandableText";

/**
 * jsdom does no layout, so every element measures 0 and the clamp would
 * never look like it overflows. The hidden probe holds the full pre-wrap
 * text; report it as taller than one line so "Read more" can appear.
 */
function mockClampedOverflow() {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollHeight"
  );
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains("sb-expandable-text-probe") ? 40 : 0;
    },
  });
  return () => {
    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        originalScrollHeight
      );
    }
  };
}

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

  it("renders the full text and no toggle when it fits the clamp", () => {
    act(() => {
      render(
        <ExpandableText readMoreLabel="Read more" readLessLabel="Read less">
          A short evening study
        </ExpandableText>,
        container
      );
    });

    expect(
      container.querySelector(".sb-expandable-text-body")?.textContent
    ).toBe("A short evening study");
    expect(container.querySelector(".sb-expandable-text-toggle")).toBeNull();
  });

  it("renders nothing for empty text", () => {
    act(() => {
      render(
        <ExpandableText readMoreLabel="Read more" readLessLabel="Read less">
          {""}
        </ExpandableText>,
        container
      );
    });

    expect(container.querySelector(".sb-expandable-text")).toBeNull();
  });

  it("keeps newlines in the body so a multi-line string displays as written", () => {
    act(() => {
      render(
        <ExpandableText readMoreLabel="Read more" readLessLabel="Read less">
          {"Line one\nLine two"}
        </ExpandableText>,
        container
      );
    });

    expect(
      container.querySelector(".sb-expandable-text-body")?.textContent
    ).toBe("Line one\nLine two");
    expect(
      container
        .querySelector(".sb-expandable-text-body")
        ?.classList.contains("sb-expandable-text-body--clamped")
    ).toBe(false);
  });

  it("shows the first line while collapsed, then every line after Read more", () => {
    const restore = mockClampedOverflow();
    try {
      act(() => {
        render(
          <ExpandableText readMoreLabel="Read more" readLessLabel="Read less">
            {"Line one\nLine two"}
          </ExpandableText>,
          container
        );
      });

      expect(
        container.querySelector(".sb-expandable-text-body")?.textContent
      ).toBe("Line one");
      expect(
        container.querySelector(".sb-expandable-text-ellipsis")?.textContent
      ).toBe("...");

      const toggle = container.querySelector(
        ".sb-expandable-text-toggle"
      ) as HTMLButtonElement;
      act(() => {
        toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(
        container.querySelector(".sb-expandable-text-body")?.textContent
      ).toBe("Line one\nLine two");
      expect(
        container.querySelector(".sb-expandable-text-ellipsis")
      ).toBeNull();
    } finally {
      restore();
    }
  });

  it("shows Read more when the clamped text overflows, then Read less once expanded", () => {
    const restore = mockClampedOverflow();
    try {
      act(() => {
        render(
          <ExpandableText
            className="my-extra-class"
            readMoreLabel="Read more"
            readLessLabel="Read less"
          >
            A much longer description that does not fit on one line
          </ExpandableText>,
          container
        );
      });

      const root = container.querySelector(".sb-expandable-text")!;
      expect(root.classList.contains("my-extra-class")).toBe(true);

      const toggle = container.querySelector(
        ".sb-expandable-text-toggle"
      ) as HTMLButtonElement;
      expect(toggle).not.toBeNull();
      expect(toggle.textContent).toBe("Read more");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(
        container.querySelector(".sb-expandable-text-ellipsis")?.textContent
      ).toBe("...");
      expect(
        container
          .querySelector(".sb-expandable-text-body")
          ?.classList.contains("sb-expandable-text-body--clamped")
      ).toBe(true);

      act(() => {
        toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(toggle.textContent).toBe("Read less");
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(
        container.querySelector(".sb-expandable-text-ellipsis")
      ).toBeNull();
      expect(
        container
          .querySelector(".sb-expandable-text-body")
          ?.classList.contains("sb-expandable-text-body--clamped")
      ).toBe(false);

      act(() => {
        toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(toggle.textContent).toBe("Read more");
      expect(
        container
          .querySelector(".sb-expandable-text-body")
          ?.classList.contains("sb-expandable-text-body--clamped")
      ).toBe(true);
    } finally {
      restore();
    }
  });

  it("does not let the toggle click bubble to a parent click handler", () => {
    const restore = mockClampedOverflow();
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

      const toggle = container.querySelector(
        ".sb-expandable-text-toggle"
      ) as HTMLButtonElement;
      act(() => {
        toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(onParentClick).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});
