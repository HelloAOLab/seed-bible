import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistEditorPanel } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorPanel";
import { DiscoverPane } from "@packages/seed-bible/seed-bible/components/Discover/DiscoverPane";
import { PlaylistEditorWorkspace } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorWorkspace";
import { PlaylistStepNoteSheet } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistStepNoteSheet";
import { PlaylistHtmlContent } from "@packages/seed-bible/seed-bible/components/PlaylistHtmlContent/PlaylistHtmlContent";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import {
  PlaylistSchema,
  type Playlist,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

function makePlaylist(items: Playlist["items"]): Playlist {
  return PlaylistSchema.parse({
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: null,
    description: null,
    items,
    createdAtMs: 1,
    updatedAtMs: 1,
  });
}

const STEPS: Playlist["items"] = [
  { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 2 } },
  { type: "link", title: "Genesis 1 overview", url: "https://youtu.be/abc" },
  {
    type: "html",
    html: "<p>What does light reveal?</p>",
    question: {},
    minutes: 4,
  },
];

const click = (element: Element | null | undefined) => {
  if (!element) {
    throw new Error("Nothing to click");
  }
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const type = (element: Element | null, value: string) => {
  const input = element as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input) {
    throw new Error("Nothing to type into");
  }
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const byText = (root: ParentNode, selector: string, text: string) =>
  Array.from(root.querySelectorAll(selector)).find((el) =>
    el.textContent?.includes(text)
  );

describe("the playlist editor", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    jsdom.reconfigure({
      url: "https://example.com/en/bible/BSB/GEN/1?useFreeBibleAPI=true",
    });
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const openPanel = (items: Playlist["items"] = STEPS) => {
    act(() => {
      state.playlists.editPlaylist(makePlaylist(items));
    });
    act(() => {
      render(
        <TestHost state={state}>
          <PlaylistEditorPanel
            playlists={state.playlists}
            tabs={state.tabs}
            modals={state.modals}
          />
          <ModalHost manager={state.modals} />
        </TestHost>,
        container
      );
    });
  };

  const openWorkspace = (
    items: Playlist["items"] = STEPS,
    step = 0,
    compact = false
  ) => {
    act(() => {
      state.playlists.editPlaylist(makePlaylist(items));
      state.playlists.selectEditorStep(step);
    });
    act(() => {
      render(
        <TestHost state={state}>
          <PlaylistEditorWorkspace state={state} compact={compact}>
            <div className="sb-pane-reader">reader</div>
          </PlaylistEditorWorkspace>
          <ModalHost manager={state.modals} />
        </TestHost>,
        container
      );
    });
  };

  // The desktop editor as the app lays it out: the reader workspace beside
  // the Discover pane's side panel, whose footer holds Review & publish.
  const openDesktopEditor = (items: Playlist["items"] = STEPS, step = 0) => {
    act(() => {
      state.playlists.editPlaylist(makePlaylist(items));
      state.playlists.selectEditorStep(step);
    });
    act(() => {
      render(
        <TestHost state={state}>
          <PlaylistEditorWorkspace state={state} compact={false}>
            <div className="sb-pane-reader">reader</div>
          </PlaylistEditorWorkspace>
          <DiscoverPane
            tabs={state.tabs}
            playlists={state.playlists}
            annotations={state.annotations}
            modals={state.modals}
            state={state}
            toast={state.app.toast}
          />
          <ModalHost manager={state.modals} />
        </TestHost>,
        container
      );
    });
  };

  const items = () => state.playlists.editingPlaylist.value!.items;

  describe("step list", () => {
    it("lists each step with its kind and time, and the playlist's total", () => {
      openPanel();

      const rows = Array.from(container.querySelectorAll(".sb-pe-step")).map(
        (row) => [
          row.querySelector(".sb-pe-step-label")!.textContent,
          row.querySelector(".sb-pe-step-meta")!.textContent,
        ]
      );
      expect(rows).toEqual([
        ["Genesis 1:2", "Scripture · 1 min"],
        ["Genesis 1 overview", "Video · 1 min"],
        ["What does light reveal?", "Question · 4 min"],
      ]);
      expect(container.querySelector(".sb-pe-step-count")!.textContent).toBe(
        "3 steps · ~6 min"
      );
    });

    it("opens a step when its row is clicked", () => {
      openPanel();

      click(byText(container, ".sb-pe-step-open", "Genesis 1 overview"));

      expect(state.playlists.editorStepIndex.value).toBe(1);
      expect(
        container.querySelector('[aria-current="step"]')!.textContent
      ).toContain("Genesis 1 overview");
    });

    it("duplicates and deletes the open step from its row", () => {
      openPanel();
      act(() => state.playlists.selectEditorStep(0));

      click(container.querySelector('[aria-label="Duplicate step"]'));
      expect(items()).toHaveLength(4);
      expect(items()[1]).toEqual(items()[0]);

      click(container.querySelector('[aria-label="Delete step"]'));
      expect(items()).toHaveLength(3);
      expect(items()[1]!.type).toBe("link");
    });

    it("shows a step that can't be saved yet as needing attention", () => {
      openPanel();
      // A new video step has no link until one is typed in.
      act(() => state.playlists.addEditorStep("video", 2));

      const invalid = Array.from(container.querySelectorAll(".sb-pe-step")).map(
        (row) => row.classList.contains("sb-pe-step--invalid")
      );
      expect(invalid).toEqual([false, false, false, true]);
    });

    it("says so when there are no steps", () => {
      openPanel([]);

      expect(container.textContent).toContain(
        "No steps yet. Add one to get started."
      );
    });
  });

  describe("playlist name", () => {
    it("renames the playlist, keeping a blank name as untitled", () => {
      openPanel();
      expect(container.querySelector(".sb-pe-panel-title")!.textContent).toBe(
        "Untitled playlist"
      );

      click(container.querySelector('[aria-label="Rename playlist"]'));
      type(container.querySelector(".sb-pe-panel-title-input"), "Morning");
      expect(state.playlists.editingPlaylist.value!.title).toBe("Morning");

      type(container.querySelector(".sb-pe-panel-title-input"), "   ");
      expect(state.playlists.editingPlaylist.value!.title).toBeNull();
    });

    it("says whether the draft has unsaved changes", () => {
      openPanel();
      act(() => state.playlists.selectEditorStep(0));
      expect(container.querySelector(".sb-pe-panel-status")!.textContent).toBe(
        "Draft"
      );

      click(container.querySelector('[aria-label="Duplicate step"]'));

      expect(container.querySelector(".sb-pe-panel-status")!.textContent).toBe(
        "Draft - Unsaved changes"
      );
    });
  });

  describe("pages (phone)", () => {
    const header = () => container.querySelector(".sb-pe-mobile-header")!;
    const back = () => header().querySelector(".sb-pe-back")!;

    it("opens on the list of steps, with every step there to drag", () => {
      act(() => state.playlists.editPlaylist(makePlaylist(STEPS)));
      act(() => {
        render(
          <TestHost state={state}>
            <PlaylistEditorWorkspace state={state} compact>
              <div className="sb-pane-reader">reader</div>
            </PlaylistEditorWorkspace>
          </TestHost>,
          container
        );
      });

      expect(state.playlists.editorStepIndex.value).toBe(-1);
      const rows = container.querySelectorAll(".sb-pe-list-page .sb-pe-step");
      expect(rows).toHaveLength(3);
      expect(
        container.querySelectorAll(".sb-pe-list-page .sb-pe-step-handle")
      ).toHaveLength(3);
    });

    it("goes from the empty list to a new step, back to the list, and out", () => {
      openWorkspace([], -1, true);
      expect(container.textContent).toContain("No steps yet");

      click(byText(container, ".sb-pe-add-step", "Add"));
      click(byText(container, ".sb-pe-add-option", "Note"));

      // The step is a page of its own: the list is gone, its place shown.
      expect(container.querySelector(".sb-pe-list-page")).toBeNull();
      expect(header().textContent).toContain("Step 1 of 1 · Note");
      expect(back().getAttribute("aria-label")).toBe("Back to items");

      click(back());

      expect(state.playlists.editorStepIndex.value).toBe(-1);
      expect(
        container.querySelectorAll(".sb-pe-list-page .sb-pe-step")
      ).toHaveLength(1);
      expect(back().getAttribute("aria-label")).toBe("Close playlist editor");

      click(back());

      // A step was added, so leaving asks first.
      expect(document.body.textContent).toContain(
        "You have unsaved changes. What would you like to do?"
      );
    });

    it("opens a step from the list", () => {
      openWorkspace(STEPS, -1, true);

      click(
        byText(
          container.querySelector(".sb-pe-list-page")!,
          ".sb-pe-step-open",
          "Genesis 1 overview"
        )
      );

      expect(state.playlists.editorStepIndex.value).toBe(1);
      expect(header().textContent).toContain("Step 2 of 3 · Video");
    });

    it("puts Add and a menu in a step's title bar, with no Duplicate, Review or bottom bar", () => {
      openWorkspace(STEPS, 0, true);

      expect(
        [
          ...header().querySelectorAll(".sb-pe-mobile-header-actions button"),
        ].map((b) => b.getAttribute("aria-label"))
      ).toEqual(["Add a step", "More"]);
      expect(container.querySelector(".sb-pe-publish")).toBeNull();
      expect(container.querySelector(".sb-pe-mobile-bottom")).toBeNull();
    });

    it("keeps Add and Review & publish at the bottom of the list", () => {
      openWorkspace(STEPS, -1, true);

      const bottom = container.querySelector(".sb-pe-mobile-bottom")!;
      expect(bottom.querySelector(".sb-pe-add-step")).not.toBeNull();
      expect(bottom.querySelector(".sb-pe-publish")).not.toBeNull();
    });

    it("adds a step after the open one from the title bar's Add", () => {
      openWorkspace(STEPS, 0, true);

      click(header().querySelector('[aria-label="Add a step"]'));
      expect(header().textContent).toContain("Inserted after step 1");
      click(byText(header(), ".sb-pe-add-option", "Note"));

      expect(items()).toHaveLength(4);
      expect(items()[1]).toEqual({ type: "html", html: "" });
      expect(state.playlists.editorStepIndex.value).toBe(1);
      expect(container.querySelector(".sb-pe-add-menu")).toBeNull();
    });

    it("names the verses picked, offers only Apply, and hides once they're deselected", async () => {
      openWorkspace(STEPS, 0, true);
      const readingState =
        state.app.currentReadingState.value!.tab.readingState;
      const verse = (number: number) => ({
        bookId: "GEN",
        chapterNumber: 1,
        verse: { type: "verse" as const, number, content: [] },
        translationId: "BSB",
      });
      const bar = () =>
        container.querySelector(".sb-pe-mobile-bottom .sb-pe-pickbar");

      act(() => {
        readingState.selectedVerses.value = [verse(5), verse(3)];
      });
      expect(bar()?.textContent).toContain("Highlight verses 3-5");
      expect(
        [...bar()!.querySelectorAll("button")].map((b) => b.textContent)
      ).toEqual(["Apply"]);
      expect(container.querySelector(".sb-pe-publish")).toBeNull();

      act(() => {
        readingState.selectedVerses.value = [verse(7)];
      });
      expect(bar()?.textContent).toContain("Highlight verse 7");

      // Deselecting every verse ends the pick: no banner, step unchanged.
      act(() => {
        readingState.selectedVerses.value = [];
      });
      expect(bar()).toBeNull();
      expect(state.playlists.editorVersePickIndex.value).toBeNull();
      expect(items()[0]).toEqual(STEPS[0]);
    });

    it("offers the chapter the reader moved to, and Apply gives it to the step", async () => {
      openWorkspace(STEPS, 0, true);
      const readingState =
        state.app.currentReadingState.value!.tab.readingState;
      // Let the editor's own trip to the step's chapter finish first.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(container.querySelector(".sb-pe-chapterbar")).toBeNull();

      act(() => {
        readingState.bookId.value = "EXO";
        readingState.chapterNumber.value = 2;
      });

      const bar = container.querySelector(".sb-pe-chapterbar");
      expect(bar?.textContent).toContain("for step 1?");
      expect(
        [...bar!.querySelectorAll("button")].map((b) => b.textContent)
      ).toEqual(["Apply"]);
      click(bar!.querySelector(".sb-pe-pickbar-apply"));

      expect(items()[0]).toEqual({
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 2 },
      });
    });

    it("opens the step's settings in a sheet from its menu", () => {
      openWorkspace(STEPS, 0, true);

      click(header().querySelector('[aria-label="More"]'));
      expect(
        [...document.querySelectorAll(".sb-context-menu-item")].map((item) =>
          item.textContent?.trim()
        )
      ).toEqual(["Item settings", "Delete"]);
      click(byText(document.body, ".sb-context-menu-item", "Item settings"));

      const sheet = container.querySelector(".sb-pe-settings-sheet")!;
      expect(sheet.textContent).toContain("Item settings");
      click(byText(sheet, '[role="switch"]', "Pause for group"));
      expect(items()[0]).toMatchObject({ pauseForGroup: true });

      click(sheet.querySelector('[aria-label="Close"]'));
      expect(container.querySelector(".sb-pe-settings-sheet")).toBeNull();
    });

    it("has no inline note or step settings on a phone", () => {
      openWorkspace(STEPS, 0, true);
      expect(container.querySelector(".sb-pe-add-note")).toBeNull();
      expect(container.querySelector(".sb-pe-step-settings")).toBeNull();

      // Nor on a card step.
      act(() => state.playlists.selectEditorStep(2));
      expect(container.querySelector(".sb-pe-card")).not.toBeNull();
      expect(container.querySelector(".sb-pe-step-settings")).toBeNull();
    });

    it.each([
      ["a phone", true],
      ["desktop", false],
    ])(
      "writes a note step on the page on %s, with the formatting toolbar and no Insert row",
      async (_layout, compact) => {
        openWorkspace([{ type: "html", html: "<p>Pray</p>" }], 0, compact);

        const card = () => container.querySelector(".sb-pe-card")!;
        expect(card().classList.contains("sb-pe-card--plain")).toBe(true);
        // TipTap loads lazily; let each poll render what has arrived.
        const deadline = Date.now() + 3000;
        while (
          !card().querySelector(".sb-editor-toolbar") &&
          Date.now() < deadline
        ) {
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
          });
        }
        expect(card().querySelector(".sb-editor-toolbar")).not.toBeNull();
        expect(
          card().querySelector(".sb-pe-rich-field-inner--formatting")
        ).not.toBeNull();
        expect(card().querySelector(".sb-pe-insert")).toBeNull();
      }
    );

    describe.each([
      ["a phone", true],
      ["desktop", false],
    ])("a video step on %s", (_layout, compact) => {
      const VIDEO: Playlist["items"][number] = {
        type: "link",
        url: "https://youtu.be/abc",
        embed: true,
        preview: {
          title: "The Best Catan Strategy",
          author: "Board Game Lab",
          imageUrl: "https://example.com/thumb.jpg",
        },
        transcript: true,
      };

      it("has one title, its placeholder the video's own, and no card or transcript", () => {
        openWorkspace([VIDEO], 0, compact);

        const card = container.querySelector(".sb-pe-card")!;
        expect(card.classList.contains("sb-pe-card--plain")).toBe(true);
        const titles =
          card.querySelectorAll<HTMLInputElement>('input[type="text"]');
        expect(titles).toHaveLength(1);
        expect(titles[0]!.value).toBe("");
        expect(titles[0]!.placeholder).toBe("The Best Catan Strategy");
        expect(card.textContent).not.toContain("Transcript");
      });

      it("shows the video's title and uploader in its preview", () => {
        openWorkspace([VIDEO], 0, compact);

        const check = container.querySelector(".sb-pe-link-check")!;
        expect(check.textContent).toContain("The Best Catan Strategy");
        expect(check.textContent).toContain("Board Game Lab");
        expect(check.textContent).not.toContain("Link looks good");
      });

      it("uses the author's title while there is one, and the video's again once it's cleared", () => {
        openWorkspace([VIDEO], 0, compact);
        const title = container.querySelector("#sb-pe-title-0");

        type(title, "Catan, by the numbers");
        expect(items()[0]).toMatchObject({ title: "Catan, by the numbers" });
        if (compact) {
          expect(header().textContent).toContain("Catan, by the numbers");
        }

        type(title, "");
        expect((items()[0] as { title?: string }).title).toBeUndefined();
        if (compact) {
          expect(header().textContent).toContain("The Best Catan Strategy");
        }
      });
    });

    it("goes back to the list when the open step is deleted from its menu", () => {
      openWorkspace(STEPS, 1, true);

      click(header().querySelector('[aria-label="More"]'));
      // The menu is portaled to <body>.
      click(byText(document.body, ".sb-context-menu-item", "Delete"));

      expect(items()).toHaveLength(2);
      expect(state.playlists.editorStepIndex.value).toBe(-1);
      expect(container.querySelector(".sb-pe-list-page")).not.toBeNull();
    });
  });

  describe("details sheet (phone)", () => {
    const openDetails = () => {
      openWorkspace(STEPS, -1, true);
      click(container.querySelector(".sb-pe-mobile-title-button"));
      return container.querySelector(".sb-pe-details-sheet");
    };

    it("opens from the playlist's title, with its title, description and cover fields", () => {
      const sheet = openDetails();

      expect(sheet).not.toBeNull();
      expect(sheet!.querySelector("#sb-pe-details-title")).not.toBeNull();
      expect(sheet!.querySelector("#sb-pe-details-description")).not.toBeNull();
      expect(sheet!.textContent).toContain("Cover image");
    });

    it("saves the title and description to the draft as they're typed", () => {
      const sheet = openDetails()!;

      type(sheet.querySelector("#sb-pe-details-title"), "Evening Psalms");
      type(
        sheet.querySelector("#sb-pe-details-description"),
        "Read one before bed."
      );

      expect(state.playlists.editingPlaylist.value).toMatchObject({
        title: "Evening Psalms",
        description: "Read one before bed.",
      });
      expect(
        container.querySelector(".sb-pe-mobile-title-text")?.textContent
      ).toBe("Evening Psalms");
    });

    it("closes from its close button and its backdrop, leaving the editor open", () => {
      const sheet = openDetails()!;
      click(sheet.querySelector('[aria-label="Close"]'));
      expect(container.querySelector(".sb-pe-details-sheet")).toBeNull();

      click(container.querySelector(".sb-pe-mobile-title-button"));
      click(container.querySelector(".sb-pe-sheet-scrim"));
      expect(container.querySelector(".sb-pe-details-sheet")).toBeNull();
      expect(state.playlists.editingPlaylist.value).not.toBeNull();
    });

    it("is closed again when the editor next opens", () => {
      openDetails();
      act(() => state.playlists.cancelEditingPlaylist());

      openWorkspace(STEPS, -1, true);

      expect(container.querySelector(".sb-pe-details-sheet")).toBeNull();
    });
  });

  describe("closing", () => {
    it("is a back arrow at the start of the side panel's title bar, in place of a close button", () => {
      openPanel();

      const header = container.querySelector(".sb-pe-panel-header")!;
      expect(header.firstElementChild?.getAttribute("aria-label")).toBe(
        "Close playlist editor"
      );
      expect(header.querySelector(".sb-pe-panel-close")).toBeNull();
    });

    it("is a back arrow at the start of the phone's title bar, and closes the editor from the list", () => {
      openWorkspace(STEPS, -1, true);

      const header = container.querySelector(".sb-pe-mobile-header")!;
      const back = header.firstElementChild;
      expect(back?.getAttribute("aria-label")).toBe("Close playlist editor");

      click(back);

      expect(state.playlists.editingPlaylist.value).toBeNull();
    });

    it("goes back from an open step to the list first, in the side panel too", () => {
      openPanel();
      act(() => state.playlists.selectEditorStep(1));

      click(container.querySelector('[aria-label="Back to items"]'));

      expect(state.playlists.editorStepIndex.value).toBe(-1);
      expect(state.playlists.editingPlaylist.value).not.toBeNull();
      expect(
        container.querySelector('[aria-label="Close playlist editor"]')
      ).not.toBeNull();
    });

    it("closes straight away when nothing changed", () => {
      openPanel();

      click(container.querySelector('[aria-label="Close playlist editor"]'));

      expect(state.playlists.editingPlaylist.value).toBeNull();
    });

    it("asks before throwing away unsaved changes", () => {
      openPanel();
      act(() => state.playlists.selectEditorStep(0));
      click(container.querySelector('[aria-label="Delete step"]'));

      click(container.querySelector('[aria-label="Close playlist editor"]'));

      expect(state.playlists.editingPlaylist.value).not.toBeNull();
      expect(document.body.textContent).toContain(
        "You have unsaved changes. What would you like to do?"
      );
    });
  });

  describe("adding a step", () => {
    it("inserts the chosen kind after the open step and opens it", () => {
      openPanel();
      act(() => state.playlists.selectEditorStep(0));

      click(byText(container, ".sb-pe-add-step", "Add new step"));
      expect(container.textContent).toContain("Inserted after step 1");
      click(byText(container, ".sb-pe-add-option", "Note"));

      expect(items()).toHaveLength(4);
      expect(items()[1]).toEqual({ type: "html", html: "" });
      expect(state.playlists.editorStepIndex.value).toBe(1);
      expect(container.querySelector(".sb-pe-add-menu")).toBeNull();
    });

    it("closes the menu with Escape without adding anything", () => {
      openPanel();
      click(byText(container, ".sb-pe-add-step", "Add new step"));

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(container.querySelector(".sb-pe-add-menu")).toBeNull();
      expect(items()).toHaveLength(3);
    });
  });

  describe("step cards", () => {
    it.each([
      ["question", "a phone", 2, true],
      ["question", "desktop", 2, false],
      ["compare", "a phone", 0, true],
      ["compare", "desktop", 0, false],
    ] as const)(
      "puts a %s step's fields on the page with no card on %s",
      (kind, _layout, step, compact) => {
        const compare: Playlist["items"][number] = {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 1 },
          compare: { ref: { bookId: "JHN", chapter: 1 } },
        };
        openWorkspace(kind === "compare" ? [compare] : STEPS, step, compact);

        const card = container.querySelector(".sb-pe-card")!;
        expect(card.classList.contains("sb-pe-card--plain")).toBe(true);
      }
    );

    it("edits a question's text, hint, and answer, with no choice of who sees responses", () => {
      openWorkspace(STEPS, 2);

      expect(container.querySelector(".sb-pe-eyebrow")!.textContent).toBe(
        "Step 3 · Question"
      );
      type(container.querySelector("#sb-pe-question-2"), "Where is <God>?");
      type(container.querySelector("#sb-pe-question-hint-2"), "Look back");
      type(container.querySelector("#sb-pe-question-answer-2"), "Everywhere");

      expect(container.textContent).not.toContain("Who sees responses");

      expect(items()[2]).toEqual({
        type: "html",
        html: "<p>Where is &lt;God&gt;?</p>",
        question: { hint: "Look back", answer: "Everywhere" },
        minutes: 4,
      });
    });

    it("says when a video link isn't one it can play", async () => {
      openWorkspace(STEPS, 1);

      type(container.querySelector("#sb-pe-link-1"), "not a link");

      expect(container.textContent).toContain(
        "That isn't a YouTube or Vimeo link."
      );
      // The step keeps its old link until the new one is in.
      expect(items()[1]).toMatchObject({ url: "https://youtu.be/abc" });

      type(
        container.querySelector("#sb-pe-link-1"),
        "https://youtube.com/watch?v=xyz"
      );
      expect(
        container.querySelector(".sb-pe-link-check")?.textContent
      ).toContain("https://youtube.com/watch?v=xyz");
      await waitFor(
        () =>
          (items()[1] as { url: string }).url ===
          "https://youtube.com/watch?v=xyz"
      );
    });

    it("compares the typed second passage, in the chosen layout", () => {
      openWorkspace(
        [
          {
            type: "bible-verse",
            ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 3 },
            compare: { ref: { bookId: "GEN", chapter: 1 } },
          },
        ],
        0
      );

      type(container.querySelector("#sb-pe-passage-b-0"), "John 1:1-5");
      click(byText(container, ".sb-pe-layout", "Stacked"));
      type(container.querySelector("#sb-pe-notice-0"), "Both begin the same");

      expect(items()[0]).toEqual({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 3 },
        compare: {
          ref: { bookId: "JHN", chapter: 1, verse: 1, endVerse: 5 },
          layout: "stacked",
        },
        note: "<p>Both begin the same</p>",
      });
    });

    it("leaves the passage as it was while the typed reference doesn't parse", () => {
      openWorkspace(
        [
          {
            type: "bible-verse",
            ref: { bookId: "GEN", chapter: 1 },
            compare: { ref: { bookId: "GEN", chapter: 2 } },
          },
        ],
        0
      );

      type(container.querySelector("#sb-pe-passage-b-0"), "Nowhere 99");

      expect(items()[0]).toMatchObject({
        compare: { ref: { bookId: "GEN", chapter: 2 } },
      });
    });
  });

  describe("toolbar", () => {
    it("sets the open step's reading time and group settings", () => {
      openWorkspace(STEPS, 0);

      click(container.querySelector('[aria-label="More time"]'));
      click(container.querySelector('[aria-label="More time"]'));
      click(byText(container, ".sb-pe-switch", "Pause for group"));
      click(byText(container, ".sb-pe-switch", "Leader only"));

      expect(items()[0]).toMatchObject({
        minutes: 3,
        pauseForGroup: true,
        leaderOnly: true,
      });

      click(container.querySelector('[aria-label="Less time"]'));
      expect(items()[0]).toMatchObject({ minutes: 2 });
    });

    it("won't go below one minute", () => {
      openWorkspace(STEPS, 0);

      expect(
        (
          container.querySelector(
            '[aria-label="Less time"]'
          ) as HTMLButtonElement
        ).disabled
      ).toBe(true);
    });
  });

  it("has no Edit/Preview switch or note box over a desktop scripture step, leaving the note to the toolbar", () => {
    openDesktopEditor(STEPS, 0);

    expect(container.querySelector(".sb-pe-workspace")).not.toBeNull();
    expect(container.textContent).not.toContain("Preview");
    expect(container.querySelector(".sb-pe-workspace .tiptap")).toBeNull();
    expect(container.querySelector("[contenteditable]")).toBeNull();
  });

  describe("review & publish", () => {
    it("won't publish while a step is incomplete, and links to it", () => {
      const recordData = vi.spyOn(state.os, "recordData");
      openDesktopEditor(STEPS, 0);
      // A new video step has no link until one is typed in.
      act(() => state.playlists.addEditorStep("video", 2));
      act(() => state.playlists.selectEditorStep(0));

      click(byText(container, ".sb-pe-publish", "Review & publish"));

      const publish = byText(
        document.body,
        ".sb-pe-review .sb-pe-publish",
        "Publish"
      ) as HTMLButtonElement;
      expect(publish.disabled).toBe(true);
      click(byText(document.body, ".sb-pe-review-problems button", "Step 4"));

      expect(state.playlists.editorStepIndex.value).toBe(3);
      expect(recordData).not.toHaveBeenCalled();
    });

    it("saves the playlist and leaves the editor", async () => {
      const recordData = vi
        .spyOn(state.os, "recordData")
        .mockResolvedValue(undefined as never);
      openDesktopEditor(STEPS, 0);

      click(byText(container, ".sb-pe-publish", "Review & publish"));
      type(document.body.querySelector("#sb-pe-review-title"), "Light");
      click(byText(document.body, ".sb-pe-review .sb-pe-publish", "Publish"));

      await waitFor(() => state.playlists.editingPlaylist.value === null);
      const saved = recordData.mock.calls[0]![2] as Playlist;
      expect(saved.title).toBe("Light");
      expect(saved.items).toEqual(STEPS);
    });

    it("says so and keeps the draft when publishing fails", async () => {
      vi.spyOn(state.os, "recordData").mockRejectedValue(new Error("offline"));
      vi.spyOn(console, "error").mockImplementation(() => {});
      openDesktopEditor(STEPS, 0);

      click(byText(container, ".sb-pe-publish", "Review & publish"));
      click(byText(document.body, ".sb-pe-review .sb-pe-publish", "Publish"));

      await waitFor(
        () =>
          !!document.body.textContent?.includes(
            "The playlist couldn't be published. Try again."
          )
      );
      expect(state.playlists.editingPlaylist.value).not.toBeNull();
    });
  });
});

describe("a scripture step's note sheet (phone)", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    jsdom.reconfigure({
      url: "https://example.com/en/bible/BSB/GEN/1?useFreeBibleAPI=true",
    });
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const openSheet = (item: Playlist["items"][number]) => {
    act(() => {
      state.playlists.editPlaylist(makePlaylist([item]));
      state.playlists.selectEditorStep(0);
    });
    const Sheet = () => {
      const current = state.playlists.editingPlaylist.value?.items[0];
      return current?.type === "bible-verse" ? (
        <PlaylistStepNoteSheet
          state={state}
          index={0}
          item={current}
          resolveBookName={(bookId) => (bookId === "GEN" ? "Genesis" : bookId)}
        />
      ) : null;
    };
    act(() => {
      render(
        <TestHost state={state}>
          <Sheet />
        </TestHost>,
        container
      );
    });
  };
  const header = () =>
    container.querySelector(".sb-scripture-note-sheet-header")!;
  const item = () => state.playlists.editingPlaylist.value!.items[0]!;

  it("offers to add a note when there's none, and opens to write one", () => {
    openSheet({ type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } });

    expect(header().textContent).toContain("Add note");
    expect(container.querySelector(".sb-pe-note-sheet-body")).toBeNull();

    click(header());

    const title = container.querySelector<HTMLInputElement>(
      "#sb-pe-note-sheet-title"
    );
    expect(title).not.toBeNull();
    type(title, "In the beginning");
    expect(item()).toMatchObject({ noteTitle: "In the beginning" });
    // Nothing to remove until there's a note.
    expect(header().textContent).toContain("In the beginning");
  });

  it("writes the note in TipTap with its formatting toolbar, and no Insert row", async () => {
    openSheet({ type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } });
    click(header());

    // TipTap loads lazily.
    await act(async () => {
      await waitFor(
        () => !!container.querySelector(".sb-editor-toolbar"),
        2000
      );
    });

    expect(
      [...container.querySelectorAll(".sb-editor-toolbar button")].map((b) =>
        b.getAttribute("aria-label")
      )
    ).toEqual([
      "Bold",
      "Italic",
      "Underline",
      "Align left",
      "Align center",
      "Align right",
      "Justify",
    ]);
    expect(container.querySelector(".sb-pe-insert")).toBeNull();
  });

  it("shows a note the way playback does, and Remove note clears it", () => {
    openSheet({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
      noteTitle: "Light",
      note: "<p>God speaks.</p>",
    });

    expect(header().textContent).toContain("Genesis 1");
    expect(header().textContent).toContain("Light");

    click(header());
    click(container.querySelector(".sb-pe-note-remove"));

    expect(item()).toEqual({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    });
    expect(header().textContent).toContain("Add note");
    expect(container.querySelector(".sb-pe-note-sheet-body")).toBeNull();
  });
});

describe("a link to another step in a note", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("goes to that step instead of following the link", async () => {
    const onStepClick = vi.fn();
    act(() => {
      render(
        <PlaylistHtmlContent
          html='<p>See <a href="#playlist-step-3">step 3</a></p>'
          onStepClick={onStepClick}
        />,
        container
      );
    });
    await waitFor(() => !!container.querySelector("a"));

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      container.querySelector("a")!.dispatchEvent(event);
    });

    expect(onStepClick).toHaveBeenCalledWith(2);
    expect(event.defaultPrevented).toBe(true);
  });
});
