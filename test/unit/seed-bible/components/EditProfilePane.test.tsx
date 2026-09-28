import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { EditProfilePane } from "@packages/seed-bible/seed-bible/components/ProfilePane/EditProfilePane";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

interface StateOptions {
  userId?: string | null;
  /** Null stands for "the profile has not loaded yet". */
  profile?: UserProfile | null;
  email?: string | null;
  isSavingProfile?: boolean;
}

function createState(options: StateOptions = {}) {
  const {
    userId = "user-1",
    profile = {
      name: "Craig Anders",
      location: "Austin, TX",
      description: "Reading through Psalms.",
      pictureUrl: null,
    },
    email = "craig@example.org",
    isSavingProfile = false,
  } = options;

  const updateProfile = vi.fn((_newData: Partial<UserProfile>) => {});

  const state = {
    login: {
      userId: signal(userId) as Signal<string | null>,
      profile: signal(profile) as Signal<UserProfile | null>,
      userInfo: signal(email == null ? null : { id: userId, email }),
      isSavingProfile: signal(isSavingProfile),
      updateProfile,
    },
  } as unknown as SeedBibleState;

  return { state, updateProfile };
}

function typeInto(input: HTMLInputElement | HTMLTextAreaElement, text: string) {
  act(() => {
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("EditProfilePane", () => {
  let container: HTMLDivElement;
  let onEditPicture: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onEditPicture = vi.fn(() => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(state: SeedBibleState) {
    act(() => {
      render(
        <EditProfilePane state={state} onEditPicture={onEditPicture} />,
        container
      );
    });
  }

  function field(id: string) {
    return container.querySelector(`#${id}`) as
      | HTMLInputElement
      | HTMLTextAreaElement;
  }

  it("fills the three fields from the stored profile", () => {
    const { state } = createState();
    renderPane(state);

    expect(field("sb-edit-profile-name").value).toBe("Craig Anders");
    expect(field("sb-edit-profile-location").value).toBe("Austin, TX");
    expect(field("sb-edit-profile-description").value).toBe(
      "Reading through Psalms."
    );
  });

  // The screen is only for editing who you are, so the Profile screen's
  // content rows and plans card have no place on it.
  it("leaves out the content rows and the reading plans card", () => {
    const { state } = createState();
    renderPane(state);

    expect(container.querySelector(".sb-profile-row")).toBeNull();
    expect(container.querySelector(".sb-profile-plans")).toBeNull();
  });

  it("still shows the email line and the editable avatar", () => {
    const { state } = createState();
    renderPane(state);

    expect(container.querySelector(".sb-profile-email")?.textContent).toBe(
      "craig@example.org"
    );

    act(() => {
      (
        container.querySelector(
          ".sb-profile-avatar-button"
        ) as HTMLButtonElement
      ).click();
    });
    expect(onEditPicture).toHaveBeenCalledTimes(1);
  });

  it("writes the edited fields only when the user saves", () => {
    const { state, updateProfile } = createState();
    renderPane(state);

    typeInto(field("sb-edit-profile-name"), "Craig A.");
    typeInto(field("sb-edit-profile-location"), "Dallas, TX");
    typeInto(field("sb-edit-profile-description"), "Now in Proverbs.");

    // A half-typed name must not reach the account.
    expect(updateProfile).not.toHaveBeenCalled();

    act(() => {
      (
        container.querySelector(".sb-profile-save") as HTMLButtonElement
      ).click();
    });

    expect(updateProfile).toHaveBeenCalledWith({
      name: "Craig A.",
      location: "Dallas, TX",
      description: "Now in Proverbs.",
    });
  });

  // The stored value is nullable, and an empty box means "cleared", not "".
  it("clears an emptied location and description to null", () => {
    const { state, updateProfile } = createState();
    renderPane(state);

    typeInto(field("sb-edit-profile-location"), "");
    typeInto(field("sb-edit-profile-description"), "");

    act(() => {
      (
        container.querySelector(".sb-profile-save") as HTMLButtonElement
      ).click();
    });

    expect(updateProfile).toHaveBeenCalledWith({
      name: "Craig Anders",
      location: null,
      description: null,
    });
  });

  // `updateProfile` refuses to write before the profile has loaded, because it
  // would merge onto an empty base and wipe the account. Saying so beats a
  // Save button that looks like it worked and did nothing.
  it("refuses to save while the profile is still loading", () => {
    const { state, updateProfile } = createState({ profile: null });
    renderPane(state);

    const save = container.querySelector(
      ".sb-profile-save"
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.textContent).toContain("Loading your profile");

    act(() => {
      save.click();
    });
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("shows a saving state while a write is in flight", () => {
    const { state } = createState({ isSavingProfile: true });
    renderPane(state);

    const save = container.querySelector(
      ".sb-profile-save"
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.textContent).toContain("Saving");
  });

  it("prompts a signed-out visitor instead of showing an editable form", () => {
    const { state } = createState({ userId: null, profile: null, email: null });
    renderPane(state);

    expect(container.querySelector("#sb-edit-profile-name")).toBeNull();
    expect(
      container.querySelector(".sb-profile-signin-hint")?.textContent
    ).toContain("Sign in");
  });
});
