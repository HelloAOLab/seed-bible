import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ExtensionsPage } from "@packages/seed-bible/seed-bible/components/ExtensionsPage/ExtensionsPage";
import {
  ExtensionInitalizer,
  type ExtensionListEntry,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

// Return the defaultValue (or key), as the other component tests do, with
// the extension's own title and description from its namespace.
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (
        key: string,
        options?: { defaultValue?: string; ns?: string; host?: string }
      ) => {
        if (options?.ns) {
          return key === "title" ? options.ns : "";
        }
        if (key === "extension-consent-from") {
          return `From ${options?.host}`;
        }
        return options?.defaultValue ?? key;
      },
      language: "en",
    }),
  };
});

function builtIn(id: string, installed: boolean): ExtensionListEntry {
  return {
    id,
    extension: {
      import: () => Promise.resolve({ default: () => {} }),
      meta: { id, translations: { en: { title: id, description: "" } } },
    } as unknown as ExtensionListEntry["extension"],
    extensionSet: null,
    registration: null,
    installed,
    pendingInstallation: false,
  };
}

function linked(id: string, installed: boolean): ExtensionListEntry {
  return {
    ...builtIn(id, installed),
    extension: {
      url: `https://ext.example.com/${id}/bundle.js`,
      meta: {
        id,
        version: "1.2.0",
        translations: { en: { title: id, description: "" } },
        permissions: ["reading:position"],
        optionalPermissions: ["notes:read"],
        network: [],
        integrity: "sha384-AAAA",
      },
    },
  };
}

function createMockState(entries: ExtensionListEntry[]) {
  const pageEntryId = signal<string | null>(null);
  const state = {
    extensionsPageEntryId: pageEntryId,
    openExtensions: vi.fn((extensionId: string | null = null) => {
      pageEntryId.value = extensionId;
    }),
    extensions: {
      extensions: signal<ExtensionListEntry[]>(entries),
      loadExtension: vi.fn().mockResolvedValue(undefined),
      unloadExtension: vi.fn(),
      settingsPanels: signal<Record<string, () => ComponentChildren>>({}),
      sandboxPermissions: signal<Record<string, unknown>>({}),
      setOptionalPermission: vi.fn(),
      describeUploader: vi.fn().mockResolvedValue(undefined),
      discoverExtensionSet: vi.fn().mockResolvedValue(null),
    },
    friends: {
      friendIds: signal<string[]>([]),
      isLoading: signal(false),
    },
    customizations: {
      activeCustomization: signal(null),
      getActiveExtensionAvailability: vi.fn().mockReturnValue("available"),
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
      hasSaveError: () => false,
      getValue: vi.fn(),
      setValue: vi.fn().mockResolvedValue(undefined),
      clearValue: vi.fn().mockResolvedValue(undefined),
      getUnusedSensitiveProxies: () => [],
    },
  };
  return state as typeof state & SeedBibleState;
}

describe("ExtensionsPage", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const registeredSpy = vi
      .spyOn(ExtensionInitalizer.getInstance(), "isExtensionRegistered")
      .mockReturnValue(true);
    onTestFinished(() => registeredSpy.mockRestore());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPage(entries: ExtensionListEntry[]) {
    const state = createMockState(entries);
    act(() => {
      render(<ExtensionsPage state={state} />, container);
    });
    return state;
  }

  /** Each section's heading, and the name and byline of each card in it. */
  const sections = () =>
    [...container.querySelectorAll(".sb-extensions-page-section")].map(
      (section) => ({
        title: section.querySelector("h2")?.textContent,
        cards: [...section.querySelectorAll(".sb-extensions-card")].map(
          (card) =>
            `${card.querySelector(".sb-extensions-card-name")?.textContent} · ${card.querySelector(".sb-extensions-card-source")?.textContent}`
        ),
      })
    );
  const clickFilter = (label: string) => {
    const button = [
      ...container.querySelectorAll<HTMLButtonElement>(
        ".sb-extensions-page-filter"
      ),
    ].find((item) => item.textContent?.startsWith(label));
    expect(button).toBeTruthy();
    act(() => button!.click());
  };
  const filterCounts = () =>
    [...container.querySelectorAll(".sb-extensions-page-filter")].map(
      (item) => item.textContent
    );
  const button = (selector: string) =>
    container.querySelector<HTMLButtonElement>(selector);

  it("shows the installed and available extensions as cards, saying where each is from", () => {
    renderPage([
      builtIn("audio", true),
      linked("verse-art", false),
      builtIn("maps", false),
    ]);

    expect(sections()).toEqual([
      { title: "Installed", cards: ["audio · extension-info-built-in"] },
      {
        title: "Available",
        cards: [
          "verse-art · From ext.example.com",
          "maps · extension-info-built-in",
        ],
      },
    ]);
  });

  it("filters by whether it's installed and by who made it, with counts", () => {
    renderPage([
      builtIn("audio", true),
      linked("verse-art", false),
      builtIn("maps", false),
    ]);

    expect(filterCounts()).toEqual([
      "extensions-page-filter-all3",
      "Installed1",
      "Available2",
      "extensions-page-filter-built-in2",
      "extensions-page-filter-linked1",
    ]);

    clickFilter("extensions-page-filter-linked");
    expect(sections()).toEqual([
      { title: "Available", cards: ["verse-art · From ext.example.com"] },
    ]);

    clickFilter("Installed");
    expect(sections()).toEqual([
      { title: "Installed", cards: ["audio · extension-info-built-in"] },
    ]);
  });

  it("says when nothing matches a search", () => {
    renderPage([builtIn("audio", true)]);
    const input = container.querySelector<HTMLInputElement>(
      'input[type="search"]'
    )!;

    act(() => {
      input.value = "nothing like it";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(sections()).toEqual([]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "extensions-search-no-matches"
    );
  });

  it("opens an extension's page from its card", () => {
    const state = renderPage([
      builtIn("audio", true),
      linked("verse-art", false),
    ]);

    act(() =>
      [...container.querySelectorAll<HTMLButtonElement>(".sb-extensions-card")]
        .find((card) => card.textContent?.includes("verse-art"))!
        .click()
    );

    expect(state.openExtensions).toHaveBeenCalledWith("verse-art");
    expect(
      container.querySelector(".sb-extension-info-title")?.textContent
    ).toBe("verse-art");
    expect(container.querySelector(".sb-extensions-card")).toBeNull();
  });

  it("installs from a page laid out with Install beside the extension", () => {
    const state = renderPage([linked("verse-art", false)]);
    act(() => state.openExtensions("verse-art"));

    const install = button(
      ".sb-extension-info-hero-actions .sb-extension-info-install"
    );
    expect(install).not.toBeNull();
    // What it can do is listed before it's installed, and nothing to manage.
    expect(
      container.querySelector(".sb-extension-consent-card")
    ).not.toBeNull();
    expect(container.querySelector('[role="tab"]')).toBeNull();

    act(() => install!.click());

    expect(state.extensions.loadExtension).toHaveBeenCalledWith(
      linked("verse-art", false).extension
    );
  });

  it("puts an installed extension's tabs down the side, with Uninstall at the top", () => {
    const state = renderPage([linked("verse-art", true)]);
    act(() => {
      state.extensions.sandboxPermissions.value = {
        "verse-art": {
          required: ["reading:position"],
          optional: ["notes:read"],
          granted: ["reading:position"],
          network: [],
          version: "1.2.0",
          sourceHost: "ext.example.com",
        },
      };
      state.openExtensions("verse-art");
    });

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist?.getAttribute("aria-orientation")).toBe("vertical");
    expect(
      [...tablist!.querySelectorAll('[role="tab"]')].map((tab) => tab.id)
    ).toEqual([
      "sb-extension-info-tab-about",
      "sb-extension-info-tab-permissions",
    ]);

    const uninstall = button(
      ".sb-extension-info-hero .sb-extension-info-uninstall"
    );
    expect(uninstall?.textContent).toBe("Uninstall");
    act(() => uninstall!.click());

    expect(state.extensions.unloadExtension).toHaveBeenCalledWith("verse-art");
  });

  it("opens the page of the one extension a link adds", async () => {
    const state = renderPage([builtIn("audio", true)]);
    vi.mocked(state.extensions.discoverExtensionSet).mockResolvedValue({
      id: "set",
      extensions: [linked("verse-art", false).extension!],
    } as Awaited<
      ReturnType<SeedBibleState["extensions"]["discoverExtensionSet"]>
    >);

    act(() => button(".sb-extensions-page-add-link")!.click());
    const registration = vi.mocked(state.modals.openModal).mock.calls[0]![0];
    const dialog = document.createElement("div");
    document.body.appendChild(dialog);
    try {
      act(() => {
        render(<>{registration.content()}</>, dialog);
      });
      const input =
        dialog.querySelector<HTMLInputElement>('input[type="url"]')!;
      act(() => {
        input.value = "https://ext.example.com/set.json";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        dialog
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
          );
      });
    } finally {
      render(null, dialog);
      dialog.remove();
    }

    expect(state.modals.closeModal).toHaveBeenCalledWith(registration.id);
    expect(state.openExtensions).toHaveBeenCalledWith("verse-art");
  });
});
