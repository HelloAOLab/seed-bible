import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import type { MockInstance } from "vitest";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import {
  ExtensionInitalizer,
  type ExtensionListEntry,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { ModalContentProps } from "@packages/seed-bible/seed-bible/managers/ModalManager";
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

function makeEntry(
  id: string,
  installed: boolean,
  pendingInstallation = false
): ExtensionListEntry {
  return {
    id,
    extension: null,
    extensionSet: null,
    registration: null,
    installed,
    pendingInstallation,
  };
}

function createMockState(entries: ExtensionListEntry[]): SeedBibleState {
  // Kept as a signal the tests can drive: the Configure modal reads the flags
  // for the extension it was opened for.
  const extensionSaveErrors = signal<Record<string, boolean>>({});
  return {
    sidebar: {
      requestedSettingsView: signal<string>("extensions"),
    },
    extensions: {
      extensions: signal<ExtensionListEntry[]>(entries),
      loadExtension: vi.fn().mockResolvedValue(undefined),
      unloadExtension: vi.fn(),
      getAllExtensionsAsSet: vi.fn().mockReturnValue(null),
    },
    // No customization is active in these tests — the list renders exactly
    // as it would outside the Customization Center.
    customizations: {
      activeCustomization: signal(null),
      getActiveExtensionAvailability: vi.fn().mockReturnValue("available"),
      addExtensionToActiveCustomization: vi.fn().mockResolvedValue(undefined),
      removeExtensionFromActiveCustomization: vi
        .fn()
        .mockResolvedValue(undefined),
    },
    login: {
      userId: signal<string | null>("user-1"),
      login: vi.fn().mockResolvedValue(null),
    },
    modals: {
      openModal: vi.fn(),
    },
    extensionSettings: {
      valuesByExtensionId: signal({}),
      saveErrors: extensionSaveErrors,
      hasSaveError: (extensionId: string) =>
        extensionSaveErrors.value[extensionId] === true,
      getValue: vi.fn(),
      setValue: vi.fn().mockResolvedValue(undefined),
      clearValue: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as SeedBibleState;
}

describe("ExtensionsSettingsView", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderExtensions(entries: ExtensionListEntry[]) {
    const state = createMockState(entries);
    act(() => {
      render(<SettingsPage state={state} />, container);
    });
    return state;
  }

  const installedTab = () =>
    container.querySelector<HTMLButtonElement>("#sb-extensions-tab-installed")!;
  const availableTab = () =>
    container.querySelector<HTMLButtonElement>("#sb-extensions-tab-available")!;
  const rowNames = () =>
    Array.from(container.querySelectorAll(".sb-extension-name")).map(
      (el) => el.textContent
    );

  it("shows the Installed tab by default with only installed extensions listed", () => {
    renderExtensions([
      makeEntry("installed-one", true),
      makeEntry("available-one", false),
      makeEntry("installed-two", true),
    ]);

    expect(installedTab().getAttribute("aria-selected")).toBe("true");
    expect(availableTab().getAttribute("aria-selected")).toBe("false");
    expect(rowNames()).toEqual(["installed-one", "installed-two"]);
  });

  it("switches to the Available tab and shows only uninstalled extensions", () => {
    renderExtensions([
      makeEntry("installed-one", true),
      makeEntry("available-one", false),
      makeEntry("installed-two", true),
    ]);

    act(() => {
      availableTab().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(availableTab().getAttribute("aria-selected")).toBe("true");
    expect(installedTab().getAttribute("aria-selected")).toBe("false");
    expect(rowNames()).toEqual(["available-one"]);
  });

  it("labels each tab with the count of extensions it holds", () => {
    renderExtensions([
      makeEntry("installed-one", true),
      makeEntry("available-one", false),
      makeEntry("available-two", false),
    ]);

    expect(
      installedTab().querySelector(".sb-extensions-tab-count")?.textContent
    ).toBe("1");
    expect(
      availableTab().querySelector(".sb-extensions-tab-count")?.textContent
    ).toBe("2");
  });

  it("shows the no-available-extensions message on the Available tab when everything is installed", () => {
    renderExtensions([makeEntry("installed-one", true)]);

    act(() => {
      availableTab().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".sb-extensions-list")).toBeNull();
    expect(container.textContent).toContain(
      "There are no more extensions available to install."
    );
  });

  it("shows the no-installed-extensions message on the Installed tab when nothing is installed", () => {
    renderExtensions([makeEntry("available-one", false)]);

    expect(installedTab().getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".sb-extensions-list")).toBeNull();
    expect(container.textContent).toContain(
      "You haven't installed any extensions yet."
    );
  });

  it("shows the outer empty state (no tabs) when there are no extensions at all", () => {
    renderExtensions([]);

    expect(container.querySelector(".sb-extensions-tabs")).toBeNull();
    expect(container.textContent).toContain("No extensions available.");
  });

  describe("Configure modal", () => {
    let registeredSpy: MockInstance;
    let modalBody: HTMLDivElement;

    beforeEach(() => {
      // The Configure action only shows for an extension that has registered.
      registeredSpy = vi
        .spyOn(ExtensionInitalizer.getInstance(), "isExtensionRegistered")
        .mockReturnValue(true);
      modalBody = document.createElement("div");
      document.body.appendChild(modalBody);
    });

    afterEach(() => {
      render(null, modalBody);
      modalBody.remove();
      registeredSpy.mockRestore();
    });

    const configurableEntry = (): ExtensionListEntry => ({
      ...makeEntry("configurable", true),
      extension: {
        url: "https://example.com/configurable.js",
        meta: {
          id: "configurable",
          translations: { en: { title: "Configurable", description: "" } },
          settings: { greeting: { type: "string", default: "Hello" } },
        },
      },
    });

    // Renders the modal body the way ModalHost does, by calling `content`
    // during a component's render, so the body updates when state changes.
    const openConfigureModal = (state: SeedBibleState) => {
      act(() => {
        container
          .querySelector<HTMLButtonElement>('button[aria-label="Configure"]')
          ?.click();
      });
      const call = vi.mocked(state.modals.openModal).mock.calls[0];
      if (!call) {
        throw new Error("Clicking Configure didn't open a modal");
      }
      const content = call[0].content as (
        props: ModalContentProps
      ) => ComponentChildren;
      function ModalBody() {
        return <>{content({ t: (key) => key })}</>;
      }
      act(() => {
        render(<ModalBody />, modalBody);
      });
    };

    it("tells the viewer when their settings couldn't be saved, and only for the extension that failed", () => {
      const state = renderExtensions([configurableEntry()]);
      openConfigureModal(state);
      const saveErrors = (
        state.extensionSettings as unknown as {
          saveErrors: Signal<Record<string, boolean>>;
        }
      ).saveErrors;
      expect(modalBody.querySelector('[role="alert"]')).toBeNull();

      // A different extension's failed save says nothing about this one.
      act(() => {
        saveErrors.value = { "other-extension": true };
      });
      expect(modalBody.querySelector('[role="alert"]')).toBeNull();

      act(() => {
        saveErrors.value = { configurable: true };
      });

      expect(modalBody.querySelector('[role="alert"]')?.textContent).toBe(
        "Couldn't save your settings."
      );
    });

    it("asks a signed-out viewer to log in, then shows the settings once they have", () => {
      const state = renderExtensions([configurableEntry()]);
      const userId = state.login.userId as Signal<string | null>;
      act(() => {
        userId.value = null;
      });
      openConfigureModal(state);
      const greetingField = () =>
        modalBody.querySelector("#sb-extension-setting-configurable-greeting");

      expect(modalBody.textContent).toContain(
        "Please log in to configure this extension."
      );
      expect(greetingField()).toBeNull();

      const logInButton = Array.from(modalBody.querySelectorAll("button")).find(
        (button) => button.textContent === "Log in"
      );
      act(() => logInButton?.click());
      expect(state.login.login).toHaveBeenCalledTimes(1);

      act(() => {
        userId.value = "user-1";
      });

      expect(greetingField()).not.toBeNull();
      expect(modalBody.textContent).not.toContain(
        "Please log in to configure this extension."
      );
    });
  });
});
