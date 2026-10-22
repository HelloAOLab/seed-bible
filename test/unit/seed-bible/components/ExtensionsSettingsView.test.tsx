import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import type { MockInstance } from "vitest";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import {
  ExtensionInitalizer,
  type ExtensionListEntry,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

// Per-extension strings the tests can supply, keyed by `${ns}:${key}`.
// Extension titles/descriptions live in the extension's own namespace.
const extensionStrings = vi.hoisted(() => new Map<string, string>());

// Match the i18n mock used by the other component tests: return the
// defaultValue (or key) so assertions can rely on the English strings.
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string; ns?: string }) =>
        (options?.ns && extensionStrings.get(`${options.ns}:${key}`)) ??
        options?.defaultValue ??
        key,
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
  // Kept as a signal the tests can drive: the Settings tab reads the flags
  // for the extension whose page is open.
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
      registerSettingsPanel: vi.fn().mockReturnValue(vi.fn()),
      settingsPanels: signal<Record<string, () => ComponentChildren>>({}),
      // None of these extensions are sandboxed.
      sandboxPermissions: signal({}),
      setOptionalPermission: vi.fn(),
      describeUploader: vi.fn().mockResolvedValue(undefined),
      discoverExtensionSet: vi.fn().mockResolvedValue(null),
    },
    friends: {
      friendIds: signal<string[]>([]),
      isLoading: signal(false),
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
      closeModal: vi.fn(),
    },
    extensionSettings: {
      valuesByExtensionId: signal({}),
      saveErrors: extensionSaveErrors,
      hasSaveError: (extensionId: string) =>
        extensionSaveErrors.value[extensionId] === true,
      getValue: vi.fn(),
      setValue: vi.fn().mockResolvedValue(undefined),
      clearValue: vi.fn().mockResolvedValue(undefined),
      getUnusedSensitiveProxies: () => [],
      isSensitiveValueSet: () => false,
      getSensitiveValueSource: () => null,
      hasStoredSensitiveValues: () => false,
      getSensitiveDestination: () => ({
        host: "api.example.com",
        visibility: "private",
      }),
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
    extensionStrings.clear();
  });

  function renderExtensions(entries: ExtensionListEntry[]) {
    const state = createMockState(entries);
    act(() => {
      render(<SettingsPage state={state} />, container);
    });
    return state;
  }

  const rowNames = () =>
    Array.from(container.querySelectorAll(".sb-extensions-item-name")).map(
      (el) => el.textContent
    );
  /** The names listed under each section's heading. */
  const sections = () =>
    Array.from(container.querySelectorAll(".sb-extensions-section")).map(
      (section) => ({
        title: section.querySelector("h2")?.textContent,
        names: Array.from(
          section.querySelectorAll(".sb-extensions-item-name")
        ).map((el) => el.textContent),
        empty:
          section.querySelector(".sb-settings-empty-state")?.textContent ??
          null,
      })
    );
  const search = (text: string) => {
    const input = container.querySelector<HTMLInputElement>(
      'input[type="search"]'
    )!;
    act(() => {
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  /** Opens an extension's page by clicking its row in the list. */
  const openExtension = (name: string) => {
    const row = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-extensions-item")
    ).find(
      (button) =>
        button.querySelector(".sb-extensions-item-name")?.textContent === name
    );
    expect(row).toBeTruthy();
    act(() => row!.click());
  };
  const pageTitle = () =>
    container.querySelector(".sb-extension-info-title")?.textContent ?? null;

  it("lists installed and available extensions in their own sections", () => {
    renderExtensions([
      makeEntry("installed-one", true),
      makeEntry("available-one", false),
      makeEntry("installed-two", true),
    ]);

    expect(sections()).toEqual([
      {
        title: "Installed",
        names: ["installed-one", "installed-two"],
        empty: null,
      },
      { title: "Available", names: ["available-one"], empty: null },
    ]);
    expect(container.querySelector('[role="tab"]')).toBeNull();
  });

  it("says when a section has nothing in it", () => {
    renderExtensions([makeEntry("installed-one", true)]);
    expect(sections()[1]).toEqual({
      title: "Available",
      names: [],
      empty: "There are no more extensions available to install.",
    });

    render(null, container);
    renderExtensions([makeEntry("available-one", false)]);
    expect(sections()[0]).toEqual({
      title: "Installed",
      names: [],
      empty: "You haven't installed any extensions yet.",
    });
  });

  describe("searching", () => {
    beforeEach(() => {
      extensionStrings.set("verse-art:title", "Verse Art");
      extensionStrings.set(
        "verse-art:description",
        "Turns the passage into shareable art."
      );
      extensionStrings.set("word-study:title", "Word Study");
      extensionStrings.set(
        "word-study:description",
        "Greek and Hebrew behind a verse."
      );
      extensionStrings.set("maps:title", "Scripture Map");
    });

    const entries = () => [
      makeEntry("verse-art", true),
      makeEntry("word-study", false),
      makeEntry("maps", false),
    ];

    it("matches names and descriptions, in any case, and leaves out sections with no matches", () => {
      renderExtensions(entries());

      search("HEBREW");
      expect(sections()).toEqual([
        { title: "Available", names: ["Word Study"], empty: null },
      ]);

      search("art");
      expect(sections()).toEqual([
        { title: "Installed", names: ["Verse Art"], empty: null },
      ]);
    });

    it("says when nothing matches, and shows everything again once cleared", () => {
      renderExtensions(entries());

      search("zzz");
      expect(sections()).toEqual([]);
      expect(container.textContent).toContain("extensions-search-no-matches");

      search("");
      expect(rowNames()).toEqual(["Verse Art", "Word Study", "Scripture Map"]);
    });
  });

  describe("extensions the active customization hides", () => {
    function renderWithHidden(
      entries: ExtensionListEntry[],
      hiddenIds: string[]
    ) {
      const state = createMockState(entries);
      // "hidden" only applies while a customization is active.
      (state.customizations.activeCustomization as Signal<unknown>).value = {
        id: "custom-1",
        name: "Youth group",
      };
      vi.mocked(
        state.customizations.getActiveExtensionAvailability
      ).mockImplementation((id: string) =>
        hiddenIds.includes(id) ? "hidden" : "available"
      );
      act(() => {
        render(<SettingsPage state={state} />, container);
      });
      return state;
    }

    beforeEach(() => {
      const registeredSpy = vi
        .spyOn(ExtensionInitalizer.getInstance(), "isExtensionRegistered")
        .mockReturnValue(true);
      onTestFinished(() => registeredSpy.mockRestore());
    });

    it("still lists a hidden extension under Installed when the viewer has it installed", () => {
      renderWithHidden(
        [makeEntry("hidden-installed", true), makeEntry("shown-one", true)],
        ["hidden-installed"]
      );

      expect(sections()[0]!.names).toEqual(["hidden-installed", "shown-one"]);
    });

    it("uninstalls a hidden extension that's installed, for this session only", () => {
      const state = renderWithHidden(
        [makeEntry("hidden-installed", true)],
        ["hidden-installed"]
      );

      openExtension("hidden-installed");
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-extension-info-uninstall")!
          .click();
      });

      expect(state.extensions.unloadExtension).toHaveBeenCalledWith(
        "hidden-installed",
        { persist: false }
      );
    });

    it("never offers a hidden extension under Available", () => {
      renderWithHidden(
        [makeEntry("hidden-available", false), makeEntry("shown-one", false)],
        ["hidden-available"]
      );

      expect(sections()[1]!.names).toEqual(["shown-one"]);
    });
  });

  describe("removing extensions while a customization is active", () => {
    function renderWithCustomization(
      entries: ExtensionListEntry[],
      autoInstalledIds: string[]
    ) {
      const state = createMockState(entries);
      (state.customizations.activeCustomization as Signal<unknown>).value = {
        id: "custom-1",
        name: "Youth group",
      };
      vi.mocked(
        state.customizations.getActiveExtensionAvailability
      ).mockImplementation((id: string) =>
        autoInstalledIds.includes(id) ? "auto-installed" : "available"
      );
      act(() => {
        render(<SettingsPage state={state} />, container);
      });
      return state;
    }

    const clickUninstall = (name: string) => {
      openExtension(name);
      const button = container.querySelector<HTMLButtonElement>(
        ".sb-extension-info-uninstall"
      );
      expect(button).toBeTruthy();
      act(() => button!.click());
    };

    beforeEach(() => {
      const registeredSpy = vi
        .spyOn(ExtensionInitalizer.getInstance(), "isExtensionRegistered")
        .mockReturnValue(true);
      onTestFinished(() => registeredSpy.mockRestore());
    });

    it("lets the viewer remove an extension the customization auto-installs", () => {
      const state = renderWithCustomization(
        [makeEntry("auto-one", true)],
        ["auto-one"]
      );

      clickUninstall("auto-one");

      expect(
        state.customizations.removeExtensionFromActiveCustomization
      ).toHaveBeenCalledWith("auto-one");
      expect(state.extensions.unloadExtension).not.toHaveBeenCalled();
    });

    it("lets the viewer remove an extension they installed themselves", () => {
      const state = renderWithCustomization([makeEntry("added-one", true)], []);

      clickUninstall("added-one");

      expect(
        state.customizations.removeExtensionFromActiveCustomization
      ).toHaveBeenCalledWith("added-one");
      expect(state.extensions.unloadExtension).not.toHaveBeenCalled();
    });
  });

  it("has no buttons to download or upload extension sets", () => {
    renderExtensions([makeEntry("one", true)]);

    const labels = Array.from(container.querySelectorAll("button")).map(
      (button) => button.textContent
    );
    expect(labels.some((label) => /download|upload/i.test(label ?? ""))).toBe(
      false
    );
  });

  describe("adding extensions from a link", () => {
    let dialog: HTMLDivElement;

    beforeEach(() => {
      dialog = document.createElement("div");
      document.body.appendChild(dialog);
    });

    afterEach(() => {
      render(null, dialog);
      dialog.remove();
    });

    /** Opens the dialog and renders it the way ModalHost does. */
    function openDialog(state: SeedBibleState) {
      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-extensions-add-link-button")!
          .click();
      });
      const registration = vi.mocked(state.modals.openModal).mock.calls[0]![0];
      const content = registration.content as (props: {
        t: (key: string) => string;
      }) => ComponentChildren;
      act(() => {
        render(<>{content({ t: (key) => key })}</>, dialog);
      });
      return registration;
    }

    async function submitLink(url: string) {
      const input = dialog.querySelector<HTMLInputElement>("input")!;
      act(() => {
        input.value = url;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        dialog
          .querySelector("form")!
          .dispatchEvent(new Event("submit", { bubbles: true }));
      });
    }

    const set = (...ids: string[]) => ({
      id: "set",
      extensions: ids.map((id) => ({
        url: `https://ext.example.com/${id}.js`,
        meta: { id, translations: { en: { title: id, description: "" } } },
      })),
    });

    it("opens a dialog for the link from a button below the list", () => {
      const state = renderExtensions([makeEntry("one", true)]);

      const registration = openDialog(state);

      expect(registration.title).toMatchObject({
        key: "extension-add-link-label",
      });
      expect(dialog.querySelector('input[type="url"]')).not.toBeNull();
    });

    it("goes straight to the page of the one extension a link adds", async () => {
      const state = renderExtensions([
        makeEntry("one", true),
        makeEntry("linked", false),
      ]);
      vi.mocked(state.extensions.discoverExtensionSet).mockResolvedValue(
        set("linked")
      );
      const registration = openDialog(state);

      await submitLink("https://ext.example.com/set.json");

      expect(state.extensions.discoverExtensionSet).toHaveBeenCalledWith(
        "https://ext.example.com/set.json"
      );
      expect(state.modals.closeModal).toHaveBeenCalledWith(registration.id);
      expect(pageTitle()).toBe("linked");
    });

    it("stays open to say how many it added when a link has several", async () => {
      const state = renderExtensions([makeEntry("one", true)]);
      vi.mocked(state.extensions.discoverExtensionSet).mockResolvedValue(
        set("a", "b")
      );
      openDialog(state);

      await submitLink("https://ext.example.com/set.json");

      expect(state.modals.closeModal).not.toHaveBeenCalled();
      expect(
        dialog.querySelector(".sb-extension-add-link-status")?.textContent
      ).toBe("extension-add-link-added");
      expect(pageTitle()).toBeNull();
    });
  });

  it("shows the outer empty state (no sections) when there are no extensions at all", () => {
    renderExtensions([]);

    expect(container.querySelector(".sb-extensions-section")).toBeNull();
    expect(container.textContent).toContain("No extensions available.");
  });

  it("lists one line of an extension's description, and shows all of it on its page", () => {
    extensionStrings.set(
      "long-one:description",
      "Interactive 3D visualization of the Bible. With a guided tour on first visit."
    );
    renderExtensions([makeEntry("long-one", true)]);

    expect(
      container.querySelector(".sb-extensions-item-description")?.textContent
    ).toContain("Interactive 3D visualization");

    openExtension("long-one");

    expect(
      container.querySelector(".sb-extension-info-description")?.textContent
    ).toBe(
      "Interactive 3D visualization of the Bible. With a guided tour on first visit."
    );
  });

  it("renders no description for an extension without one", () => {
    renderExtensions([makeEntry("plain-one", true)]);

    expect(rowNames()).toEqual(["plain-one"]);
    expect(
      container.querySelector(".sb-extensions-item-description")
    ).toBeNull();
    openExtension("plain-one");
    expect(
      container.querySelector(".sb-extension-info-description")
    ).toBeNull();
  });

  describe("an extension's page", () => {
    beforeEach(() => {
      const registeredSpy = vi
        .spyOn(ExtensionInitalizer.getInstance(), "isExtensionRegistered")
        .mockReturnValue(true);
      onTestFinished(() => registeredSpy.mockRestore());
    });

    const linkedEntry = (installed: boolean): ExtensionListEntry => ({
      ...makeEntry("linked", installed),
      extension: {
        url: "https://ext.example.com/linked/bundle.js",
        meta: {
          id: "linked",
          version: "1.2.0",
          translations: { en: { title: "Linked", description: "" } },
          permissions: ["reading:position"],
          optionalPermissions: ["notes:read"],
          network: ["api.example.com"],
          integrity: "sha384-AAAA",
        },
      },
    });

    it("opens from its row, and goes back to the list", () => {
      renderExtensions([makeEntry("one", true), makeEntry("two", true)]);

      openExtension("two");

      expect(pageTitle()).toBe("two");
      expect(container.querySelector(".sb-extensions-group")).toBeNull();

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-settings-breadcrumbs-back")!
          .click();
      });

      expect(pageTitle()).toBeNull();
      expect(rowNames()).toEqual(["one", "two"]);
    });

    it("lists each extension as one button in a shared group, with no other buttons", () => {
      renderExtensions([makeEntry("one", true), makeEntry("two", true)]);

      const group = container.querySelector(".sb-extensions-group")!;
      expect(
        Array.from(group.querySelectorAll("li")).map(
          (item) => item.querySelectorAll("button").length
        )
      ).toEqual([1, 1]);
    });

    it("installs from the page, and says what it can do before then", () => {
      const state = renderExtensions([linkedEntry(false)]);
      openExtension("linked");

      expect(container.querySelector(".sb-extension-info-tabs")).toBeNull();
      expect(
        [
          ...container.querySelectorAll(
            ".sb-extension-consent-card .sb-extension-consent-lines li"
          ),
        ].map((line) => line.textContent)
      ).toEqual([
        "extension-permission-reading-position",
        "extension-permission-network",
        "extension-permission-notes-readextension-consent-high-risk",
      ]);
      expect(
        container.querySelector(".sb-extension-info-uninstall")
      ).toBeNull();

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-extension-info-install")!
          .click();
      });

      expect(state.extensions.loadExtension).toHaveBeenCalledWith(
        linkedEntry(false).extension
      );
    });

    it("says where it's hosted and asks who uploaded it", () => {
      const state = renderExtensions([linkedEntry(false)]);
      openExtension("linked");

      expect(state.extensions.describeUploader).toHaveBeenCalledWith(
        "https://ext.example.com/linked/bundle.js"
      );
      expect(
        container.querySelector(".sb-extension-info-details")?.textContent
      ).toContain("ext.example.com");
    });

    it("shows a running extension's permissions on their own tab", () => {
      const state = renderExtensions([linkedEntry(true)]);
      act(() => {
        (
          state.extensions.sandboxPermissions as Signal<Record<string, unknown>>
        ).value = {
          linked: {
            required: ["reading:position"],
            optional: ["notes:read"],
            granted: ["reading:position"],
            network: ["api.example.com"],
            version: "1.2.0",
            sourceHost: "ext.example.com",
          },
        };
      });
      openExtension("linked");

      const tabs = [
        ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ];
      expect(tabs.map((tab) => tab.id)).toEqual([
        "sb-extension-info-tab-about",
        "sb-extension-info-tab-permissions",
      ]);

      act(() => tabs[1]!.click());

      expect(
        [...container.querySelectorAll('[role="switch"]')].map((s) =>
          s.getAttribute("aria-label")
        )
      ).toEqual(["extension-permission-notes-read"]);
    });

    it("calls an extension without a link built in, and offers no Permissions tab", () => {
      renderExtensions([
        {
          ...makeEntry("built-in", true),
          extension: {
            import: () => Promise.resolve({ default: () => {} }),
            meta: {
              id: "built-in",
              translations: { en: { title: "Built in", description: "" } },
            },
          } as unknown as ExtensionListEntry["extension"],
        },
      ]);

      expect(
        container.querySelector(".sb-extensions-item-tag")?.textContent
      ).toBe("extension-info-built-in-tag");

      openExtension("built-in");

      expect(container.textContent).toContain("extension-info-built-in");
      expect(container.querySelector('[role="tab"]')).toBeNull();
    });
  });

  describe("the Settings tab", () => {
    let registeredSpy: MockInstance;

    beforeEach(() => {
      registeredSpy = vi
        .spyOn(ExtensionInitalizer.getInstance(), "isExtensionRegistered")
        .mockReturnValue(true);
    });

    afterEach(() => {
      registeredSpy.mockRestore();
    });

    const settingsTab = () =>
      container.querySelector<HTMLButtonElement>(
        "#sb-extension-info-tab-settings"
      );

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

    const openSettingsTab = (name = "configurable") => {
      openExtension(name);
      expect(settingsTab()).not.toBeNull();
      act(() => settingsTab()!.click());
    };

    it("tells the viewer when their settings couldn't be saved, and only for the extension that failed", () => {
      const state = renderExtensions([configurableEntry()]);
      openSettingsTab();
      const saveErrors = (
        state.extensionSettings as unknown as {
          saveErrors: Signal<Record<string, boolean>>;
        }
      ).saveErrors;
      expect(container.querySelector('[role="alert"]')).toBeNull();

      // A different extension's failed save says nothing about this one.
      act(() => {
        saveErrors.value = { "other-extension": true };
      });
      expect(container.querySelector('[role="alert"]')).toBeNull();

      act(() => {
        saveErrors.value = { configurable: true };
      });

      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "Couldn't save your settings."
      );
    });

    it("asks a signed-out viewer to log in, then shows the settings once they have", () => {
      const state = renderExtensions([configurableEntry()]);
      const userId = state.login.userId as Signal<string | null>;
      act(() => {
        userId.value = null;
      });
      openSettingsTab();
      const greetingField = () =>
        container.querySelector("#sb-extension-setting-configurable-greeting");

      expect(container.textContent).toContain(
        "Please log in to configure this extension."
      );
      expect(greetingField()).toBeNull();

      const logInButton = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Log in"
      );
      act(() => logInButton?.click());
      expect(state.login.login).toHaveBeenCalledTimes(1);

      act(() => {
        userId.value = "user-1";
      });

      expect(greetingField()).not.toBeNull();
      expect(container.textContent).not.toContain(
        "Please log in to configure this extension."
      );
    });

    const panelOnlyEntry = (): ExtensionListEntry => ({
      ...makeEntry("panel-only", true),
      extension: {
        url: "https://example.com/panel-only.js",
        meta: {
          id: "panel-only",
          translations: { en: { title: "Panel Only", description: "" } },
        },
      },
    });

    const registerPanel = (
      state: SeedBibleState,
      extensionId: string,
      render: () => ComponentChildren
    ) => {
      act(() => {
        (
          state.extensions.settingsPanels as Signal<
            Record<string, () => ComponentChildren>
          >
        ).value = {
          ...state.extensions.settingsPanels.value,
          [extensionId]: render,
        };
      });
    };

    it("offers a Settings tab for an extension with a registered settings panel, even with no declared settings", () => {
      const state = renderExtensions([panelOnlyEntry()]);
      openExtension("panel-only");
      expect(settingsTab()).toBeNull();

      registerPanel(state, "panel-only", () => <div>Custom panel</div>);

      expect(settingsTab()).not.toBeNull();
    });

    it("renders the extension's own registered panel instead of the generic settings form", () => {
      const state = renderExtensions([panelOnlyEntry()]);
      registerPanel(state, "panel-only", () => (
        <div className="sb-custom-panel">Custom panel content</div>
      ));

      openSettingsTab("panel-only");

      expect(container.querySelector(".sb-custom-panel")?.textContent).toBe(
        "Custom panel content"
      );
      expect(
        container.querySelector("#sb-extension-setting-panel-only-greeting")
      ).toBeNull();
    });

    // A custom panel replaces only the generic form. Sensitive values can't go
    // through an extension's own UI, so without their own section the viewer
    // would have no way to set them.
    it("keeps the sensitive settings section alongside a registered panel", () => {
      const entry = panelOnlyEntry();
      entry.extension!.meta = {
        ...entry.extension!.meta,
        settings: {
          greeting: { type: "string", default: "Hello" },
          apiKey: { type: "string", sensitive: "exampleApi" },
        },
        sensitive: {
          exampleApi: {
            host: "api.example.com",
            requestMapping: { "headers.authorization.bearer": "apiKey" },
          },
        },
      };
      const state = renderExtensions([entry]);
      registerPanel(state, "panel-only", () => (
        <div className="sb-custom-panel">Custom panel content</div>
      ));

      openSettingsTab("panel-only");

      expect(container.querySelector(".sb-custom-panel")).not.toBeNull();
      expect(
        container.querySelector<HTMLInputElement>(
          "#sb-extension-setting-panel-only-apiKey"
        )?.type
      ).toBe("password");
      expect(
        container.querySelector("#sb-extension-setting-panel-only-greeting")
      ).toBeNull();
    });
  });
});
