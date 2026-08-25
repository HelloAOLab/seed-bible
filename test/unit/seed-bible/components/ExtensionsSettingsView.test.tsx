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
      getAllExtensionsAsSet: vi.fn().mockReturnValue(null),
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
});
