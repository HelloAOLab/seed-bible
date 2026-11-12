import { render } from "preact";
import { act } from "preact/test-utils";
import { CloseButton } from "@packages/seed-bible/seed-bible/components/CloseButton/CloseButton";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("CloseButton", () => {
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

  it("is a plain button named Close by default", () => {
    act(() => {
      render(<CloseButton onClose={vi.fn()} />, container);
    });

    // A plain button inside a form must not submit it.
    expect(button().type).toBe("button");
    expect(button().getAttribute("aria-label")).toBe("Close");
    expect(button().title).toBe("Close");
    // The icon's ligature text ("close") isn't read out on top of the label.
    expect(
      button()
        .querySelector(".material-symbols-outlined")
        ?.getAttribute("aria-hidden")
    ).toBe("true");
  });

  it("uses the label it's given for screen readers and the tooltip", () => {
    act(() => {
      render(<CloseButton label="Hide" onClose={vi.fn()} />, container);
    });

    expect(button().getAttribute("aria-label")).toBe("Hide");
    expect(button().title).toBe("Hide");
  });

  it("calls onClose when clicked", () => {
    const onClose = vi.fn();
    act(() => {
      render(<CloseButton onClose={onClose} />, container);
    });

    act(() => button().click());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("doesn't call onClose while disabled", () => {
    const onClose = vi.fn();
    act(() => {
      render(<CloseButton disabled onClose={onClose} />, container);
    });

    act(() => button().click());

    expect(onClose).not.toHaveBeenCalled();
  });

  it("defaults to the medium plain look and keeps the caller's class", () => {
    act(() => {
      render(<CloseButton className="sb-x" onClose={vi.fn()} />, container);
    });

    expect([...button().classList]).toEqual([
      "sb-close-button",
      "sb-close-button-md",
      "sb-close-button-plain",
      "sb-x",
    ]);
  });

  it("takes a size and look", () => {
    act(() => {
      render(
        <CloseButton size="lg" look="tinted" onClose={vi.fn()} />,
        container
      );
    });

    expect(button().classList).toContain("sb-close-button-lg");
    expect(button().classList).toContain("sb-close-button-tinted");
  });
});
