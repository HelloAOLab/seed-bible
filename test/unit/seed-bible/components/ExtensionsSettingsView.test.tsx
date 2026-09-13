import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { SettingsPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import type { ExtensionListEntry } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
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
    enabled: true,
  };
}

function createMockState(entries: ExtensionListEntry[]): SeedBibleState {
  return {
    sidebar: {
      requestedSettingsView: signal<string>("extensions"),
    },
    extensions: {
      extensions: signal<ExtensionListEntry[]>(entries),
      loadExtension: vi.fn().mockResolvedValue(undefined),
      unloadExtension: vi.fn(),
      setExtensionEnabled: vi.fn().mockResolvedValue(undefined),
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

  const viewDetailsButtons = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>('[aria-label="View details"]')
    );
  const click = (el: Element) => {
    act(() => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };
  const pressEnter = (el: Element) => {
    act(() => {
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });
  };

  it("opens the details pane with the keyboard", () => {
    renderExtensions([makeEntry("installed-one", true)]);

    const [detailsTarget] = viewDetailsButtons();
    expect(detailsTarget).toBeDefined();
    expect(detailsTarget!.getAttribute("role")).toBe("button");
    expect(detailsTarget!.tabIndex).toBe(0);

    pressEnter(detailsTarget!);

    expect(container.querySelector(".sb-extension-details")).not.toBeNull();
  });

  it("offers enable/disable and uninstall in the details pane for an installed extension", () => {
    renderExtensions([makeEntry("installed-one", true)]);

    click(viewDetailsButtons()[0]!);

    expect(container.querySelector(".sb-extension-toggle")).not.toBeNull();
    expect(
      container.querySelector(".sb-settings-danger-button")
    ).not.toBeNull();
  });

  it("does not offer enable/disable or uninstall in the details pane for a never-installed extension", () => {
    const state = renderExtensions([makeEntry("available-one", false)]);

    act(() => {
      availableTab().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    click(viewDetailsButtons()[0]!);

    // The details pane opened, but nothing there can write install state for
    // an extension the user never installed — disabling one used to persist a
    // disabled flag, which made it report as installed (a phantom install).
    expect(container.querySelector(".sb-extension-details")).not.toBeNull();
    expect(container.querySelector(".sb-extension-toggle")).toBeNull();
    expect(container.querySelector(".sb-settings-danger-button")).toBeNull();
    expect(state.extensions.setExtensionEnabled).not.toHaveBeenCalled();
    expect(state.extensions.unloadExtension).not.toHaveBeenCalled();
  });
});
