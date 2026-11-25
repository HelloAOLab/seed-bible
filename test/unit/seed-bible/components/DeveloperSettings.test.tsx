import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

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

function createMockState(): SeedBibleState {
  return {
    sidebar: {
      requestedSettingsView: signal<string>("main"),
      closeSettings: vi.fn(),
    },
    login: { userId: signal<string | null>(null) },
    onboarding: { installed: signal(true), openInstall: vi.fn() },
    tutorial: { start: vi.fn() },
    app: { isMobile: signal(false) },
    i18n: { language: signal("en") },
    navigation: {
      batchWrites: (fn: () => void) => fn(),
      currentUrl: signal(new URL("https://example.test/?settingsView=main")),
      push: vi.fn(),
    },
    openProfile: vi.fn(),
  } as unknown as SeedBibleState;
}

async function waitForCondition(check: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

let container: HTMLDivElement;

beforeEach(() => {
  localStorage.clear();
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(() => Promise.resolve()) },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  vi.unstubAllEnvs();
});

/** Renders Settings fresh, as the given kind of build would. */
async function renderSettings(build: "dev" | "production") {
  if (build === "production") {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
  }
  vi.resetModules();
  const { initDevToolsUnlock } =
    await import("@packages/seed-bible/seed-bible/app/devTools/devToolsUnlock");
  const { SettingsPage } =
    await import("@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage");
  initDevToolsUnlock();
  const state = createMockState();
  await act(async () => {
    render(<SettingsPage state={state} />, container);
  });
  return state;
}

const navButton = (label: string) =>
  Array.from(
    container.querySelectorAll<HTMLButtonElement>(".sb-settings-nav-item")
  ).find((button) => button.textContent?.includes(label));

const buttonWithText = (text: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text
  );

const tapVersion = (times: number) => {
  const version = container.querySelector<HTMLButtonElement>(
    ".sb-settings-version"
  )!;
  for (let i = 0; i < times; i++) act(() => version.click());
};

describe("Settings → Developer", () => {
  it("is hidden in production until the version number is tapped seven times", async () => {
    await renderSettings("production");
    expect(navButton("Developer")).toBeUndefined();

    tapVersion(6);
    expect(navButton("Developer")).toBeUndefined();

    tapVersion(1);
    expect(navButton("Developer")).toBeDefined();
  });

  it("opens the Developer view, and Hide developer settings locks it again", async () => {
    const state = await renderSettings("production");
    tapVersion(7);

    act(() => navButton("Developer")!.click());
    await waitForCondition(() => !!buttonWithText("Hide developer settings"));
    expect(container.textContent).toContain("Show shared components");

    act(() => buttonWithText("Hide developer settings")!.click());

    expect(state.sidebar.requestedSettingsView.value).toBe("main");
    await waitForCondition(() => !!navButton("Account"));
    expect(navButton("Developer")).toBeUndefined();
  });

  it("shows the Developer row in a dev build without unlocking, with nothing to hide", async () => {
    await renderSettings("dev");
    expect(navButton("Developer")).toBeDefined();

    act(() => navButton("Developer")!.click());
    await waitForCondition(() =>
      container.textContent!.includes("Show shared components")
    );
    expect(buttonWithText("Hide developer settings")).toBeUndefined();
  });

  it("still copies the version when tapped", async () => {
    await renderSettings("production");
    tapVersion(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
  });
});
