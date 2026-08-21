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

  const allGroups = () =>
    Array.from(container.querySelectorAll<HTMLElement>(".sb-extensions-group"));

  /** The Installed and Available group elements, asserting both are present. */
  const groups = (): [HTMLElement, HTMLElement] => {
    const [installedGroup, availableGroup] = allGroups();
    expect(installedGroup).toBeDefined();
    expect(availableGroup).toBeDefined();
    return [installedGroup!, availableGroup!];
  };

  const rowNamesIn = (group: HTMLElement) =>
    Array.from(group.querySelectorAll(".sb-extension-name")).map(
      (el) => el.textContent
    );

  it("puts installed extensions under Installed and the rest under Available", () => {
    renderExtensions([
      makeEntry("installed-one", true),
      makeEntry("available-one", false),
      makeEntry("installed-two", true),
    ]);

    const [installedGroup, availableGroup] = groups();

    expect(installedGroup.querySelector("h3")?.textContent).toBe("Installed");
    expect(rowNamesIn(installedGroup)).toEqual([
      "installed-one",
      "installed-two",
    ]);

    expect(availableGroup.querySelector("h3")?.textContent).toBe("Available");
    expect(rowNamesIn(availableGroup)).toEqual(["available-one"]);
  });

  it("shows the no-available-extensions message when everything is installed", () => {
    renderExtensions([makeEntry("installed-one", true)]);

    const [installedGroup, availableGroup] = groups();

    expect(rowNamesIn(installedGroup)).toEqual(["installed-one"]);
    expect(availableGroup.querySelector(".sb-extensions-list")).toBeNull();
    expect(availableGroup.textContent).toContain(
      "There are no more extensions available to install."
    );
  });

  it("shows the no-installed-extensions message when nothing is installed", () => {
    renderExtensions([makeEntry("available-one", false)]);

    const [installedGroup, availableGroup] = groups();

    expect(installedGroup.querySelector(".sb-extensions-list")).toBeNull();
    expect(installedGroup.textContent).toContain(
      "You haven't installed any extensions yet."
    );
    expect(rowNamesIn(availableGroup)).toEqual(["available-one"]);
  });

  it("shows the outer empty state (not the group headings) when there are no extensions at all", () => {
    renderExtensions([]);

    expect(allGroups()).toHaveLength(0);
    expect(container.textContent).toContain("No extensions available.");
  });
});
