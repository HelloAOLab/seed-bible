import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

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

function createMockState(userId: string | null): SeedBibleState {
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
    app: {},
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

  function renderMain(userId: string | null) {
    const state = createMockState(userId);
    act(() => {
      render(<SettingsPage state={state} />, container);
    });
    return state;
  }

  const navLabels = () =>
    Array.from(container.querySelectorAll(".sb-settings-nav-label")).map(
      (el) => el.textContent
    );

  it("hides the Customize nav item when the user is signed out", () => {
    renderMain(null);

    expect(navLabels()).not.toContain("Customize");
  });

  it("shows the Customize nav item when the user is signed in", () => {
    renderMain("user-1");

    expect(navLabels()).toContain("Customize");
  });
});
