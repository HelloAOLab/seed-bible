import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ExtensionsPage } from "@packages/seed-bible/seed-bible/components/ExtensionsPage/ExtensionsPage";
import {
  ExtensionInitalizer,
  type ExtensionListEntry,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createExtensionReviewsManager,
  type ExtensionReviewsManager,
} from "@packages/seed-bible/seed-bible/managers/ExtensionReviewsManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";

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
        options?: {
          defaultValue?: string;
          ns?: string;
          host?: string;
          date?: string;
        }
      ) => {
        if (options?.ns) {
          return key === "title" ? options.ns : "";
        }
        if (options?.date) {
          return `${key} ${options.date}`;
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

  function renderPage(
    entries: ExtensionListEntry[],
    extensionReviews?: ExtensionReviewsManager
  ) {
    const state = createMockState(entries);
    if (extensionReviews) {
      state.extensionReviews = extensionReviews;
    }
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

  it("clears a search with the ×, which shows only once something is typed", () => {
    renderPage([builtIn("audio", true)]);
    const input = container.querySelector<HTMLInputElement>(
      'input[type="search"]'
    )!;
    const clear = () =>
      container.querySelector<HTMLButtonElement>(".sb-search-clear-button");
    expect(clear()).toBeNull();

    act(() => {
      input.value = "nothing like it";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => clear()!.click());

    expect(input.value).toBe("");
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(sections()).not.toEqual([]);
    expect(clear()).toBeNull();
    expect(document.activeElement).toBe(input);
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

  describe("verification", () => {
    const flush = () => act(async () => {});
    const VERIFIED_AT = new Date(2026, 9, 30, 14, 5).getTime();
    let modalContainer: HTMLDivElement;

    beforeEach(() => {
      modalContainer = document.createElement("div");
      document.body.appendChild(modalContainer);
    });

    afterEach(() => {
      render(null, modalContainer);
      modalContainer.remove();
    });

    /** The reviews record as the records server answers for it. */
    function createReviews(
      stored: Record<string, unknown>,
      options: { admin?: boolean; refuseWrites?: boolean } = {}
    ) {
      const os = {
        getData: vi.fn(async (_recordName: string, address: string) =>
          address in stored
            ? { success: true, data: stored[address] }
            : { success: false, errorCode: "data_not_found" }
        ),
        recordData: vi.fn(
          async (_recordKey: string, address: string, data: unknown) => {
            if (options.refuseWrites) {
              return { success: false, errorCode: "not_authorized" };
            }
            stored[address] = data;
            return { success: true };
          }
        ),
        isRecordAdmin: vi.fn().mockResolvedValue(options.admin ?? false),
      };
      const reviews = createExtensionReviewsManager(
        os as unknown as Parameters<typeof createExtensionReviewsManager>[0],
        { userId: signal<string | null>("user-1") },
        "seed-bible-reviews"
      );
      return { os, reviews };
    }

    /** Opens verse-art's page with a real modal manager behind it. */
    async function openVerseArt(reviews: ExtensionReviewsManager) {
      const state = renderPage([linked("verse-art", false)], reviews);
      const modals = createModalManager();
      state.modals = modals as unknown as typeof state.modals;
      act(() => state.openExtensions("verse-art"));
      await flush();
      return modals;
    }

    /** Shows whichever modal is open, as the app's modal host would. */
    async function renderModal(modals: ReturnType<typeof createModalManager>) {
      const modal = modals.modals.value.at(-1);
      act(() => {
        render(
          modal ? <>{modal.content({ t: (key) => key })}</> : null,
          modalContainer
        );
      });
      await flush();
    }

    const badges = (root: ParentNode) =>
      [...root.querySelectorAll(".sb-extension-review-badge")].map(
        (badge) => badge.textContent
      );
    const notice = () =>
      container.querySelector(".sb-extension-consent-notice")?.textContent;
    const buttonNamed = (root: ParentNode, label: string) =>
      [...root.querySelectorAll<HTMLButtonElement>("button")].find((item) =>
        item.textContent?.includes(label)
      );
    const field = <T extends HTMLElement>(name: string) =>
      modalContainer.querySelector<T>(`[name="${name}"]`)!;
    const type = (
      element: HTMLInputElement | HTMLTextAreaElement,
      value: string
    ) =>
      act(() => {
        element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
      });
    /** Submits the modal's form and lets both of its writes settle. */
    const submit = async () => {
      act(() => {
        modalContainer
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
          );
      });
      for (let i = 0; i < 5; i++) {
        await flush();
      }
    };

    it("marks the cards of verified extensions", async () => {
      const { reviews } = createReviews({
        "verse-art": { verified: true, verifiedAtMs: VERIFIED_AT },
        maps: { verified: false },
      });
      renderPage(
        [
          linked("verse-art", false),
          builtIn("maps", false),
          linked("other", false),
        ],
        reviews
      );
      await flush();

      const cardBadges = Object.fromEntries(
        [...container.querySelectorAll(".sb-extensions-card")].map((card) => [
          card.querySelector(".sb-extensions-card-name")?.firstChild
            ?.textContent,
          badges(card),
        ])
      );
      expect(cardBadges).toEqual({
        "verse-art": ["verifiedextension-review-verified"],
        maps: [],
        other: [],
      });
    });

    it("shows when it was verified and the public notes on hovering over the mark", async () => {
      const { reviews } = createReviews({
        "verse-art": {
          verified: true,
          verifiedAtMs: VERIFIED_AT,
          publicNotes: "Published by the Verse Art team.",
        },
      });
      renderPage([linked("verse-art", false)], reviews);
      await flush();
      const badge = container.querySelector(".sb-extension-review-badge")!;

      act(() => {
        badge.dispatchEvent(new Event("pointerenter"));
      });
      const tooltip = () =>
        document.body.querySelector(".sb-extension-review-tooltip");
      expect(tooltip()?.textContent).toBe(
        "extension-review-verified-on Oct 30, 2026" +
          "Published by the Verse Art team."
      );

      act(() => {
        badge.dispatchEvent(new Event("pointerleave"));
      });
      expect(tooltip()).toBeNull();
    });

    it("says a verified extension has been verified, instead of warning", async () => {
      const { reviews } = createReviews({
        "verse-art": { verified: true, verifiedAtMs: VERIFIED_AT },
      });
      await openVerseArt(reviews);

      expect(notice()).toBe("verifiedextension-consent-verified");
    });

    it("warns about an extension nobody has verified", async () => {
      const { reviews } = createReviews({});
      await openVerseArt(reviews);

      expect(notice()).toBe("infoextension-consent-unreviewed");
    });

    it("hides the verification controls from anyone but an admin", async () => {
      const { reviews } = createReviews({});
      await openVerseArt(reviews);

      expect(
        container.querySelector(".sb-extension-review-controls")
      ).toBeNull();
    });

    it("lets an admin mark an extension verified, with when and their notes", async () => {
      const stored: Record<string, unknown> = {};
      const { os, reviews } = createReviews(stored, { admin: true });
      const modals = await openVerseArt(reviews);
      expect(
        container.querySelector(".sb-extension-review-controls input")
      ).toBeNull();

      act(() =>
        buttonNamed(container, "extension-review-mark-verified")!.click()
      );
      await renderModal(modals);

      type(field<HTMLInputElement>("verifiedAt"), "2026-10-30T14:05");
      type(
        field<HTMLTextAreaElement>("publicNotes"),
        "Published by the Verse Art team."
      );
      type(
        field<HTMLTextAreaElement>("internalNotes"),
        "Checked the publisher's domain."
      );
      await submit();

      expect(stored["verse-art"]).toMatchObject({
        verified: true,
        verifiedAtMs: VERIFIED_AT,
        publicNotes: "Published by the Verse Art team.",
      });
      expect(stored["internal/verse-art"]).toMatchObject({
        internalNotes: "Checked the publisher's domain.",
      });
      expect(os.recordData).toHaveBeenCalledWith(
        "seed-bible-reviews",
        "internal/verse-art",
        expect.anything(),
        { marker: "private" }
      );
      expect(modals.modals.value).toEqual([]);
      expect(badges(container)).toEqual(["verifiedextension-review-verified"]);
      expect(notice()).toBe("verifiedextension-consent-verified");
      expect(
        container.querySelector(".sb-extension-review-controls-note")
          ?.textContent
      ).toBe("extension-review-admin-verified-on Oct 30, 2026");
    });

    it("fills in an existing verification when an admin edits it", async () => {
      const { reviews } = createReviews(
        {
          "verse-art": {
            verified: true,
            verifiedAtMs: VERIFIED_AT,
            publicNotes: "Published by the Verse Art team.",
          },
          "internal/verse-art": {
            internalNotes: "Checked the publisher's domain.",
          },
        },
        { admin: true }
      );
      const modals = await openVerseArt(reviews);

      act(() => buttonNamed(container, "extension-review-edit")!.click());
      await renderModal(modals);

      expect(field<HTMLInputElement>("verifiedAt").value).toBe(
        "2026-10-30T14:05"
      );
      expect(field<HTMLTextAreaElement>("publicNotes").value).toBe(
        "Published by the Verse Art team."
      );
      expect(field<HTMLTextAreaElement>("internalNotes").value).toBe(
        "Checked the publisher's domain."
      );
    });

    it("won't save over internal notes it couldn't read", async () => {
      const { os, reviews } = createReviews({}, { admin: true });
      os.getData.mockImplementation(
        async (_recordName: string, address: string) =>
          address.startsWith("internal/")
            ? { success: false, errorCode: "server_error" }
            : { success: false, errorCode: "data_not_found" }
      );
      const modals = await openVerseArt(reviews);

      act(() =>
        buttonNamed(container, "extension-review-mark-verified")!.click()
      );
      await renderModal(modals);

      expect(modalContainer.querySelector('[role="alert"]')?.textContent).toBe(
        "extension-review-modal-internal-notes-failed"
      );
      expect(
        buttonNamed(modalContainer, "extension-review-mark-verified")!.disabled
      ).toBe(true);
    });

    it("keeps the modal open and says so when the record refuses", async () => {
      const { reviews } = createReviews(
        {},
        { admin: true, refuseWrites: true }
      );
      const modals = await openVerseArt(reviews);

      act(() =>
        buttonNamed(container, "extension-review-mark-verified")!.click()
      );
      await renderModal(modals);
      await submit();
      await renderModal(modals);

      expect(modals.modals.value).toHaveLength(1);
      expect(modalContainer.querySelector('[role="alert"]')?.textContent).toBe(
        "extension-review-admin-save-failed"
      );
      expect(badges(container)).toEqual([]);
    });

    it("lets an admin take the mark away", async () => {
      const stored: Record<string, unknown> = {
        "verse-art": { verified: true, verifiedAtMs: VERIFIED_AT },
      };
      const { reviews } = createReviews(stored, { admin: true });
      await openVerseArt(reviews);

      await act(async () => {
        buttonNamed(container, "extension-review-unverify")!.click();
      });
      await flush();

      expect(stored["verse-art"]).toMatchObject({ verified: false });
      expect(badges(container)).toEqual([]);
      expect(notice()).toBe("infoextension-consent-unreviewed");
    });
  });
});
