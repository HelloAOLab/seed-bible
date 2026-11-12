import { render } from "preact";
import { act } from "preact/test-utils";
import { Button } from "@packages/seed-bible/seed-bible/components/Button/Button";

describe("Button", () => {
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

  it("is a medium, rounded secondary button that doesn't submit forms by default", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    act(() => {
      render(
        <form onSubmit={onSubmit}>
          <Button className="sb-x">Cancel</Button>
        </form>,
        container
      );
    });

    expect(button().textContent).toBe("Cancel");
    expect(button().getAttribute("type")).toBe("button");
    expect([...button().classList]).toEqual([
      "sb-button",
      "sb-button-secondary",
      "sb-button-md",
      "sb-x",
    ]);
    act(() => button().click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits its form when it's the form's submit button", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    act(() => {
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" variant="primary">
            Sign in
          </Button>
        </form>,
        container
      );
    });

    act(() => button().click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("takes a variant, tone, size and shape", () => {
    act(() => {
      render(
        <Button variant="primary" tone="danger" size="lg" shape="pill">
          End session
        </Button>,
        container
      );
    });

    expect(button().classList).toContain("sb-button-primary");
    expect(button().classList).toContain("sb-button-danger");
    expect(button().classList).toContain("sb-button-lg");
    expect(button().classList).toContain("sb-button-pill");
  });

  it("puts the icon before the label, or after it when asked, hidden from screen readers", () => {
    act(() => {
      render(<Button icon="add">New plan</Button>, container);
    });
    let parts = [...button().children];
    expect(parts.map((el) => el.textContent)).toEqual(["add", "New plan"]);
    expect(parts[0]?.getAttribute("aria-hidden")).toBe("true");

    act(() => {
      render(
        <Button icon="arrow_forward" iconPosition="end">
          Next
        </Button>,
        container
      );
    });
    parts = [...button().children];
    expect(parts.map((el) => el.textContent)).toEqual([
      "Next",
      "arrow_forward",
    ]);
  });

  it("can't be clicked while disabled", () => {
    const onClick = vi.fn();
    act(() => {
      render(
        <Button onClick={onClick} disabled>
          Save
        </Button>,
        container
      );
    });

    act(() => button().click());
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows a spinner in place of the icon and ignores clicks while loading", () => {
    const onClick = vi.fn();
    act(() => {
      render(
        <Button icon="save" onClick={onClick} loading>
          Save
        </Button>,
        container
      );
    });

    expect(button().getAttribute("aria-busy")).toBe("true");
    expect(button().disabled).toBe(true);
    expect(button().querySelector(".sb-spinner")).not.toBeNull();
    expect(button().textContent).not.toContain("save");
    act(() => button().click());
    expect(onClick).not.toHaveBeenCalled();

    act(() => {
      render(
        <Button icon="save" onClick={onClick}>
          Save
        </Button>,
        container
      );
    });
    expect(button().hasAttribute("aria-busy")).toBe(false);
    expect(button().querySelector(".sb-spinner")).toBeNull();
    act(() => button().click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("draws a link instead when given an href, keeping link behavior", () => {
    act(() => {
      render(
        <Button
          href="https://example.com/donate"
          target="_blank"
          icon="favorite"
        >
          Donate
        </Button>,
        container
      );
    });

    const link = container.querySelector("a")!;
    expect(container.querySelector("button")).toBeNull();
    expect(link.getAttribute("href")).toBe("https://example.com/donate");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.hasAttribute("type")).toBe(false);
    expect(link.classList).toContain("sb-button");
    expect(link.querySelector(".sb-button-label")?.textContent).toBe("Donate");

    act(() => {
      render(null, container);
      render(
        <Button href="/about" rel="author">
          About
        </Button>,
        container
      );
    });
    expect(container.querySelector("a")!.getAttribute("rel")).toBe("author");
    expect(container.querySelector("a")!.hasAttribute("target")).toBe(false);
  });
});
