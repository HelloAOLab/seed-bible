import { render, type ComponentProps } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ExtensionSettingsForm } from "@packages/seed-bible/seed-bible/components/ExtensionSettingsForm/ExtensionSettingsForm";
import type { ExtensionSettingValue } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { mockTranslate } from "../testUtils/mockI18n";

describe("ExtensionSettingsForm number fields", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  // Wired the way the Settings page wires it: the form shows whatever the
  // store resolves, and re-renders when the store changes.
  const renderForm = () => {
    const ownValues = signal<Record<string, ExtensionSettingValue>>({});
    act(() => {
      render(
        <ExtensionSettingsForm
          extensionId="ext-1"
          settings={{ ratio: { type: "number", default: 1 } }}
          getValue={(key) => ownValues.value[key] ?? 1}
          onChange={(key, value) => {
            ownValues.value = { ...ownValues.value, [key]: value };
          }}
          resetting={{
            hasOwnValue: (key) => key in ownValues.value,
            onReset: (key) => {
              const next = { ...ownValues.value };
              delete next[key];
              ownValues.value = next;
            },
          }}
          t={mockTranslate}
        />,
        container
      );
    });
    const input = container.querySelector<HTMLInputElement>(
      "#sb-extension-setting-ext-1-ratio"
    );
    if (!input) {
      throw new Error("No number input rendered for the ratio setting");
    }
    return { ownValues, input };
  };

  const type = (input: HTMLInputElement, text: string) => {
    act(() => {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  // Regression test: before the fix, the field re-rendered with the parsed
  // number on every keystroke, rewriting "1.0" to "1" so 1.05 couldn't be typed.
  it("keeps a decimal as typed, so a value like 1.05 can be entered", () => {
    const { ownValues, input } = renderForm();

    type(input, "1.0");
    expect(input.value).toBe("1.0");

    type(input, "1.05");
    expect(input.value).toBe("1.05");
    expect(ownValues.value.ratio).toBe(1.05);
  });

  it("keeps the last valid number when the field is cleared, and shows it again on leaving the field", () => {
    const { ownValues, input } = renderForm();
    type(input, "2.5");

    type(input, "");
    expect(ownValues.value.ratio).toBe(2.5);

    act(() => input.blur());
    expect(input.value).toBe("2.5");
  });

  it("shows the fallback value after resetting a number the viewer typed", () => {
    const { ownValues, input } = renderForm();
    type(input, "2.5");
    act(() => input.blur());

    const resetButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Reset to default"]'
    );
    act(() => resetButton?.click());

    expect(ownValues.value).toEqual({});
    expect(input.value).toBe("1");
  });
});

describe("ExtensionSettingsForm fields", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  type FormProps = ComponentProps<typeof ExtensionSettingsForm>;

  const renderForm = (
    overrides: Partial<FormProps> & Pick<FormProps, "settings">
  ) => {
    act(() => {
      render(
        <ExtensionSettingsForm
          extensionId="ext-1"
          getValue={() => undefined}
          onChange={() => undefined}
          t={mockTranslate}
          {...overrides}
        />,
        container
      );
    });
  };

  // Titles come from the extension's own translations; the stub falls back to
  // the setting's key, which is what these assertions look for.
  const field = (key: string) =>
    container.querySelector<HTMLInputElement>(
      `#sb-extension-setting-ext-1-${key}`
    );
  const overrideBox = (key: string) =>
    container.querySelector<HTMLInputElement>(
      `input[aria-label="Override ${key}"]`
    );
  const check = (input: HTMLInputElement, checked: boolean) => {
    act(() => {
      input.checked = checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  it("shows a text setting's value and reports what the viewer types", () => {
    const onChange = vi.fn();
    renderForm({
      settings: { greeting: { type: "string", default: "Hello" } },
      getValue: () => "Hi there",
      onChange,
    });
    const input = field("greeting");
    if (!input) {
      throw new Error("No text input rendered for the greeting setting");
    }
    expect(input.value).toBe("Hi there");

    act(() => {
      input.value = "Howdy";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith("greeting", "Howdy");
  });

  it("shows a boolean setting's value and reports toggling it", () => {
    const onChange = vi.fn();
    renderForm({
      settings: { showBanner: { type: "boolean", default: true } },
      getValue: () => true,
      onChange,
    });
    const box = field("showBanner");
    if (!box) {
      throw new Error("No checkbox rendered for the showBanner setting");
    }
    expect(box.checked).toBe(true);

    check(box, false);

    expect(onChange).toHaveBeenCalledWith("showBanner", false);
  });

  it("offers the reset action only for a setting the viewer has set", () => {
    const onReset = vi.fn();
    renderForm({
      settings: {
        greeting: { type: "string", default: "Hello" },
        count: { type: "number", default: 5 },
      },
      resetting: { hasOwnValue: (key) => key === "greeting", onReset },
    });

    const resets = container.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Reset to default"]'
    );
    expect(resets).toHaveLength(1);

    act(() => resets[0]?.click());

    expect(onReset).toHaveBeenCalledWith("greeting");
  });

  it("shows no reset action for a form that isn't wired for resetting", () => {
    renderForm({
      settings: { greeting: { type: "string", default: "Hello" } },
    });

    expect(
      container.querySelector('button[aria-label="Reset to default"]')
    ).toBeNull();
  });

  it("tells the viewer when an extension declares no settings", () => {
    renderForm({ settings: {} });

    expect(container.textContent).toContain(
      "This extension has no configurable settings."
    );
  });

  it("hides the field until a setting is overridden, and reports turning it on", () => {
    const onOverrideChange = vi.fn();
    renderForm({
      settings: { greeting: { type: "string", default: "Hello" } },
      getDefault: () => "Hello",
      overriding: { isOverridden: () => false, onOverrideChange },
    });
    const box = overrideBox("greeting");
    if (!box) {
      throw new Error("No override checkbox rendered for the greeting setting");
    }

    expect(field("greeting")).toBeNull();
    expect(container.textContent).toContain("Default value: Hello");
    expect(box.checked).toBe(false);

    check(box, true);

    expect(onOverrideChange).toHaveBeenCalledWith("greeting", true);
  });

  it("shows the field for an overridden setting, and reports turning it off", () => {
    const onOverrideChange = vi.fn();
    renderForm({
      settings: { greeting: { type: "string", default: "Hello" } },
      getValue: () => "Howdy",
      getDefault: () => "Hello",
      overriding: { isOverridden: () => true, onOverrideChange },
    });
    const box = overrideBox("greeting");
    if (!box) {
      throw new Error("No override checkbox rendered for the greeting setting");
    }

    expect(field("greeting")?.value).toBe("Howdy");
    expect(box.checked).toBe(true);

    check(box, false);

    expect(onOverrideChange).toHaveBeenCalledWith("greeting", false);
  });

  it("names the default a field would leave in place, including when there is none", () => {
    renderForm({
      settings: {
        showBanner: { type: "boolean", default: true },
        greeting: { type: "string" },
      },
      getDefault: (key) => (key === "showBanner" ? true : undefined),
    });

    expect(container.textContent).toContain("Default value: On");
    expect(container.textContent).toContain("No default");
  });
});
