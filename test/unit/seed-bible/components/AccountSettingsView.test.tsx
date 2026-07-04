import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
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
    }),
  };
});

function createMockState(
  profile: UserProfile | null,
  updateProfile = vi.fn()
): { state: SeedBibleState; updateProfile: ReturnType<typeof vi.fn> } {
  const state = {
    login: {
      userId: signal<string | null>("user-1"),
      profile: signal<UserProfile | null>(profile),
      updateProfile,
      uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
    },
    sidebar: {
      requestedSettingsView: signal<string>("account"),
    },
    modals: {
      openModal: vi.fn().mockReturnValue("modal-1"),
      closeModal: vi.fn(),
    },
  } as unknown as SeedBibleState;
  return { state, updateProfile };
}

/** Simulate the user editing an input to `text` (including clearing it). */
function typeIntoInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  text: string
) {
  act(() => {
    input.value = text;
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
}

/**
 * Simulate the user backspacing the whole field one character at a time.
 * Going through the intermediate values matters: a single jump straight to
 * "" would leave the buggy computed's value unchanged from its initial state
 * (so no re-render fires), masking the very bug we're testing for.
 */
function backspaceToEmpty(input: HTMLInputElement | HTMLTextAreaElement) {
  for (let length = input.value.length - 1; length >= 0; length--) {
    typeIntoInput(input, input.value.slice(0, length));
  }
}

describe("AccountSettingsView", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const nameInput = () =>
    container.querySelector<HTMLInputElement>("#sb-profile-name")!;
  const locationInput = () =>
    container.querySelector<HTMLInputElement>("#sb-profile-location")!;
  const descriptionInput = () =>
    container.querySelector<HTMLTextAreaElement>("#sb-profile-description")!;
  const saveButton = () =>
    container.querySelector<HTMLButtonElement>(".sb-account-save-button")!;

  function renderAccount(profile: UserProfile | null, updateProfile = vi.fn()) {
    const { state } = createMockState(profile, updateProfile);
    act(() => {
      render(<SettingsPage state={state} />, container);
    });
    return { state, updateProfile };
  }

  it("shows the stored profile values initially", () => {
    renderAccount({
      name: "Test",
      location: "Austin, TX",
      description: "A description",
    });

    expect(nameInput().value).toBe("Test");
    expect(locationInput().value).toBe("Austin, TX");
    expect(descriptionInput().value).toBe("A description");
  });

  // ─── The reported bug ────────────────────────────────────────────────────
  // Deleting the last character used to snap the field back to the stored
  // value because `newName.value || profile.name` treated "" as "unedited".

  it("keeps the name field empty after the user deletes every character", () => {
    renderAccount({ name: "Test" });

    backspaceToEmpty(nameInput());

    expect(nameInput().value).toBe("");
  });

  it("keeps the location field empty after the user deletes every character", () => {
    renderAccount({ name: "Test", location: "Austin, TX" });

    backspaceToEmpty(locationInput());

    expect(locationInput().value).toBe("");
  });

  it("keeps the description field empty after the user deletes every character", () => {
    renderAccount({ name: "Test", description: "A description" });

    backspaceToEmpty(descriptionInput());

    expect(descriptionInput().value).toBe("");
  });

  // ─── Regression guards ───────────────────────────────────────────────────

  it("reflects a newly typed value", () => {
    renderAccount({ name: "Test" });

    typeIntoInput(nameInput(), "New name");

    expect(nameInput().value).toBe("New name");
  });

  it("saves a cleared name as an empty string and cleared optionals as null", () => {
    const { updateProfile } = renderAccount({
      name: "Test",
      location: "Austin, TX",
      description: "A description",
    });

    typeIntoInput(nameInput(), "");
    typeIntoInput(locationInput(), "");
    typeIntoInput(descriptionInput(), "");

    act(() => {
      saveButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "",
        location: null,
        description: null,
      })
    );
  });

  it("re-syncs the display to the stored profile after saving", () => {
    const profile = signal<UserProfile | null>({ name: "Test" });
    const updateProfile = vi.fn((patch: Partial<UserProfile>) => {
      // Emulate the manager persisting and refreshing the profile signal.
      profile.value = { ...(profile.value ?? { name: "" }), ...patch };
    });
    const state = {
      login: {
        userId: signal<string | null>("user-1"),
        profile,
        updateProfile,
        uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
      },
      sidebar: { requestedSettingsView: signal<string>("account") },
      modals: { openModal: vi.fn(), closeModal: vi.fn() },
    } as unknown as SeedBibleState;

    act(() => {
      render(<SettingsPage state={state} />, container);
    });

    typeIntoInput(nameInput(), "Updated");
    act(() => {
      saveButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // The edit signal was reset to null, so the display now follows the
    // freshly stored profile value.
    expect(nameInput().value).toBe("Updated");
  });
});
