import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { DisplayNamePrompt } from "@packages/seed-bible/seed-bible/components/DisplayNamePrompt/DisplayNamePrompt";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { OnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import { getUserAnimalVisual } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { visualAnonymousLabel } from "@packages/seed-bible/seed-bible/managers/Utils";
import { mockTranslate } from "../testUtils/mockI18n";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const USER_ID = "abcdefghijklmnop";

describe("DisplayNamePrompt", () => {
  let container: HTMLDivElement;
  let needsDisplayNamePrompt: ReturnType<typeof signal<boolean>>;
  let dismissDisplayNamePrompt: ReturnType<typeof vi.fn>;
  let updateProfile: ReturnType<typeof vi.fn>;
  let onboardingStep: ReturnType<typeof signal<"done" | "install">>;

  const login = () =>
    ({
      userId: signal(USER_ID),
      profile: signal({ name: "" }),
      needsDisplayNamePrompt,
      dismissDisplayNamePrompt,
      updateProfile,
    }) as unknown as LoginManager;

  const onboarding = () =>
    ({
      step: onboardingStep,
    }) as unknown as OnboardingManager;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    needsDisplayNamePrompt = signal(true);
    dismissDisplayNamePrompt = vi.fn(() => {
      needsDisplayNamePrompt.value = false;
    });
    updateProfile = vi.fn();
    onboardingStep = signal<"done" | "install">("done");
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const mount = () => {
    act(() => {
      render(
        <DisplayNamePrompt login={login()} onboarding={onboarding()} />,
        container
      );
    });
  };

  it("shows the Color + Icon default from the user's avatar", () => {
    mount();
    const expected = visualAnonymousLabel(
      getUserAnimalVisual(USER_ID),
      mockTranslate
    );
    expect(container.textContent).toContain(expected);
    expect(container.textContent).toContain("Choose a display name");
  });

  it("stays hidden while onboarding is still up", () => {
    onboardingStep.value = "install";
    mount();
    expect(container.textContent).toBe("");
  });

  it("stays hidden when the prompt flag is off", () => {
    needsDisplayNamePrompt.value = false;
    mount();
    expect(container.textContent).toBe("");
  });

  it("saves an empty profile when keeping the default, so the account has a record on the next load", () => {
    mount();
    const keep = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent === "Keep default"
    );
    act(() => keep!.click());
    expect(updateProfile).toHaveBeenCalledWith({ name: "" });
    expect(dismissDisplayNamePrompt).not.toHaveBeenCalled();
  });

  it("saves a typed name onto the profile", () => {
    mount();
    const input = container.querySelector(
      "#sb-display-name-input"
    ) as HTMLInputElement;
    act(() => {
      input.value = "Ada";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const save = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent === "Save name"
    );
    act(() => save!.click());
    expect(updateProfile).toHaveBeenCalledWith({ name: "Ada" });
  });
});
