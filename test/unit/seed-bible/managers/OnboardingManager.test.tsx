import { signal } from "@preact/signals";

import { createOnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

function createLogin(): LoginManager {
  return {
    userId: signal(null),
    profile: signal(null),
    localConfig: signal({}),
    updateProfile: vi.fn(),
  } as unknown as LoginManager;
}

describe("createOnboardingManager", () => {
  beforeEach(() => {
    // Flags persist in localStorage; start each test clean so a leftover
    // install-dismissed/installed flag doesn't leak between cases.
    window.localStorage.clear();
  });

  it("starts at 'done' — the install prompt no longer auto-shows on load", () => {
    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.step.value).toBe("done");
  });

  it("reports installAvailable when not installed and not dismissed", () => {
    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.installAvailable.value).toBe(true);
  });

  it("openInstall() shows the prompt on demand", () => {
    const onboarding = createOnboardingManager(createLogin());

    onboarding.openInstall();

    expect(onboarding.step.value).toBe("install");
  });

  it("dismissInstall() hides the prompt and clears installAvailable", () => {
    const onboarding = createOnboardingManager(createLogin());

    onboarding.openInstall();
    onboarding.dismissInstall();

    expect(onboarding.step.value).toBe("done");
    expect(onboarding.installAvailable.value).toBe(false);
  });

  it("markInstalled() clears installAvailable", () => {
    const onboarding = createOnboardingManager(createLogin());

    onboarding.markInstalled();

    expect(onboarding.installAvailable.value).toBe(false);
    expect(onboarding.installed.value).toBe(true);
  });

  it("does not treat a leftover localStorage install flag as still installed", () => {
    // Pre-fix sticky flag: after PWA uninstall this key can remain on the
    // origin even though the user is back in a normal browser tab.
    window.localStorage.setItem("sb-app-installed", "true");

    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.installed.value).toBe(false);
    expect(onboarding.installAvailable.value).toBe(true);
  });

  it("treats a standalone (installed-PWA) session as installed", () => {
    // jsdom has no matchMedia by default, so without this stub every test
    // only covers the browser-tab (not-installed) branch.
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("matchMedia", matchMedia);

    try {
      const onboarding = createOnboardingManager(createLogin());

      expect(matchMedia).toHaveBeenCalledWith("(display-mode: standalone)");
      expect(onboarding.standalone).toBe(true);
      expect(onboarding.installed.value).toBe(true);
      expect(onboarding.installAvailable.value).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
