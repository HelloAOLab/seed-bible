import { render } from "preact";
import { act } from "preact/test-utils";
import { ColorPicker } from "@packages/seed-bible/seed-bible/components/ColorPicker/ColorPicker";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("ColorPicker", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 768,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    document.body
      .querySelectorAll(".sb-color-picker-layer")
      .forEach((node) => node.remove());
    document.getElementById("sb-color-picker-host")?.remove();
  });

  function setup(
    overrides: Partial<{
      value: string;
      onChange: (hex: string) => void;
      onPreview: (hex: string) => void;
      onCancel: () => void;
    }> = {}
  ) {
    const onChange = overrides.onChange ?? vi.fn();
    const onPreview = overrides.onPreview ?? vi.fn();
    const onCancel = overrides.onCancel ?? vi.fn();
    act(() => {
      render(
        <ColorPicker
          value={overrides.value ?? "#ff0000"}
          onChange={onChange}
          onPreview={onPreview}
          onCancel={onCancel}
          ariaLabel="Pick a color"
        />,
        container
      );
    });
    return { onChange, onPreview, onCancel };
  }

  function trigger() {
    const el = container.querySelector<HTMLButtonElement>(
      ".sb-color-picker-trigger"
    );
    if (!el) throw new Error("trigger was not rendered");
    return el;
  }

  function dialog() {
    return document.body.querySelector<HTMLDivElement>(
      ".sb-color-picker-dialog"
    );
  }

  function hexInput() {
    const el = document.body.querySelector<HTMLInputElement>(
      ".sb-color-picker-hex"
    );
    if (!el) throw new Error("hex input was not rendered");
    return el;
  }

  function open() {
    act(() => {
      trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  it("does not open until the trigger is clicked", () => {
    setup();
    expect(dialog()).toBeNull();
  });

  it("does not commit while the user is still adjusting", () => {
    const { onChange, onPreview } = setup();
    open();

    act(() => {
      const input = hexInput();
      input.value = "112233";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onPreview).toHaveBeenCalledWith("#112233");
    expect(
      container.querySelector<HTMLElement>(".sb-color-picker-swatch")!.style
        .background
    ).toBe("rgb(255, 0, 0)");
  });

  it("commits the draft color only when Confirm is pressed", () => {
    const { onChange, onPreview, onCancel } = setup();
    open();

    act(() => {
      const input = hexInput();
      input.value = "334455";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      document.body
        .querySelector<HTMLButtonElement>(".sb-color-picker-confirm")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#334455");
    expect(onPreview).toHaveBeenCalledWith("#334455");
    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
    expect(document.querySelector(".sb-color-picker-layer")).toBeNull();
  });

  it("does not leave the overlay if confirm unmounts the picker", () => {
    const onChange = vi.fn(() => {
      act(() => render(null, container));
    });
    setup({ onChange });
    open();
    expect(document.querySelector(".sb-color-picker-layer")).not.toBeNull();

    act(() => {
      document.body
        .querySelector<HTMLButtonElement>(".sb-color-picker-confirm")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".sb-color-picker-layer")).toBeNull();
    expect(document.getElementById("sb-color-picker-host")).toBeNull();
  });

  it("discards the draft when Cancel is pressed", () => {
    const { onChange, onCancel } = setup();
    open();

    act(() => {
      const input = hexInput();
      input.value = "abcdef";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      document.body
        .querySelector<HTMLButtonElement>(".sb-color-picker-cancel")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });

  it("treats Escape and a backdrop press as cancel, not confirm", () => {
    const { onChange, onCancel } = setup();
    open();

    act(() => {
      const input = hexInput();
      input.value = "00ff00";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();

    open();
    act(() => {
      document.body
        .querySelector(".sb-color-picker-backdrop")!
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("updates the saturation square from pointer drags without committing", () => {
    const { onChange, onPreview } = setup({ value: "#ff0000" });
    open();

    const sv = document.body.querySelector<HTMLDivElement>(
      ".sb-color-picker-sv"
    )!;
    vi.spyOn(sv, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    act(() => {
      sv.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: 50,
          clientY: 50,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", { clientX: 50, clientY: 50 })
      );
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onPreview).toHaveBeenCalled();
    const previewed = onPreview.mock.calls.at(-1)?.[0] as string;
    expect(previewed).toMatch(/^#[0-9a-f]{6}$/);
    expect(previewed).not.toBe("#ff0000");
  });
});
