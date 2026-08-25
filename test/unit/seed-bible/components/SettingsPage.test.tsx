import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { TranslationSwitchPreference } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

// Match the i18n mock used by the other component tests: return the
// defaultValue (or key) so assertions can rely on the English strings.
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
      availableLanguages: ["en"],
      setLanguage: vi.fn(),
    }),
  };
});

function createMockState(preference: TranslationSwitchPreference) {
  const setTranslationSwitchPreference = vi.fn();
  const state = {
    // "" is the no-deep-link case, which lands on the main settings list.
    sidebar: {
      requestedSettingsView: signal<string>(""),
      closeSettings: vi.fn(),
    },
    settings: {
      translationSwitchPreference:
        signal<TranslationSwitchPreference>(preference),
      setTranslationSwitchPreference,
    },
    onboarding: {
      installed: signal<boolean>(true),
      openInstall: vi.fn(),
    },
    tutorial: { start: vi.fn() },
  } as unknown as SeedBibleState;
  return { state, setTranslationSwitchPreference };
}

function renderSettings(state: SeedBibleState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    render(<SettingsPage state={state} />, container);
  });
  return container;
}

function askToggleIn(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>(
    "#sb-ask-switch-translation"
  );
}

describe("SettingsPage translation-switch preference", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  // Asking is the default, so there is nothing to undo until the user has
  // turned it off from the prompt itself.
  it("hides the toggle while the prompt is still being shown", () => {
    const { state } = createMockState("ask");

    const container = renderSettings(state);

    expect(askToggleIn(container)).toBeNull();
    expect(container.textContent).not.toContain(
      "Ask before switching the Bible text"
    );
  });

  it.each(["always", "never"] as const)(
    "offers the toggle once the user has settled on %s",
    (preference) => {
      const { state } = createMockState(preference);

      const container = renderSettings(state);

      expect(askToggleIn(container)).not.toBeNull();
      expect(container.textContent).toContain(
        "Ask before switching the Bible text"
      );
    }
  );

  it("returns to asking when the toggle is ticked", () => {
    const { state, setTranslationSwitchPreference } = createMockState("never");
    const container = renderSettings(state);
    const toggle = askToggleIn(container);

    expect(toggle?.checked).toBe(false);
    act(() => {
      toggle!.checked = true;
      toggle!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(setTranslationSwitchPreference).toHaveBeenCalledWith("ask");
  });

  // The row is driven by the signal, not by a local copy of it, so restoring
  // the choice elsewhere (or answering another prompt) keeps it in step.
  it("drops the toggle again as soon as asking is restored", () => {
    const { state } = createMockState("never");
    const container = renderSettings(state);
    expect(askToggleIn(container)).not.toBeNull();

    act(() => {
      (
        state.settings
          .translationSwitchPreference as Signal<TranslationSwitchPreference>
      ).value = "ask";
    });

    expect(askToggleIn(container)).toBeNull();
  });
});
