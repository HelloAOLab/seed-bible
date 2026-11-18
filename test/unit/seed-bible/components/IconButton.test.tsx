import { render } from "preact";
import { act } from "preact/test-utils";
import { IconButton } from "@packages/seed-bible/seed-bible/components/IconButton/IconButton";

describe("IconButton", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function button() {
    return container.querySelector("button")!;
  }

  it("is named by its label, for screen readers and the tooltip", () => {
    act(() => {
      render(
        <IconButton icon="bookmark" label="Bookmark this chapter" />,
        container
      );
    });

    expect(button().getAttribute("type")).toBe("button");
    expect(button().getAttribute("aria-label")).toBe("Bookmark this chapter");
    expect(button().getAttribute("title")).toBe("Bookmark this chapter");
  });

  it("hides the icon from screen readers, whether it's a symbol name or an element", () => {
    act(() => {
      render(<IconButton icon="bookmark" label="Bookmark" />, container);
    });
    const symbol = button().querySelector(".material-symbols-outlined")!;
    expect(symbol.textContent).toBe("bookmark");
    expect(symbol.getAttribute("aria-hidden")).toBe("true");

    act(() => {
      render(
        <IconButton icon={<svg class="my-svg" />} label="Map" />,
        container
      );
    });
    const wrapper = button().querySelector(".my-svg")!.parentElement!;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(button().querySelector(".material-symbols-outlined")).toBeNull();
  });

  it("calls onClick when clicked, but not while disabled", () => {
    const onClick = vi.fn();
    act(() => {
      render(
        <IconButton icon="add" label="Add" onClick={onClick} />,
        container
      );
    });
    act(() => button().click());
    expect(onClick).toHaveBeenCalledTimes(1);

    act(() => {
      render(
        <IconButton icon="add" label="Add" onClick={onClick} disabled />,
        container
      );
    });
    act(() => button().click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("says whether an on/off button is on, and leaves it out otherwise", () => {
    act(() => {
      render(<IconButton icon="bookmark" label="Bookmark" />, container);
    });
    expect(button().hasAttribute("aria-pressed")).toBe(false);

    act(() => {
      render(
        <IconButton icon="bookmark" label="Bookmark" pressed={false} />,
        container
      );
    });
    expect(button().getAttribute("aria-pressed")).toBe("false");
    expect(button().classList).not.toContain("sb-icon-button-pressed");

    act(() => {
      render(
        <IconButton icon="bookmark" label="Bookmark" pressed />,
        container
      );
    });
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(button().classList).toContain("sb-icon-button-pressed");
  });

  it("defaults to the medium plain look and keeps the caller's classes", () => {
    act(() => {
      render(
        <IconButton icon="add" label="Add" className="sb-x" class="sb-y" />,
        container
      );
    });

    expect([...button().classList]).toEqual([
      "sb-icon-button",
      "sb-icon-button-md",
      "sb-icon-button-plain",
      "sb-x",
      "sb-y",
    ]);
  });

  it("takes a size and look", () => {
    act(() => {
      render(
        <IconButton icon="add" label="Add" size="sm" look="tinted" />,
        container
      );
    });

    expect(button().classList).toContain("sb-icon-button-sm");
    expect(button().classList).toContain("sb-icon-button-tinted");
  });
});
