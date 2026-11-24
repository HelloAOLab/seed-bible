import { hydrate, render } from "preact";
import { act } from "preact/test-utils";
import {
  READING_PLAN_EDITOR_PANE_ID,
  ReadingPlanEditorPanel,
  ReadingPlanEditorWorkspace,
} from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanEditor";
import { TabSlotReader } from "@packages/seed-bible/seed-bible/components/TabsLayout";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import {
  createReadingPlan,
  type ReadingPlan,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { stepEditorOnTab } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/stepEditorHost";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const SAVED_AT_MS = 1_700_000_000_000;

const chapter = (bookId: string, number: number): PlaylistItemData => ({
  type: "bible-verse",
  ref: { bookId, chapter: number },
});

/** A plan of two sessions: Genesis 1 and a note, then Exodus 1. */
function makePlan(overrides: Partial<ReadingPlan> = {}): ReadingPlan {
  return {
    ...createReadingPlan("user-1", "user-1", "plan-1", SAVED_AT_MS, {
      title: "Beginnings",
      status: "complete",
      sessions: [
        {
          id: "s1",
          title: null,
          readings: [
            { id: "r1", item: chapter("GEN", 1) },
            {
              id: "r2",
              item: { type: "html", title: "Reflect", html: "<p>Think</p>" },
            },
          ],
        },
        {
          id: "s2",
          title: null,
          readings: [{ id: "r3", item: chapter("EXO", 1) }],
        },
      ],
    }),
    ...overrides,
  };
}

const click = (element: Element | null | undefined) => {
  if (!element) {
    throw new Error("Nothing to click");
  }
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const type = (element: Element | null, value: string) => {
  const input = element as HTMLInputElement | null;
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

describe("the reading plan editor", () => {
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

  // The desktop editor as the app lays it out: the reader workspace beside
  // the editor's side panel.
  const show = (compact = false) =>
    act(() => {
      render(
        <TestHost state={state}>
          <ReadingPlanEditorWorkspace state={state} compact={compact}>
            <div className="sb-pane-reader">reader</div>
          </ReadingPlanEditorWorkspace>
          {compact ? null : <ReadingPlanEditorPanel state={state} />}
          <ModalHost manager={state.modals} isMobile={state.app.isMobile} />
        </TestHost>,
        container
      );
    });

  const openEditor = (plan = makePlan(), onBack?: () => void) => {
    act(() => state.readingPlans.openReadingPlanInEditor(plan, { onBack }));
    show();
  };

  const sessions = () =>
    state.readingPlans.editingReadingPlan.value!.plan.sessions;
  const readingIds = () =>
    sessions().map((session) => session.readings.map((r) => r.id));
  const list = () => container.querySelector(".sb-pe-steps")!;
  const back = () => container.querySelector(".sb-pe-back")!;
  const publish = () => container.querySelector(".sb-pe-publish")!;
  const choose = (label: string) =>
    click(byText(document.body, ".sb-unsaved-changes-actions button", label));
  const changeTitle = (title: string) =>
    act(() => state.readingPlans.updateEditingReadingPlan({ title }));

  describe("list", () => {
    it("shows each session's heading above its readings, in order", () => {
      openEditor();

      const rows = Array.from(list().children).map(
        (row) =>
          row.querySelector(".sb-rp-session-name, .sb-discover-item-title")!
            .textContent
      );
      expect(rows).toEqual([
        "Session 1",
        "Genesis 1",
        "Reflect",
        "Session 2",
        "Exodus 1",
      ]);
      expect(container.querySelector(".sb-pe-step-count")!.textContent).toBe(
        "2 sessions · 3 readings"
      );
    });

    it("opens a reading when its row is clicked, counting across sessions", () => {
      openEditor();

      click(byText(list(), ".sb-pe-step-open", "Exodus 1"));

      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(2);
      expect(
        container.querySelector('[aria-current="step"]')!.textContent
      ).toContain("Exodus 1");
      // Opened in the editor over the reader, with a step's own toolbar.
      expect(container.querySelector(".sb-pe-toolbar")).not.toBeNull();
    });

    it("opens a note's card in the reader's place", () => {
      openEditor();

      click(byText(list(), ".sb-pe-step-open", "Reflect"));
      type(container.querySelector("#sb-pe-title-1"), "Pause here");

      expect(sessions()[0]!.readings[1]!.item).toMatchObject({
        title: "Pause here",
      });
      // Edited in place: its progress is recorded against its id.
      expect(readingIds()).toEqual([["r1", "r2"], ["r3"]]);
    });

    it("duplicates a session's last reading into that session, not the next", () => {
      openEditor();
      click(byText(list(), ".sb-pe-step-open", "Reflect"));

      click(container.querySelector('[aria-label="Duplicate step"]'));

      expect(sessions().map((s) => s.readings.length)).toEqual([3, 1]);
      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(2);
    });

    it("says so when there's nothing in it, with a button that adds the first", () => {
      openEditor(makePlan({ status: "draft", sessions: [] }));
      expect(container.textContent).toContain("This plan is empty");

      click(container.querySelector(".sb-pe-empty-list-add"));
      click(byText(container, ".sb-pe-add-option", "Note"));

      expect(sessions().map((s) => s.readings.length)).toEqual([1]);
    });

    it("adds and removes sessions", () => {
      openEditor();

      click(container.querySelector(".sb-rp-add-session"));
      expect(sessions()).toHaveLength(3);

      click(container.querySelectorAll(".sb-rp-session-remove")[0]);
      expect(readingIds()).toEqual([["r3"], []]);
    });

    it("keeps the open reading open when a session before it is removed", () => {
      openEditor();
      click(byText(list(), ".sb-pe-step-open", "Exodus 1"));

      click(container.querySelectorAll(".sb-rp-session-remove")[0]);

      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(0);
      expect(
        container.querySelector('[aria-current="step"]')!.textContent
      ).toContain("Exodus 1");
    });

    it("goes back to the list when the open reading's session is removed", () => {
      openEditor();
      click(byText(list(), ".sb-pe-step-open", "Exodus 1"));

      click(container.querySelectorAll(".sb-rp-session-remove")[1]);

      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(-1);
    });
  });

  describe("dragging", () => {
    const ROW_HEIGHT = 40;
    beforeEach(() => {
      vi.spyOn(HTMLLIElement.prototype, "offsetHeight", "get").mockReturnValue(
        ROW_HEIGHT
      );
    });
    afterEach(() => vi.restoreAllMocks());

    /** Drags a reading by whole rows, up or down, and lets go. */
    const drag = (label: string, rows: number) => {
      const handle = byText(list(), "li", label)!.querySelector(
        ".sb-pe-step-handle"
      )!;
      const pointer = (name: string, clientY: number) =>
        Object.assign(new Event(name, { bubbles: true }), {
          pointerId: 1,
          clientY,
        });
      act(() => void handle.dispatchEvent(pointer("pointerdown", 0)));
      act(
        () =>
          void window.dispatchEvent(pointer("pointermove", rows * ROW_HEIGHT))
      );
      act(() => void window.dispatchEvent(pointer("pointerup", 0)));
    };

    it("moves a reading within its session", () => {
      openEditor();
      drag("Reflect", -1);
      expect(readingIds()).toEqual([["r2", "r1"], ["r3"]]);
    });

    it("moves a reading into the next session, past its heading", () => {
      openEditor();
      drag("Reflect", 1);
      expect(readingIds()).toEqual([["r1"], ["r2", "r3"]]);
    });

    it("moves a reading up into the end of the session before", () => {
      openEditor();
      drag("Exodus 1", -1);
      expect(readingIds()).toEqual([["r1", "r2", "r3"], []]);
    });

    it("stops under the first session's heading", () => {
      openEditor();
      drag("Exodus 1", -10);
      expect(readingIds()).toEqual([["r3", "r1", "r2"], []]);
    });

    it("keeps the open reading open as it's dragged", () => {
      openEditor();
      click(byText(list(), ".sb-pe-step-open", "Genesis 1"));
      drag("Genesis 1", 2);
      expect(readingIds()).toEqual([["r2"], ["r1", "r3"]]);
      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(1);
    });
  });

  describe("adding a step", () => {
    const addNote = () => click(byText(container, ".sb-pe-add-option", "Note"));

    it("adds to a session from its heading, whichever reading is open", () => {
      openEditor();
      click(byText(list(), ".sb-pe-step-open", "Exodus 1"));

      click(container.querySelector('[aria-label="Add to session 1"]'));
      expect(
        container.querySelector(".sb-pe-add-menu-where")!.textContent
      ).toBe("Added to session 1");
      addNote();

      expect(sessions().map((s) => s.readings.length)).toEqual([3, 1]);
      expect(sessions()[0]!.readings[2]!.item.type).toBe("html");
    });

    it("adds to an empty session from its heading", () => {
      openEditor();
      click(container.querySelector(".sb-rp-add-session"));
      click(container.querySelector(".sb-rp-add-session"));

      click(container.querySelector('[aria-label="Add to session 3"]'));
      addNote();

      expect(sessions().map((s) => s.readings.length)).toEqual([2, 1, 1, 0]);
    });

    it("adds after the open reading from the title bar, in its session", () => {
      openEditor();
      // Session 2 was last added to, but a reading of session 1 is open.
      click(container.querySelector('[aria-label="Add to session 2"]'));
      act(() => void (state.readingPlans.stepEditor.addMenu.value = null));
      click(byText(list(), ".sb-pe-step-open", "Reflect"));

      click(container.querySelector(".sb-pe-add-toggle"));
      addNote();

      expect(sessions().map((s) => s.readings.length)).toEqual([3, 1]);
      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(2);
    });

    it("adds to the last session from the title bar when none is open", () => {
      openEditor();

      click(container.querySelector(".sb-pe-add-toggle"));
      addNote();

      expect(sessions().map((s) => s.readings.length)).toEqual([2, 2]);
    });
  });

  it("sets a reading's time, which the plan then counts", () => {
    openEditor();
    click(byText(list(), ".sb-pe-step-open", "Reflect"));
    const minutes = () =>
      byText(list(), "li", "Reflect")!.querySelector(
        ".sb-playlist-page-item-minutes"
      )!.textContent;
    expect(minutes()).toBe("3 min");

    click(container.querySelector('[aria-label="More time"]'));

    expect(minutes()).toBe("4 min");
    expect(sessions()[0]!.readings[1]!.item.minutes).toBe(4);
  });

  it("edits the title, description and paces in its details", () => {
    openEditor();

    click(container.querySelector(".sb-pe-panel-title-button"));
    type(
      document.body.querySelector("#sb-pe-details-modal-title"),
      "In the beginning"
    );
    click(
      byText(
        document.body,
        ".sb-rp-choice",
        "Two sessions a day"
      )!.querySelector("input")
    );

    const { plan } = state.readingPlans.editingReadingPlan.value!;
    expect(plan.title).toBe("In the beginning");
    expect(plan.cadenceOptions.map((option) => option.id)).toEqual([
      "once-daily",
      "twice-daily",
    ]);
    expect(container.querySelector(".sb-pe-panel-title")!.textContent).toBe(
      "In the beginning"
    );
  });

  describe("status", () => {
    const status = () =>
      container.querySelector(".sb-pe-panel-status")!.textContent;

    it("says whether a published plan has unsaved changes", () => {
      openEditor();
      expect(status()).toBe("Saved");

      changeTitle("Changed");
      expect(status()).toBe("Draft - Unsaved changes");

      changeTitle("Beginnings");
      expect(status()).toBe("Saved");
    });

    it("says how saving a new plan's draft is going", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(state.os, "recordData").mockRejectedValue(new Error("offline"));
      openEditor(makePlan({ status: "draft" }));
      expect(status()).toBe("Draft saved");

      changeTitle("Changed");
      expect(status()).toBe("Saving…");

      await waitFor(() => status() === "Couldn't save draft", 3000);
    });
  });

  describe("leaving", () => {
    it("goes from an open reading to the list first, then out", () => {
      const onBack = vi.fn();
      openEditor(makePlan(), onBack);
      click(byText(list(), ".sb-pe-step-open", "Genesis 1"));

      click(back());
      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(-1);
      expect(onBack).not.toHaveBeenCalled();

      click(back());
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(state.readingPlans.isEditorShowing.value).toBe(false);
      expect(state.readingPlans.editingReadingPlan.value).toBeNull();
    });

    it("asks what to do with unsaved changes, and stays until told", () => {
      openEditor();
      changeTitle("Changed");

      click(back());

      expect(document.body.textContent).toContain(
        "You have unsaved changes. What would you like to do?"
      );
      expect(state.readingPlans.isEditorShowing.value).toBe(true);
    });

    it("throws changes to a published plan away with Discard Changes", () => {
      const record = vi.spyOn(state.os, "recordData");
      openEditor();
      changeTitle("Changed");
      click(back());
      choose("Discard Changes");

      expect(state.readingPlans.isEditorShowing.value).toBe(false);
      act(() => state.readingPlans.openReadingPlanInEditor(makePlan()));
      expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
        "Beginnings"
      );
      expect(record).not.toHaveBeenCalled();
    });

    it("keeps changes to a published plan with Save Draft, and offers them next time", () => {
      openEditor();
      changeTitle("Changed");
      click(back());
      choose("Save Draft");
      expect(state.readingPlans.editingReadingPlan.value).toBeNull();

      act(() => state.readingPlans.openReadingPlanInEditor(makePlan()));
      expect(document.body.textContent).toContain(
        "You have unsaved changes to this reading plan, last edited"
      );
      expect(state.readingPlans.isEditorShowing.value).toBe(false);

      click(byText(document.body, "button", "Continue from Draft"));
      expect(state.readingPlans.isEditorShowing.value).toBe(true);
      expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
        "Changed"
      );
      // Still measured against the plan as published.
      expect(state.readingPlans.isEditingReadingPlanDirty()).toBe(true);
    });

    it("forgets a kept draft made to an older version of the plan", () => {
      openEditor();
      changeTitle("Changed");
      click(back());
      choose("Save Draft");

      const updated = makePlan({ updatedAtMs: SAVED_AT_MS + 1 });
      act(() => state.readingPlans.openReadingPlanInEditor(updated));

      expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
        "Beginnings"
      );
    });

    it("puts a draft back as it was with Discard Changes, rather than deleting it", async () => {
      const record = vi
        .spyOn(state.os, "recordData")
        .mockResolvedValue(undefined as never);
      const erase = vi.spyOn(state.os, "eraseData");
      openEditor(makePlan({ status: "draft" }));
      changeTitle("Changed");
      click(back());
      choose("Discard Changes");

      await waitFor(() => record.mock.calls.length > 0);
      expect(record.mock.calls[0]![2]).toMatchObject({ title: "Beginnings" });
      expect(erase).not.toHaveBeenCalled();
    });

    it("publishes with Save & Publish, and returns where it was opened from", async () => {
      vi.spyOn(state.os, "recordData").mockResolvedValue(undefined as never);
      const onBack = vi.fn();
      openEditor(makePlan({ status: "draft" }), onBack);
      changeTitle("Changed");
      click(back());
      choose("Save & Publish");

      await waitFor(() => onBack.mock.calls.length > 0);
      expect(state.readingPlans.userReadingPlans.value).toMatchObject([
        { title: "Changed", status: "complete" },
      ]);
    });
  });

  describe("publishing", () => {
    it("won't publish while a reading is unfinished, and links to it", () => {
      openEditor();
      click(container.querySelector('[aria-label="Add to session 2"]'));
      click(byText(container, ".sb-pe-add-option", "Video"));
      act(() => state.readingPlans.stepEditor.selectStep(-1));

      click(publish());
      click(byText(document.body, ".sb-pe-review-problems button", "Step 4"));

      expect(state.readingPlans.stepEditor.stepIndex.value).toBe(3);
      expect(state.readingPlans.isEditorShowing.value).toBe(true);
    });

    it("asks for a name first, opening the details to give it one", () => {
      openEditor(makePlan({ status: "draft", title: null }));

      click(publish());

      expect(state.app.currentToast.value?.message).toBe(
        "Give your plan a name to save it"
      );
      expect(
        document.body.querySelector("#sb-pe-details-modal-title")
      ).not.toBeNull();
    });

    it("won't publish a plan with nothing to read", () => {
      openEditor(makePlan({ status: "draft", sessions: [] }));

      click(publish());

      expect(state.app.currentToast.value?.message).toBe(
        "Add at least one reading to create the plan"
      );
      expect(state.readingPlans.isEditorShowing.value).toBe(true);
    });

    it("says so and stays in the editor when saving fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(state.os, "recordData").mockRejectedValue(new Error("offline"));
      openEditor();
      changeTitle("Changed");

      click(publish());

      await waitFor(
        () =>
          state.app.currentToast.value?.message ===
          "Something went wrong creating your plan. Please try again."
      );
      expect(state.readingPlans.isEditorShowing.value).toBe(true);
      expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
        "Changed"
      );
    });
  });

  describe("in the app", () => {
    const paneIds = () => state.panes.panes.value.map((pane) => pane.id);
    const path = () => window.location.pathname;
    const selectedTab = () =>
      state.tabs.tabs.value.find(
        (tab) => tab.id === state.tabs.selectedTabId.value
      )!;

    it("takes over the reader, with its list in a side pane on desktop", () => {
      openEditor();

      expect(paneIds()).toEqual([READING_PLAN_EDITOR_PANE_ID]);
      expect(stepEditorOnTab(state, selectedTab())).toBe(
        state.readingPlans.stepEditor
      );
    });

    it("keeps the draft when another pane takes its place", () => {
      openEditor();
      changeTitle("Changed");

      act(() => state.app.openDiscover());

      expect(state.readingPlans.isEditorShowing.value).toBe(false);
      expect(stepEditorOnTab(state, selectedTab())).toBeNull();
      expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
        "Changed"
      );
    });

    it("gives way to the playlist editor, and takes over from it", async () => {
      openEditor();
      act(() =>
        state.playlists.editPlaylist({
          id: "p1",
          recordName: "user-1",
          authorUserId: "user-1",
          title: "List",
          description: null,
          items: [],
          createdAtMs: 1,
          updatedAtMs: 1,
        })
      );
      expect(state.readingPlans.isEditorShowing.value).toBe(false);
      expect(stepEditorOnTab(state, selectedTab())).toBe(
        state.playlists.stepEditor
      );

      act(() => state.readingPlans.openReadingPlanInEditor(makePlan()));
      expect(state.playlists.view.value).not.toBe("create_playlist");
      expect(stepEditorOnTab(state, selectedTab())).toBe(
        state.readingPlans.stepEditor
      );
      expect(paneIds()).toEqual([READING_PLAN_EDITOR_PANE_ID]);
      expect(path()).toBe("/en/reading-plan/user-1.plan-1/beginnings/edit");
    });

    it("opens a scripture reading's chapter in the reader", async () => {
      openEditor();

      act(() => state.readingPlans.stepEditor.selectStep(2));

      await waitFor(
        () => selectedTab().readingState.bookId.value === "EXO",
        2000
      );
    });

    it("puts each screen at its own path, and returns to where it opened from", () => {
      const before = path();
      openEditor();
      expect(path()).toBe("/en/reading-plan/user-1.plan-1/beginnings/edit");

      act(() => state.readingPlans.stepEditor.selectStep(1));
      expect(path()).toBe(
        "/en/reading-plan/user-1.plan-1/beginnings/edit/step/2"
      );

      act(() => state.readingPlans.stepEditor.selectStep(-1));
      click(back());
      expect(path()).toBe(before);
    });

    it("steps back with the browser's Back, and forward to the same draft", async () => {
      const onBack = vi.fn();
      openEditor(makePlan(), onBack);
      changeTitle("Not published yet");
      act(() => state.readingPlans.stepEditor.selectStep(1));

      window.history.back();
      await waitFor(() => state.readingPlans.stepEditor.stepIndex.value === -1);
      expect(state.readingPlans.isEditorShowing.value).toBe(true);

      window.history.back();
      await waitFor(() => !state.readingPlans.isEditorShowing.value);
      expect(onBack).toHaveBeenCalledTimes(1);

      window.history.forward();
      await waitFor(() => state.readingPlans.isEditorShowing.value);
      expect(state.readingPlans.editingReadingPlan.value!.plan.title).toBe(
        "Not published yet"
      );
    });

    it("covers the reader the server rendered, when a page loads straight onto it", () => {
      container.innerHTML =
        '<div class="sb-pane-reader-outer"><div class="sb-pane-reader"></div></div>';
      act(() => state.readingPlans.openReadingPlanInEditor(makePlan()));
      act(() => {
        hydrate(
          <TestHost state={state}>
            <TabSlotReader
              tab={selectedTab()}
              state={state}
              slot={state.tabsLayout.slots.value[0]!}
            />
          </TestHost>,
          container
        );
      });

      expect(
        container.querySelector(".sb-pane-reader-outer")!.className
      ).toContain("sb-pe-workspace--card");
    });

    it("has no pane of its own on a phone, and shows its list in the reader's place", () => {
      const originalWidth = window.innerWidth;
      window.innerWidth = 390;
      try {
        act(() => state.app.applyViewport());
        act(() => state.readingPlans.openReadingPlanInEditor(makePlan()));
        show(true);

        expect(paneIds()).toEqual([]);
        expect(
          container.querySelectorAll(".sb-pe-list-page .sb-pe-step")
        ).toHaveLength(3);
        expect(
          container.querySelector(".sb-pe-mobile-status")!.textContent
        ).toBe("2 sessions · 3 readings · Saved");
      } finally {
        window.innerWidth = originalWidth;
      }
    });
  });
});
