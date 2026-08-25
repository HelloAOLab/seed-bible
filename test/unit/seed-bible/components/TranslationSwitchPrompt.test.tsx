import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TranslationSwitchPromptContent,
  syncTranslationSwitchPromptModal,
} from "@packages/seed-bible/seed-bible/components/TranslationSwitchPrompt/TranslationSwitchPrompt";
import type { TranslationSwitchPrompt as TranslationSwitchPromptPayload } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const MODAL_ID = "translation-switch-prompt";
const CHECKBOX = ".sb-translation-switch-prompt-never-checkbox";
const PRIMARY = ".sb-translation-switch-prompt-btn-primary";
const SECONDARY = ".sb-translation-switch-prompt-btn-secondary";
const TERTIARY = ".sb-translation-switch-prompt-btn-tertiary";

function payload(
  overrides: Partial<TranslationSwitchPromptPayload> = {}
): TranslationSwitchPromptPayload {
  return {
    language: "es",
    translation: { id: "spa_onbv", language: "spa" },
    translationName: "Open Nueva Biblia Viva",
    languageSearchTerm: "Spanish",
    ...overrides,
  };
}

describe("TranslationSwitchPrompt", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
    // Real actions would re-run the manager's own gating; these tests are about
    // what the dialog renders and which action each control invokes.
    state.i18n.confirmTranslationSwitch = vi.fn(async () => undefined);
    state.i18n.chooseTranslationManually = vi.fn();
    state.i18n.dismissTranslationSwitch = vi.fn();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function mount(prompt: TranslationSwitchPromptPayload | null) {
    act(() => {
      state.i18n.translationSwitchPrompt.value = prompt;
      render(
        <TestHost state={state}>
          <TranslationSwitchPromptContent />
        </TestHost>,
        container
      );
    });
  }

  function click(selector: string) {
    const button = container.querySelector<HTMLButtonElement>(selector);
    expect(button).not.toBeNull();
    act(() => {
      button!.click();
    });
  }

  describe("content", () => {
    it("renders nothing when there is no prompt", () => {
      mount(null);

      expect(container.querySelector(PRIMARY)).toBeNull();
    });

    it("names the language and the translation being offered", () => {
      mount(payload());

      const text = container.textContent ?? "";
      // "es" renders through LANG_META as its display name, not the raw code.
      expect(text).toContain("Español");
      expect(text).toContain("Open Nueva Biblia Viva");
    });

    // Offered whether or not anyone is signed in — the choice is stored on the
    // profile for an account and on the device otherwise.
    it("always offers the never-ask-again choice", () => {
      mount(payload());

      expect(container.querySelector(CHECKBOX)).not.toBeNull();
    });

    it("shows the never-ask-again box already ticked", () => {
      state.i18n.translationSwitchNeverAskAgain.value = true;

      mount(payload());

      expect(container.querySelector<HTMLInputElement>(CHECKBOX)?.checked).toBe(
        true
      );
    });

    // The box writes straight to the manager, which is what lets closing the
    // dialog from the host honour it as well.
    it("unticking the box clears the manager's choice", () => {
      state.i18n.translationSwitchNeverAskAgain.value = true;
      mount(payload());

      const checkbox = container.querySelector<HTMLInputElement>(CHECKBOX)!;
      act(() => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      });

      expect(state.i18n.translationSwitchNeverAskAgain.value).toBe(false);
    });

    it("confirms the switch", () => {
      mount(payload());

      click(PRIMARY);

      expect(state.i18n.confirmTranslationSwitch).toHaveBeenCalledTimes(1);
      expect(state.i18n.dismissTranslationSwitch).not.toHaveBeenCalled();
    });

    it("hands off to the translation picker", () => {
      mount(payload());

      click(SECONDARY);

      expect(state.i18n.chooseTranslationManually).toHaveBeenCalledTimes(1);
      expect(state.i18n.confirmTranslationSwitch).not.toHaveBeenCalled();
    });

    it("dismisses the prompt", () => {
      mount(payload());

      click(TERTIARY);

      expect(state.i18n.dismissTranslationSwitch).toHaveBeenCalledTimes(1);
      expect(state.i18n.confirmTranslationSwitch).not.toHaveBeenCalled();
    });
  });

  describe("modal host wiring", () => {
    function sync() {
      syncTranslationSwitchPromptModal(state.modals, state.i18n);
    }

    function openModals() {
      return state.modals.modals.value.filter((m) => m.id === MODAL_ID);
    }

    it("opens the dialog through the modal host when a prompt is pending", () => {
      state.i18n.translationSwitchPrompt.value = payload();

      sync();

      expect(openModals()).toHaveLength(1);
      expect(openModals()[0]!.title).toEqual({
        key: "translationSwitch.title",
        defaultValue: "Also switch the Bible text?",
      });
    });

    it("closes the dialog once no prompt is pending", () => {
      state.i18n.translationSwitchPrompt.value = payload();
      sync();
      state.i18n.translationSwitchPrompt.value = null;

      sync();

      expect(openModals()).toHaveLength(0);
    });

    // Re-syncing happens on every signal change, so it must replace the body
    // rather than stack a second copy of the same dialog.
    it("does not stack a second dialog when re-synced", () => {
      state.i18n.translationSwitchPrompt.value = payload();

      sync();
      sync();

      expect(openModals()).toHaveLength(1);
    });

    // The host's close button and backdrop click both route through
    // `closeModal`, and dismissing this question means "No, keep reading".
    it("treats closing the dialog from the host as a dismissal", () => {
      state.i18n.translationSwitchPrompt.value = payload();
      sync();

      state.modals.closeModal(MODAL_ID);

      expect(state.i18n.dismissTranslationSwitch).toHaveBeenCalledTimes(1);
      expect(openModals()).toHaveLength(0);
    });
  });
});
