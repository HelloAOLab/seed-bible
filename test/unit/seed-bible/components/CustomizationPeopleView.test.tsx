import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationPeopleView } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationPeopleView";
import {
  createCustomizationsManager,
  type SeedBibleCustomization,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import { createCustomizationVariantSelectionsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
import { createCustomizationExtensionPreferencesManager } from "@packages/seed-bible/seed-bible/managers/CustomizationExtensionPreferencesManager";
import {
  CasualOSManager,
  type StudioMember,
  type StudioRole,
} from "@packages/seed-bible/seed-bible/managers/OsManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { SettingsManager } from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function makeCustomization(
  overrides: Partial<SeedBibleCustomization> = {}
): SeedBibleCustomization {
  return {
    id: "customization_1",
    name: "Grace Church",
    variants: [
      {
        id: "variant-1",
        name: "Light",
        baseTheme: "light",
        themes: {},
        highlightColors: {},
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    defaultVariantId: "variant-1",
    logoUrl: null,
    icons: {},
    createdAt: 1,
    updatedAt: 1,
    extensionSettings: {},
    extensionSettingDefaults: {},
    extensionSensitiveProxies: {},
    ...overrides,
  };
}

/** Waits for pending promises (a member listing, a save) and the re-render after. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/**
 * The real customizations manager, signed in as `user-1`, with CasualOS
 * itself in memory: studios and their members are what the manager's calls
 * leave behind.
 */
async function renderPeople(
  customization: SeedBibleCustomization,
  studios: { studioId: string; role: StudioRole }[] = [],
  members: StudioMember[] = []
) {
  const os = CasualOSManager();
  const studioMembers = new Map<string, StudioMember[]>();
  for (const studio of studios) {
    studioMembers.set(studio.studioId, [...members]);
  }
  vi.spyOn(os, "listStudios").mockImplementation(async () => ({
    success: true,
    studios: studios.map((studio) => ({ ...studio, displayName: "" })),
  }));
  vi.spyOn(os, "listAllDataByMarker").mockImplementation(async (record) => ({
    success: true,
    items:
      record === (customization.studioId ?? "user-1")
        ? [{ address: customization.id, data: customization }]
        : [],
  }));
  vi.spyOn(os, "getData").mockResolvedValue({
    success: false,
    errorCode: "data_not_found",
    errorMessage: "",
  });
  vi.spyOn(os, "recordData").mockResolvedValue({ success: true } as never);
  vi.spyOn(os, "createStudio").mockImplementation(async () => {
    studioMembers.set("studio-new", [
      { userId: "user-1", role: "admin", name: "Ann", email: null },
    ]);
    return { success: true, studioId: "studio-new" };
  });
  vi.spyOn(os, "listStudioMembers").mockImplementation(async (studioId) => ({
    success: true,
    members: studioMembers.get(studioId) ?? [],
  }));
  const addStudioMember = vi
    .spyOn(os, "addStudioMember")
    .mockImplementation(async (studioId, email, role) => {
      if (email === "nobody@example.com") {
        return {
          success: false,
          errorCode: "user_not_found",
          errorMessage: "",
        };
      }
      studioMembers.get(studioId)!.push({
        userId: `user-${email}`,
        role,
        name: null,
        email,
      });
      return { success: true };
    });

  const login = {
    userId: signal("user-1"),
    authBot: signal(null),
    profile: signal(null),
    cachedProfile: signal(null),
    localConfig: signal({}),
  } as unknown as LoginManager;
  const settings = {
    settings: signal({ themeId: "light" }),
  } as unknown as SettingsManager;
  const customizations = createCustomizationsManager(
    os,
    login,
    createTheme(settings),
    createNavigationManager({ initialHref: "http://localhost/" }),
    createCustomizationVariantSelectionsManager(os, login),
    createCustomizationExtensionPreferencesManager(os, login)
  );
  await customizations.load();
  customizations.startEditing(customization.id);
  const toast = vi.fn();
  const state = {
    customizations,
    login,
    app: { toast },
  } as unknown as SeedBibleState;

  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    render(<CustomizationPeopleView state={state} />, container);
  });
  await settle();

  const buttonNamed = (name: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (button) =>
        button.textContent?.includes(name) ||
        button.getAttribute("aria-label") === name
    );
  return {
    container,
    customizations,
    toast,
    addStudioMember,
    buttonNamed,
    cleanup: () => {
      render(null, container);
      container.remove();
    },
  };
}

describe("CustomizationPeopleView", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.restoreAllMocks();
  });

  it("explains what sharing keeps in the creator's account before anything is shared", async () => {
    const view = await renderPeople(
      makeCustomization({ contentRecordName: "seedbible-content-1" })
    );
    cleanup = view.cleanup;

    expect(view.container.textContent).toContain(
      "Only you can edit this Custom Branding."
    );
    expect(view.container.textContent).toContain(
      "The content library stays in your account"
    );
    expect(view.container.textContent).not.toContain("extension keys");
  });

  it("shares the customization, then lists its first member", async () => {
    const view = await renderPeople(makeCustomization());
    cleanup = view.cleanup;

    await act(async () => {
      view.buttonNamed("Share with others")!.click();
    });
    await settle();

    expect(view.customizations.editingCustomization.value?.studioId).toBe(
      "studio-new"
    );
    expect(view.container.textContent).toContain("Ann (you)");
    expect(view.container.textContent).toContain("Manager");
    // Nobody can remove themselves.
    expect(view.buttonNamed("Remove Ann")).toBeUndefined();
  });

  it("lets a Manager add someone by email and remove others", async () => {
    const view = await renderPeople(
      makeCustomization({ studioId: "studio-1" }),
      [{ studioId: "studio-1", role: "admin" }],
      [
        { userId: "user-1", role: "admin", name: "Ann", email: null },
        {
          userId: "user-2",
          role: "member",
          name: "Bo",
          email: "bo@example.com",
        },
      ]
    );
    cleanup = view.cleanup;

    expect(view.buttonNamed("Remove Bo")).toBeDefined();

    const input = view.container.querySelector<HTMLInputElement>(
      "#sb-customization-people-email"
    )!;
    await act(async () => {
      input.value = "cy@example.com";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      view.container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
    });
    await settle();

    expect(view.addStudioMember).toHaveBeenCalledWith(
      "studio-1",
      "cy@example.com",
      "member"
    );
    expect(view.container.textContent).toContain("cy@example.com");
    expect(input.value).toBe("");
  });

  it("tells a Manager when nobody uses the email they added", async () => {
    const view = await renderPeople(
      makeCustomization({ studioId: "studio-1" }),
      [{ studioId: "studio-1", role: "admin" }],
      [{ userId: "user-1", role: "admin", name: "Ann", email: null }]
    );
    cleanup = view.cleanup;

    const input = view.container.querySelector<HTMLInputElement>(
      "#sb-customization-people-email"
    )!;
    await act(async () => {
      input.value = "nobody@example.com";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      view.container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
    });
    await settle();

    expect(view.toast).toHaveBeenCalledWith(
      expect.stringContaining("No Seed Bible account uses that email")
    );
    // The address stays, so it can be corrected.
    expect(input.value).toBe("nobody@example.com");
  });

  it("shows an Editor who can edit, without letting them change who can", async () => {
    const view = await renderPeople(
      makeCustomization({ studioId: "studio-1" }),
      [{ studioId: "studio-1", role: "member" }],
      [
        { userId: "user-1", role: "member", name: "Ann", email: null },
        { userId: "user-2", role: "admin", name: "Bo", email: null },
      ]
    );
    cleanup = view.cleanup;

    expect(view.container.textContent).toContain("Bo");
    expect(view.container.querySelector("form")).toBeNull();
    expect(view.buttonNamed("Remove Bo")).toBeUndefined();
  });
});
