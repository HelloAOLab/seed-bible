import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { PaneHeader } from "@packages/seed-bible/seed-bible/components/PaneHeader/PaneHeader";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      language: "en",
    }),
  };
});

describe("PaneHeader", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders only a title and close button when no header is provided", () => {
    act(() => {
      render(
        <PaneHeader title={signal("My Pane")} onClose={vi.fn()} />,
        container
      );
    });

    expect(container.querySelector(".sb-pane-header-title")?.textContent).toBe(
      "My Pane"
    );
    expect(container.querySelector(".sb-pane-header-actions")).toBeNull();
    expect(
      container.querySelector(".sb-pane-header-close-button")
    ).not.toBeNull();
  });

  it("renders a function title as a component inside the title slot", () => {
    act(() => {
      render(
        <PaneHeader
          title={() => <span className="custom-title">Custom</span>}
          onClose={vi.fn()}
        />,
        container
      );
    });

    const titleSlot = container.querySelector(".sb-pane-header-title");
    expect(titleSlot?.querySelector(".custom-title")).not.toBeNull();
    expect(titleSlot?.textContent).toBe("Custom");
  });

  it("renders the custom header between the title and the close button", () => {
    act(() => {
      render(
        <PaneHeader
          title={signal("My Pane")}
          onClose={vi.fn()}
          header={() => <button className="my-custom-button">Refresh</button>}
        />,
        container
      );
    });

    const header = container.querySelector(".sb-pane-header");
    const children = Array.from(header?.children ?? []);
    const titleIndex = children.findIndex((el) =>
      el.classList.contains("sb-pane-header-title")
    );
    const actionsIndex = children.findIndex((el) =>
      el.classList.contains("sb-pane-header-actions")
    );
    const closeIndex = children.findIndex((el) =>
      el.classList.contains("sb-pane-header-close-button")
    );

    // Title, then the custom header slot, then the close button — in order.
    expect(titleIndex).toBeGreaterThanOrEqual(0);
    expect(actionsIndex).toBeGreaterThan(titleIndex);
    expect(closeIndex).toBeGreaterThan(actionsIndex);

    expect(
      container.querySelector(".sb-pane-header-actions .my-custom-button")
        ?.textContent
    ).toBe("Refresh");
  });

  it("does not propagate pointerdown from the custom header (so it can't start a drag)", () => {
    const onPointerDown = vi.fn();

    act(() => {
      render(
        <PaneHeader
          title={signal("My Pane")}
          onClose={vi.fn()}
          onPointerDown={onPointerDown}
          header={() => <button className="my-custom-button">Refresh</button>}
        />,
        container
      );
    });

    const button = container.querySelector(
      ".my-custom-button"
    ) as HTMLButtonElement;
    act(() => {
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it("still starts a drag from the header body itself", () => {
    const onPointerDown = vi.fn();

    act(() => {
      render(
        <PaneHeader
          title={signal("My Pane")}
          onClose={vi.fn()}
          onPointerDown={onPointerDown}
          header={() => <button className="my-custom-button">Refresh</button>}
        />,
        container
      );
    });

    const title = container.querySelector(
      ".sb-pane-header-title"
    ) as HTMLElement;
    act(() => {
      title.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(onPointerDown).toHaveBeenCalled();
  });
});
