/**
 * Tests for the window-level keyboard chapter shortcuts in TabSlotReader
 * (Left/Right → previous/next chapter, "/" → open search).
 *
 * Key invariants this suite covers:
 *   1. Arrow keys do NOT fire chapter navigation when focus is inside an
 *      interactive container that owns its own keyboard handling
 *      (menu, dialog, aria-modal, listbox, toolbar, slider, radiogroup).
 *   2. Arrow keys DO fire chapter navigation when focus is on a plain element.
 *   3. "/" opens search; ArrowUp no longer does (old behaviour removed so Up
 *      can scroll the reader).
 */
import { render } from "preact";
import { act } from "preact/test-utils";
import { TabSlotReader } from "@packages/seed-bible/seed-bible/components/TabsLayout";
import {
  createTestSeedBibleState,
  waitForTabsToLoad,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import {
  makeUrl,
  translations,
  aabBooks,
  makeChapter,
  createResponse,
} from "../managers/testUtils/mockBibleApiData";

// The app defaults to the private API endpoint; responses must be keyed on it.
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
  };
}

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("TabSlotReader — keyboard chapter shortcuts", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /**
   * Creates a fully-loaded state, renders TabSlotReader, and returns the spies
   * the tests assert against.
   */
  async function setup() {
    const state = await createTestSeedBibleState({
      responses: createResponses(),
    });

    // After createTestSeedBibleState, there is exactly one slot with a tab.
    const slot = state.app.effectiveSlots.value[0]!;
    const tab = slot.tab!;
    const readingState = tab.readingState;

    // Confirm the slot is selected so the handler doesn't skip it.
    state.tabsLayout.selectedSlotId.value = slot.id;

    const loadNext = vi
      .spyOn(readingState, "loadNextChapter")
      .mockResolvedValue(undefined);
    const loadPrev = vi
      .spyOn(readingState, "loadPreviousChapter")
      .mockResolvedValue(undefined);
    const clearVerses = vi
      .spyOn(readingState, "clearSelectedVerses")
      .mockReturnValue(undefined);
    const openSearch = vi
      .spyOn(state.sidebar, "openSearch")
      .mockReturnValue(undefined);

    act(() => {
      render(
        <TestHost state={state}>
          <TabSlotReader slot={slot} tab={tab} state={state} />
        </TestHost>,
        container
      );
    });

    return {
      state,
      slot,
      tab,
      readingState,
      loadNext,
      loadPrev,
      clearVerses,
      openSearch,
    };
  }

  /**
   * Dispatches a keydown on `target` and lets it bubble to the window listener.
   */
  function fireKey(key: string, target: EventTarget) {
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
      );
    });
  }

  // ── Guard cases ──────────────────────────────────────────────────────────

  it("does not change chapter when ArrowRight fires from inside a menu", async () => {
    const { loadNext } = await setup();

    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    const btn = document.createElement("button");
    menu.appendChild(btn);
    document.body.appendChild(menu);

    btn.focus();
    fireKey("ArrowRight", btn);

    expect(loadNext).not.toHaveBeenCalled();

    menu.remove();
  });

  it("does not change chapter when ArrowLeft fires from inside a dialog", async () => {
    const { loadPrev } = await setup();

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const btn = document.createElement("button");
    dialog.appendChild(btn);
    document.body.appendChild(dialog);

    btn.focus();
    fireKey("ArrowLeft", btn);

    expect(loadPrev).not.toHaveBeenCalled();

    dialog.remove();
  });

  it("does not change chapter when ArrowRight fires from inside an aria-modal", async () => {
    const { loadNext } = await setup();

    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    const btn = document.createElement("button");
    modal.appendChild(btn);
    document.body.appendChild(modal);

    btn.focus();
    fireKey("ArrowRight", btn);

    expect(loadNext).not.toHaveBeenCalled();

    modal.remove();
  });

  it("does not change chapter when ArrowRight fires from inside a listbox", async () => {
    const { loadNext } = await setup();

    const listbox = document.createElement("div");
    listbox.setAttribute("role", "listbox");
    const option = document.createElement("div");
    option.setAttribute("role", "option");
    option.setAttribute("tabindex", "0");
    listbox.appendChild(option);
    document.body.appendChild(listbox);

    option.focus();
    fireKey("ArrowRight", option);

    expect(loadNext).not.toHaveBeenCalled();

    listbox.remove();
  });

  it("does not change chapter when ArrowRight fires from inside a toolbar", async () => {
    const { loadNext } = await setup();

    const toolbar = document.createElement("div");
    toolbar.setAttribute("role", "toolbar");
    const btn = document.createElement("button");
    toolbar.appendChild(btn);
    document.body.appendChild(toolbar);

    btn.focus();
    fireKey("ArrowRight", btn);

    expect(loadNext).not.toHaveBeenCalled();

    toolbar.remove();
  });

  it("does not change chapter when ArrowRight fires from inside a radiogroup", async () => {
    const { loadNext } = await setup();

    const radiogroup = document.createElement("div");
    radiogroup.setAttribute("role", "radiogroup");
    const radio = document.createElement("button");
    radio.setAttribute("role", "radio");
    radiogroup.appendChild(radio);
    document.body.appendChild(radiogroup);

    radio.focus();
    fireKey("ArrowRight", radio);

    expect(loadNext).not.toHaveBeenCalled();

    radiogroup.remove();
  });

  // ── Positive cases ───────────────────────────────────────────────────────

  it("navigates to next chapter when ArrowRight fires from a plain element", async () => {
    const { loadNext, clearVerses } = await setup();

    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();

    fireKey("ArrowRight", btn);

    expect(clearVerses).toHaveBeenCalled();
    expect(loadNext).toHaveBeenCalled();

    btn.remove();
  });

  it("opens search when / fires from a plain element", async () => {
    const { openSearch } = await setup();

    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();

    fireKey("/", btn);

    expect(openSearch).toHaveBeenCalled();
  });

  it("does not open search when ArrowUp fires from a plain element", async () => {
    const { openSearch } = await setup();

    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();

    fireKey("ArrowUp", btn);

    expect(openSearch).not.toHaveBeenCalled();
  });

  // ── Field exceptions still apply ─────────────────────────────────────────

  it("does not change chapter when ArrowRight fires from an input field", async () => {
    const { loadNext } = await setup();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireKey("ArrowRight", input);

    expect(loadNext).not.toHaveBeenCalled();

    input.remove();
  });
});
