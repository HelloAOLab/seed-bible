import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistEditorPanel } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorPanel";
import { PlaylistEditorWorkspace } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorWorkspace";
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
      expect(container.querySelector(".sb-pe-panel-status")!.textContent).toBe(
        "Draft"
      );

      click(container.querySelector('[aria-label="Duplicate step"]'));

      expect(container.querySelector(".sb-pe-panel-status")!.textContent).toBe(
        "Draft - Unsaved changes"
      );
    });
  });

  describe("details sheet (phone)", () => {
    const openDetails = () => {
      openWorkspace(STEPS, 0, true);
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

      openWorkspace(STEPS, 0, true);

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

    it("is a back arrow at the start of the phone's title bar, and closes the editor", () => {
      openWorkspace(STEPS, 0, true);

      const header = container.querySelector(".sb-pe-mobile-header")!;
      const back = header.firstElementChild;
      expect(back?.getAttribute("aria-label")).toBe("Close playlist editor");

      click(back);

      expect(state.playlists.editingPlaylist.value).toBeNull();
    });

    it("closes straight away when nothing changed", () => {
      openPanel();

      click(container.querySelector('[aria-label="Close playlist editor"]'));

      expect(state.playlists.editingPlaylist.value).toBeNull();
    });

    it("asks before throwing away unsaved changes", () => {
      openPanel();
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
    it("edits a question's text, hint, and who sees the answers", () => {
      openWorkspace(STEPS, 2);

      expect(container.querySelector(".sb-pe-eyebrow")!.textContent).toBe(
        "Step 3 · Question"
      );
      type(container.querySelector("#sb-pe-question-2"), "Where is <God>?");
      type(container.querySelector("#sb-pe-question-hint-2"), "Look back");
      click(byText(container, ".sb-pe-option", "Shared with group"));

      expect(items()[2]).toEqual({
        type: "html",
        html: "<p>Where is &lt;God&gt;?</p>",
        question: { hint: "Look back", responses: "shared" },
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
      expect(container.textContent).toContain("Link looks good");
      await waitFor(
        () =>
          (items()[1] as { url: string }).url ===
          "https://youtube.com/watch?v=xyz"
      );
    });

    it("turns the transcript on and off", () => {
      openWorkspace(STEPS, 1);

      const toggle = byText(container, ".sb-pe-toggle-row", "Show transcript");
      click(toggle);
      expect(items()[1]).toMatchObject({ transcript: true });
      click(toggle);
      expect(items()[1]).not.toHaveProperty("transcript", true);
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

    it("hides the step's settings while previewing", () => {
      openWorkspace(STEPS, 0);

      click(byText(container, ".sb-pe-mode-option", "Preview"));

      expect(state.playlists.editorMode.value).toBe("preview");
      expect(container.querySelector(".sb-pe-toolbar")).toBeNull();
    });
  });

  describe("review & publish", () => {
    it("won't publish while a step is incomplete, and links to it", () => {
      const recordData = vi.spyOn(state.os, "recordData");
      openWorkspace(STEPS, 0);
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
      openWorkspace(STEPS, 0);

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
      openWorkspace(STEPS, 0);

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
