import { render } from "preact";
import { act } from "preact/test-utils";
import {
  DEFAULT_MAX_LENGTH,
  ExpandableText,
} from "@packages/seed-bible/seed-bible/components/ExpandableText/ExpandableText";

function renderText(
  container: HTMLElement,
  text: string,
  props: { maxLength?: number; maxLines?: number; className?: string } = {}
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

  it("renders the full text and no toggle when it is within the limit", () => {
    renderText(container, "A short evening study");

    expect(body(container)).toBe("A short evening study");
    expect(toggle(container)).toBeNull();
    expect(ellipsis(container)).toBeNull();
  });

  it("shows no toggle for a description of any length up to the limit", () => {
    // The point of the character limit: a description that fits is never
    // given a "Read more" that would expand to reveal nothing.
    renderText(container, "x".repeat(DEFAULT_MAX_LENGTH));

    expect(body(container)?.length).toBe(DEFAULT_MAX_LENGTH);
    expect(toggle(container)).toBeNull();
  });

  it("shows a toggle once the text passes the limit by one character", () => {
    renderText(container, "x".repeat(DEFAULT_MAX_LENGTH + 1));

    expect(toggle(container)?.textContent).toBe("Read more");
  });

  it("renders nothing for empty text", () => {
    renderText(container, "");

    expect(container.querySelector(".sb-expandable-text")).toBeNull();
  });

  it("truncates to the limit while collapsed, then shows all of it", () => {
    const text =
      "Reading through the Psalms with my house church this year, a psalm each morning before work and one together on Sunday evenings after dinner.";
    renderText(container, text, { maxLength: 40 });

    const collapsed = body(container)!;
    expect(collapsed.length).toBeLessThanOrEqual(40);
    expect(text.startsWith(collapsed)).toBe(true);
    expect(ellipsis(container)?.textContent).toBe("...");

    act(() => {
      toggle(container)!.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(body(container)).toBe(text);
    expect(ellipsis(container)).toBeNull();
  });

  it("cuts at a word boundary rather than mid-word", () => {
    renderText(container, "Reading through the Psalms every single morning", {
      maxLength: 20,
    });

    // "Reading through the " would be the raw 20-character cut; backing off to
    // the boundary drops the partial word and the trailing space with it.
    expect(body(container)).toBe("Reading through the");
  });

  it("hard-cuts a single word longer than the limit", () => {
    renderText(container, "Supercalifragilisticexpialidocious", {
      maxLength: 10,
    });

    expect(body(container)).toBe("Supercalif");
    expect(toggle(container)).not.toBeNull();
  });

  it("counts and cuts by code point so an emoji is never split", () => {
    renderText(container, "📖📖📖📖📖", { maxLength: 3 });

    expect(body(container)).toBe("📖📖📖");
  });

  it("keeps newlines in the body so a multi-line string displays as written", () => {
    renderText(container, "Line one\nLine two", { maxLines: 2 });

    expect(body(container)).toBe("Line one\nLine two");
    expect(toggle(container)).toBeNull();
  });

  it("shows the first line while collapsed, then every line after Read more", () => {
    renderText(container, "Line one\nLine two");

    expect(body(container)).toBe("Line one");
    expect(ellipsis(container)?.textContent).toBe("...");

    act(() => {
      toggle(container)!.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(body(container)).toBe("Line one\nLine two");
    expect(ellipsis(container)).toBeNull();
  });

  it("toggles the label and aria-expanded, and collapses again", () => {
    renderText(container, "A much longer description than the limit allows", {
      maxLength: 20,
      className: "my-extra-class",
    });

    const root = container.querySelector(".sb-expandable-text")!;
    expect(root.classList.contains("my-extra-class")).toBe(true);

    const button = toggle(container)!;
    expect(button.textContent).toBe("Read more");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(button.textContent).toBe("Read less");
    expect(button.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(button.textContent).toBe("Read more");
    expect(ellipsis(container)?.textContent).toBe("...");
  });

  it("re-collapses when the text changes, so a new profile starts collapsed", () => {
    const long = "A much longer description than the limit allows";
    renderText(container, long, { maxLength: 20 });

    act(() => {
      toggle(container)!.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    expect(body(container)).toBe(long);

    const other = "Another description well past the limit as well";
    renderText(container, other, { maxLength: 20 });

    expect(body(container)?.length).toBeLessThanOrEqual(20);
    expect(toggle(container)?.textContent).toBe("Read more");
  });

  it("does not let the toggle click bubble to a parent click handler", () => {
    const onParentClick = vi.fn();
    act(() => {
      render(
        <div onClick={onParentClick}>
          <ExpandableText
            maxLength={10}
            readMoreLabel="Read more"
            readLessLabel="Read less"
          >
            Overflowing description
          </ExpandableText>
        </div>,
        container
      );
    });

    act(() => {
      toggle(container)!.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
