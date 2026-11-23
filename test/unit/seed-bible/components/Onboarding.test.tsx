import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  LanguageUnavailableModal,
  OnboardingModals,
  UiLanguageSwitchModal,
} from "@packages/seed-bible/seed-bible/components/Onboarding/Onboarding";
import type { OnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type {
  LanguageFallbackPrompt,
  UiLanguageSwitchPrompt,
} from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { pressAndRelease } from "../testUtils/pressAndRelease";
import { TestHost } from "./TestHost";

describe("onboarding windows", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const show = (state: SeedBibleState, children: preact.ComponentChildren) => {
    act(() => {
      render(<TestHost state={state}>{children}</TestHost>, container);
    });
  };

  const dialog = () =>
    document.querySelector<HTMLElement>('[role="dialog"].sb-onboarding-card');

  const pressEscape = () => {
    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
  };

  describe("install the app", () => {
    function createOnboarding() {
      const step = signal<"install" | "done">("install");
      const dismissInstall = vi.fn(() => {
        step.value = "done";
      });
      const onboarding = {
        platform: "pc",
        standalone: false,
        installed: signal(false),
        step,
        dismissInstall,
        markInstalled: vi.fn(),
      } as unknown as OnboardingManager;
      return { onboarding, dismissInstall };
    }

    const os = {} as CasualOSManager;

    it("is a dialog named for installing, with focus inside", async () => {
      const state = await createTestSeedBibleState();
      const { onboarding } = createOnboarding();
      show(
        state,
        <OnboardingModals onboarding={onboarding} os={os} toast={vi.fn()} />
      );

      expect(dialog()?.getAttribute("aria-modal")).toBe("true");
      expect(dialog()?.getAttribute("aria-label")).toBe("Install App");
      expect(dialog()?.contains(document.activeElement)).toBe(true);
    });

    it("is put off until later by Escape or the backdrop, as by Maybe later", async () => {
      const state = await createTestSeedBibleState();
      const { onboarding, dismissInstall } = createOnboarding();
      show(
        state,
        <OnboardingModals onboarding={onboarding} os={os} toast={vi.fn()} />
      );

      pressEscape();
      expect(dismissInstall).toHaveBeenCalledTimes(1);
      expect(dialog()).toBeNull();

      act(() => {
        (onboarding.step as ReturnType<typeof signal>).value = "install";
      });
      const backdrop = document.querySelector<HTMLElement>(
        ".sb-dialog-backdrop"
      )!;
      pressAndRelease(backdrop, backdrop);
      expect(dismissInstall).toHaveBeenCalledTimes(2);
    });
  });

  describe("language unavailable", () => {
    it("is a dialog named by its title that Escape answers with No, go back", async () => {
      const state = await createTestSeedBibleState();
      act(() => {
        state.i18n.languageFallbackPrompt.value = {
          requestedLanguage: "gu",
          fallbackLanguage: "hi",
        } as LanguageFallbackPrompt;
      });
      show(state, <LanguageUnavailableModal />);

      expect(dialog()?.getAttribute("aria-label")).toBe("Language Unavailable");
      expect(dialog()?.contains(document.activeElement)).toBe(true);

      pressEscape();
      expect(state.i18n.languageFallbackPrompt.value).toBeNull();
      expect(dialog()).toBeNull();
    });
  });

  describe("switch language", () => {
    it("is a dialog in the offered language's direction that Escape answers with Don't switch", async () => {
      const state = await createTestSeedBibleState();
      act(() => {
        state.i18n.uiLanguageSwitchPrompt.value = {
          targetLanguage: "ar",
          t: ((_key: string, options?: { defaultValue?: string }) =>
            options?.defaultValue ?? "") as UiLanguageSwitchPrompt["t"],
        };
      });
      show(state, <UiLanguageSwitchModal />);

      expect(dialog()?.getAttribute("aria-label")).toBe("Switch language?");
      expect(
        dialog()?.querySelector(".sb-onboarding-content")?.getAttribute("dir")
      ).toBe("rtl");
      expect(dialog()?.contains(document.activeElement)).toBe(true);

      pressEscape();
      expect(state.i18n.uiLanguageSwitchPrompt.value).toBeNull();
      expect(dialog()).toBeNull();
    });
  });
});
