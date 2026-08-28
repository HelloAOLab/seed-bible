import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { ProfilePane } from "@packages/seed-bible/seed-bible/components/ProfilePane/ProfilePane";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

interface StateOptions {
  userId?: string | null;
  name?: string | null;
  pictureUrl?: string | null;
  plansEnabled?: boolean;
}

function createState(options: StateOptions = {}) {
  const {
    userId = "user-1",
    name = "Craig Anders",
    pictureUrl = null,
    plansEnabled = true,
  } = options;

  const logout = vi.fn(async () => {});
  const login = vi.fn(async () => null);

  const state = {
    login: {
      userId: signal(userId) as Signal<string | null>,
      profile: signal(
        name == null && pictureUrl == null ? null : { name, pictureUrl }
      ),
      logout,
      login,
    },
    features: {
      isFeatureEnabled: () => signal(plansEnabled),
    },
    // Reading plans the user has none of — the card falls back to its prompt.
    readingPlans: {
      userReadingPlans: signal([]),
      fullReadingPlans: signal([]),
      userReadingPlanProgresses: signal([]),
    },
    os: { connectionId: "conn-1" },
  } as unknown as SeedBibleState;

  return { state, logout, login };
}

describe("ProfilePane", () => {
  let container: HTMLDivElement;
  let onOpenAccountSettings: Mock<() => void>;
  let onOpenReadingPlans: Mock<() => void>;
  let onOpenYourContent: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenAccountSettings = vi.fn(() => {});
    onOpenReadingPlans = vi.fn(() => {});
    onOpenYourContent = vi.fn(() => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(state: SeedBibleState) {
    act(() => {
      render(
        <ProfilePane
          state={state}
          onOpenAccountSettings={onOpenAccountSettings}
          onOpenReadingPlans={onOpenReadingPlans}
          onOpenYourContent={onOpenYourContent}
        />,
        container
      );
    });
  }

  it("shows the signed-in user's name", () => {
    const { state } = createState({ name: "Craig Anders" });
    renderPane(state);

    expect(container.querySelector(".sb-profile-name")?.textContent).toBe(
      "Craig Anders"
    );
  });

  it("falls back to initials when the user has no profile picture", () => {
    const { state } = createState({ name: "Craig Anders" });
    renderPane(state);

    const avatar = container.querySelector(".sb-profile-avatar");
    expect(avatar?.textContent).toBe("CA");
    expect((avatar as HTMLElement | null)?.style.backgroundImage).toBe("");
  });

  it("uses one initial for a single-word name", () => {
    const { state } = createState({ name: "Craig" });
    renderPane(state);

    expect(container.querySelector(".sb-profile-avatar")?.textContent).toBe(
      "C"
    );
  });

  it("shows the profile picture instead of initials when there is one", () => {
    const { state } = createState({ pictureUrl: "https://example.org/me.png" });
    renderPane(state);

    const avatar = container.querySelector(".sb-profile-avatar") as HTMLElement;
    expect(avatar.textContent).toBe("");
    expect(avatar.style.backgroundImage).toContain(
      "https://example.org/me.png"
    );
  });

  it("routes the account settings button to the caller", () => {
    const { state } = createState();
    renderPane(state);

    const button = container.querySelector(
      ".sb-profile-account-button"
    ) as HTMLButtonElement;
    expect(button.textContent).toContain("Account settings");
    act(() => {
      button.click();
    });

    expect(onOpenAccountSettings).toHaveBeenCalledTimes(1);
  });

  // The picture editor lives in account settings, so "+" goes there too.
  it("routes the avatar edit badge to account settings", () => {
    const { state } = createState();
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-profile-avatar-edit") as HTMLButtonElement
      ).click();
    });

    expect(onOpenAccountSettings).toHaveBeenCalledTimes(1);
  });

  it("signs the user out from the log out button", () => {
    const { state, logout } = createState();
    renderPane(state);

    const button = container.querySelector(
      ".sb-profile-logout"
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("Log out");
    act(() => {
      button.click();
    });

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("prompts a signed-out visitor to log in instead of showing a profile", () => {
    const { state, login } = createState({ userId: null, name: null });
    renderPane(state);

    expect(container.querySelector(".sb-profile-logout")).toBeNull();
    expect(container.querySelector(".sb-profile-account-button")).toBeNull();

    const button = container.querySelector(
      ".sb-profile-signin"
    ) as HTMLButtonElement;
    expect(button.textContent).toBe("Log in");
    act(() => {
      button.click();
    });

    expect(login).toHaveBeenCalledTimes(1);
  });

  it("invites the user to start a plan when they have none in progress", () => {
    const { state } = createState();
    renderPane(state);

    const card = container.querySelector(".sb-profile-plans");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("You haven't started a plan yet.");
    // Nothing to show progress for, so no bar is drawn.
    expect(container.querySelector(".sb-profile-progress")).toBeNull();
  });

  it("opens the plans pane from the plans card", () => {
    const { state } = createState();
    renderPane(state);

    act(() => {
      (
        container.querySelector(".sb-profile-plans") as HTMLButtonElement
      ).click();
    });

    expect(onOpenReadingPlans).toHaveBeenCalledTimes(1);
  });

  it("hides the plans card when the reading plans feature is off", () => {
    const { state } = createState({ plansEnabled: false });
    renderPane(state);

    expect(container.querySelector(".sb-profile-plans")).toBeNull();
    // The rest of the screen is unaffected.
    expect(container.querySelector(".sb-profile-name")).not.toBeNull();
  });
});
