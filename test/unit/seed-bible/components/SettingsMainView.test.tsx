import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createSidebar } from "@packages/seed-bible/seed-bible/managers/SidebarManager";
import type { ChatsManager } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  AppConfigProvider,
  DEFAULT_APP_CONFIG,
} from "@packages/seed-bible/seed-bible/app/appConfig";

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
const testBranding = {
  appName: "Seed Bible",
  shortName: "Seed",
  logo: "",
  icon: "",
  websiteUrl: "",
};

function createMockState(
  userId: string | null,
  options: { isMobile?: boolean } = {}
): SeedBibleState {
  return {
    sidebar: {
      requestedSettingsView: signal<string>("main"),
      closeSettings: vi.fn(),
    },
    login: {
      userId: signal<string | null>(userId),
    },
    onboarding: {
      installed: signal(true),
      openInstall: vi.fn(),
    },
    tutorial: {
      start: vi.fn(),
    },
    app: { isMobile: signal(options.isMobile ?? false) },
    i18n: { language: signal("en") },
    navigation: {
      batchWrites: (fn: () => void) => fn(),
      currentUrl: signal(new URL("https://example.test/?settingsView=main")),
      push: vi.fn(),
    },
    openProfile: vi.fn(),
  } as unknown as SeedBibleState;
}

describe("SettingsMainView", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderMain(
    userId: string | null,
    options: { isMobile?: boolean } = {}
  ) {
    const state = createMockState(userId, options);
    act(() => {
      render(<SettingsPage state={state} />, container);
    });
    return state;
  }

  const navLabels = () =>
    Array.from(container.querySelectorAll(".sb-settings-nav-label")).map(
      (el) => el.textContent
    );

  it("has no Customize nav item, even when signed in", () => {
    renderMain("user-1");

    expect(navLabels()).not.toContain("Customize");
  });

  const navButton = (label: string) =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-settings-nav-item")
    ).find((button) => button.textContent?.includes(label))!;

  it("opens Profile from Account and keeps Settings open beside it", () => {
    const state = renderMain("user-1");

    act(() => navButton("Account").click());

    expect(state.openProfile).toHaveBeenCalled();
    expect(state.sidebar.closeSettings).not.toHaveBeenCalled();
  });

  it("closes Settings when opening Profile on a phone, where it covers the screen", () => {
    const state = renderMain("user-1", { isMobile: true });

    act(() => navButton("Account").click());

    expect(state.openProfile).toHaveBeenCalled();
    expect(state.sidebar.closeSettings).toHaveBeenCalled();
  });

  it("opens About and keeps Settings open beside it", () => {
    const state = renderMain("user-1");

    act(() => navButton("About Seed Bible").click());

    // Settings' screen stays in the URL, or the new page would close it.
    expect(state.navigation.push).toHaveBeenCalledWith(
      "/en/about?settingsView=main"
    );
    expect(state.sidebar.closeSettings).not.toHaveBeenCalled();
  });

  it("closes Settings when opening About on a phone", () => {
    const state = renderMain("user-1", { isMobile: true });

    act(() => navButton("About Seed Bible").click());

    expect(state.navigation.push).toHaveBeenCalledWith("/en/about");
    expect(state.sidebar.closeSettings).toHaveBeenCalled();
  });

  it("opening Profile from Account on a phone adds a single history entry", () => {
    const navigation = createNavigationManager();
    const sidebar = createSidebar({
      chatsManager: { isOpen: signal(false) } as unknown as ChatsManager,
      navigation,
    });
    const profileOpen = signal<string | null>(null);
    const stopSyncingProfile = navigation.syncSignalsToUrl({
      profile: profileOpen,
    });
    const state = {
      ...createMockState("user-1", { isMobile: true }),
      navigation,
      sidebar,
      openProfile: () => (profileOpen.value = "open"),
    } as unknown as SeedBibleState;

    try {
      act(() => {
        sidebar.openSettings();
        render(<SettingsPage state={state} />, container);
      });
      const historyLengthBefore = window.history.length;

      const accountButton = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".sb-settings-nav-item")
      ).find((button) => button.textContent?.includes("Account"))!;
      act(() => {
        accountButton.click();
      });

      expect(window.history.length).toBe(historyLengthBefore + 1);
      expect(window.location.search).toBe("?profile=open");
    } finally {
      stopSyncingProfile();
      navigation.dispose();
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("hides the About nav item when disabledSettings includes about-seed-bible", () => {
    const state = createMockState("user-1");

    act(() => {
      render(
        <AppConfigProvider
          value={{
            ...DEFAULT_APP_CONFIG,
            branding: {
              ...testBranding,
              disabledSettings: ["about-seed-bible"],
            },
          }}
        >
          <SettingsPage state={state} />
        </AppConfigProvider>,
        container
      );
    });

    expect(navLabels()).not.toContain("About Seed Bible");
  });

  it("shows the About nav item when about-seed-bible is not disabled", () => {
    const state = createMockState("user-1");

    act(() => {
      render(
        <AppConfigProvider
          value={{
            ...DEFAULT_APP_CONFIG,
            branding: {
              ...testBranding,
              disabledSettings: [""],
            },
          }}
        >
          <SettingsPage state={state} />
        </AppConfigProvider>,
        container
      );
    });

    expect(navLabels()).toContain("About Seed Bible");
  });
});
