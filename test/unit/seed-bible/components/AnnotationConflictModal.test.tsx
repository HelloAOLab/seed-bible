import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import {
  AnnotationConflictModalContent,
  syncAnnotationConflictModal,
} from "@packages/seed-bible/seed-bible/components/AnnotationConflictModal/AnnotationConflictModal";
import type {
  AnnotationConflict,
  AnnotationSyncManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationSyncManager";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let str = (options?.defaultValue as string | undefined) ?? key;
        for (const [optionKey, value] of Object.entries(options ?? {})) {
          if (optionKey === "defaultValue") continue;
          str = str.replaceAll(`{{${optionKey}}}`, String(value));
        }
        return str;
      },
      language: "en",
    }),
  };
});

// The preview renders HTML through DOMPurify, which jsdom can't always drive;
// a plain passthrough keeps these tests about the choices, not sanitization.
vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  sanitize: async (html: string) => html,
  setSafeHtml: async (html: string, element: HTMLElement) => {
    element.innerHTML = html;
  },
}));

function makeAnnotation(html: string): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
    data: { type: "comment", html, createdAtMs: 1_000, updatedAtMs: 2_000 },
  };
}

function makeConflict(
  overrides: Partial<AnnotationConflict> = {}
): AnnotationConflict {
  return {
    id: "user-1/ann-1",
    kind: "edited_elsewhere",
    owner: "user-1",
    local: makeAnnotation("<p>mine</p>"),
    server: makeAnnotation("<p>theirs</p>"),
    localUpdatedAtMs: 9_000,
    serverUpdatedAtMs: 5_000,
    ...overrides,
  };
}

function makeSync(conflicts: AnnotationConflict[]): {
  sync: AnnotationSyncManager;
  resolveConflict: ReturnType<typeof vi.fn>;
  /** Writable handle on the queue — `sync.conflicts` is read-only to callers. */
  queue: Signal<AnnotationConflict[]>;
} {
  const resolveConflict = vi.fn().mockResolvedValue(undefined);
  const queue = signal(conflicts);
  const sync = {
    conflicts: queue,
    resolveConflict,
  } as unknown as AnnotationSyncManager;
  return { sync, resolveConflict, queue };
}

describe("AnnotationConflictModal", () => {
  let container: HTMLDivElement;
  let toast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    toast = vi.fn();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  function renderConflict(conflict: AnnotationConflict) {
    const { sync, resolveConflict } = makeSync([conflict]);
    act(() => {
      render(
        <AnnotationConflictModalContent
          sync={sync}
          toast={toast as unknown as SeedBibleState["app"]["toast"]}
        />,
        container
      );
    });
    return { sync, resolveConflict };
  }

  function versionCards(): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(".sb-annotation-conflict-version")
    );
  }

  function versionLabels(): string[] {
    return versionCards().map(
      (el) =>
        el.querySelector(".sb-annotation-conflict-version-label")
          ?.textContent ?? ""
    );
  }

  function clickVersion(label: string) {
    const card = versionCards().find((el) =>
      el
        .querySelector(".sb-annotation-conflict-version-label")
        ?.textContent?.startsWith(label)
    );
    if (!card) {
      throw new Error(`No version card labelled "${label}"`);
    }
    act(() => {
      card.click();
    });
  }

  function confirmButton(): HTMLButtonElement {
    const button = container.querySelector<HTMLButtonElement>(
      ".sb-annotation-conflict-actions button"
    );
    if (!button) {
      throw new Error("No confirm button rendered");
    }
    return button;
  }

  function clickConfirm() {
    act(() => {
      confirmButton().click();
    });
  }

  it("shows both versions so the user can tell them apart", () => {
    renderConflict(makeConflict());

    const bodies = Array.from(
      container.querySelectorAll(".sb-annotation-conflict-body")
    ).map((el) => el.textContent);

    expect(bodies).toEqual(["mine", "theirs"]);
  });

  it("shows a version for each side, selectable rather than a fixed choice", () => {
    renderConflict(makeConflict());

    const labels = versionLabels();
    expect(labels[0]).toMatch(/^Your version/);
    expect(labels[1]).toMatch(/^The other version/);
  });

  it("disables confirm until a version is checked, and clicking doesn't resolve anything by itself", () => {
    const { resolveConflict } = renderConflict(makeConflict());

    expect(confirmButton().disabled).toBe(true);

    clickVersion("Your version");

    expect(confirmButton().disabled).toBe(false);
    expect(resolveConflict).not.toHaveBeenCalled();
  });

  it("lets both versions be checked at once when both exist, and confirms as 'keep both'", () => {
    const { resolveConflict } = renderConflict(makeConflict());

    clickVersion("Your version");
    clickVersion("The other version");
    clickConfirm();

    expect(resolveConflict).toHaveBeenCalledWith("user-1/ann-1", "keep_both");
  });

  it("checking the other version unchecks the first when 'keep both' isn't meaningful", () => {
    renderConflict(makeConflict({ kind: "deleted_elsewhere", server: null }));

    clickVersion("Your version");
    clickVersion("The other version");

    const cards = versionCards();
    expect(cards[0]?.getAttribute("aria-checked")).toBe("false");
    expect(cards[1]?.getAttribute("aria-checked")).toBe("true");
  });

  it.each([
    [["Your version"], "keep_mine"],
    [["The other version"], "keep_theirs"],
    [["Your version", "The other version"], "keep_both"],
  ])("checking %s confirms as %s", (labels, resolution) => {
    const { resolveConflict } = renderConflict(makeConflict());

    for (const label of labels) {
      clickVersion(label);
    }
    clickConfirm();

    expect(resolveConflict).toHaveBeenCalledWith("user-1/ann-1", resolution);
  });

  it("confirms a local deletion by checking your version when the local change was a deletion", () => {
    const { resolveConflict } = renderConflict(
      makeConflict({ kind: "deleted_locally_edited_elsewhere", local: null })
    );

    clickVersion("Your version");
    clickConfirm();

    expect(resolveConflict).toHaveBeenCalledWith("user-1/ann-1", "keep_mine");
  });

  it("explains what happened for each kind of clash", () => {
    renderConflict(makeConflict());
    expect(
      container.querySelector(".sb-annotation-conflict-message")?.textContent
    ).toContain("it also changed somewhere else");

    render(null, container);
    renderConflict(makeConflict({ kind: "deleted_elsewhere", server: null }));
    expect(
      container.querySelector(".sb-annotation-conflict-message")?.textContent
    ).toContain("deleted somewhere else");

    render(null, container);
    renderConflict(
      makeConflict({ kind: "deleted_locally_edited_elsewhere", local: null })
    );
    expect(
      container.querySelector(".sb-annotation-conflict-message")?.textContent
    ).toContain("You deleted this note on this device");
  });

  it("shows how many are queued, but only when there is more than one", () => {
    renderConflict(makeConflict());
    expect(
      container.querySelector(".sb-annotation-conflict-progress")
    ).toBeNull();

    render(null, container);
    const { sync } = makeSync([
      makeConflict(),
      makeConflict({ id: "user-1/ann-2" }),
    ]);
    act(() => {
      render(
        <AnnotationConflictModalContent
          sync={sync}
          toast={toast as unknown as SeedBibleState["app"]["toast"]}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-annotation-conflict-progress")?.textContent
    ).toBe("1 of 2 notes to review");
  });

  it("renders nothing once the queue is empty", () => {
    const { sync } = makeSync([]);
    act(() => {
      render(
        <AnnotationConflictModalContent
          sync={sync}
          toast={toast as unknown as SeedBibleState["app"]["toast"]}
        />,
        container
      );
    });

    expect(container.textContent).toBe("");
  });

  it("toasts when a choice can't be applied", async () => {
    const { sync, resolveConflict } = makeSync([makeConflict()]);
    resolveConflict.mockRejectedValue(new Error("nope"));
    act(() => {
      render(
        <AnnotationConflictModalContent
          sync={sync}
          toast={toast as unknown as SeedBibleState["app"]["toast"]}
        />,
        container
      );
    });

    clickVersion("Your version");
    clickConfirm();
    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Couldn't apply that choice. It'll be tried again."
      )
    );
  });

  describe("syncAnnotationConflictModal()", () => {
    it("opens one modal for the queue, not one per conflict", () => {
      const modals = createModalManager();
      const { sync } = makeSync([
        makeConflict(),
        makeConflict({ id: "user-1/ann-2" }),
        makeConflict({ id: "user-1/ann-3" }),
      ]);

      syncAnnotationConflictModal(
        modals,
        sync,
        toast as unknown as SeedBibleState["app"]["toast"]
      );

      expect(modals.modals.value).toHaveLength(1);
      expect(modals.modals.value[0]?.title).toEqual({
        key: "annotation-conflict-title",
        defaultValue: "This note changed in two places",
      });
    });

    it("does not stack a second dialog when called again", () => {
      const modals = createModalManager();
      const { sync } = makeSync([makeConflict()]);
      const openIt = () =>
        syncAnnotationConflictModal(
          modals,
          sync,
          toast as unknown as SeedBibleState["app"]["toast"]
        );

      openIt();
      openIt();
      openIt();

      expect(modals.modals.value).toHaveLength(1);
    });

    it("closes the modal once nothing is left to decide", () => {
      const modals = createModalManager();
      const { sync, queue } = makeSync([makeConflict()]);
      syncAnnotationConflictModal(
        modals,
        sync,
        toast as unknown as SeedBibleState["app"]["toast"]
      );
      expect(modals.modals.value).toHaveLength(1);

      queue.value = [];
      syncAnnotationConflictModal(
        modals,
        sync,
        toast as unknown as SeedBibleState["app"]["toast"]
      );

      expect(modals.modals.value).toEqual([]);
    });
  });
});
