import { render } from "preact";
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
