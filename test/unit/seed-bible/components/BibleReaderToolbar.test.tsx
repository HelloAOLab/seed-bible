import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";

/** The width `app.isMobile` needs to see for the bottom tab bar to render. */
const MOBILE_VIEWPORT_WIDTH = 400;

// The app defaults to the private API endpoint, so the mocked responses have to
// be keyed on it (the shared default map targets the free-use endpoint).
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

function createPrivateEndpointResponses() {
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

describe("BibleReaderToolbar — verse toolbar vs. fullscreen panes", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    // Mobile viewport: every pane renders fullscreen and the verse toolbar
    // renders as the bottom sheet.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    window.innerHeight = 800;

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState({
      responses: createPrivateEndpointResponses(),
    });

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function selectFirstVerse() {
    const readingState = state.app.currentReadingState.value!.tab.readingState;
    const chapter = readingState.chapterData.value!;
    const firstVerse = chapter.chapter.content.find(
      (entry): entry is ChapterVerse =>
        !!entry &&
        typeof entry === "object" &&
        (entry as { type?: string }).type === "verse"
    )!;

    await act(async () => {
      readingState.selectVerse(
        {
          bookId: chapter.book.id,
          chapterNumber: chapter.chapter.number,
          verse: firstVerse,
          translationId: chapter.translation.id,
        },
        10,
        10
      );
    });

    return readingState;
  }

  async function renderToolbar() {
    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });
  }

  it("keeps an open pane open when the verse selection is cleared", async () => {
    expect(state.app.isMobile.value).toBe(true);

    const readingState = await selectFirstVerse();

    await act(async () => {
      state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });
    expect(state.panes.panes.value).toHaveLength(1);

    await act(async () => {
      readingState.clearSelectedVerses();
    });

    // Clearing the selection only rewrites the `?verse` param, which is
    // selection state — not a navigation that should reveal the reader.
    expect(state.panes.panes.value).toHaveLength(1);
  });

  it("hides the verse toolbar while a pane fills the screen, and restores it when the pane closes", async () => {
    await selectFirstVerse();
    await renderToolbar();

    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();
    // The verse sheet replaces the bottom bar while it is showing.
    expect(container.querySelector(".sb-reader-toolbar-wrap")).toBeNull();

    let pane!: { id: string };
    await act(async () => {
      pane = state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });

    // Pane covers the reader: the verse sheet steps aside and the bottom bar
    // (which the pane reserves room for) comes back.
    expect(container.querySelector(".sb-verse-toolbar")).toBeNull();
    expect(container.querySelector(".sb-reader-toolbar-wrap")).not.toBeNull();
    // The selection itself is untouched.
    expect(
      state.app.currentReadingState.value!.tab.readingState.selectedVerses.value
    ).toHaveLength(1);

    await act(async () => {
      state.panes.closePane(pane.id, "user");
    });

    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();
  });

  it("does not clear the verse selection when the pane covering the reader is tapped", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    await act(async () => {
      state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });

    await act(async () => {
      document.body.dispatchEvent(
        new window.PointerEvent("pointerdown", { bubbles: true })
      );
    });

    expect(readingState.selectedVerses.value).toHaveLength(1);
  });
});

describe("BibleReaderToolbar — clearing highlights", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    window.innerHeight = 800;

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState({
      responses: createPrivateEndpointResponses(),
    });
    stubRecords();
    signIn();

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /**
   * Highlights are stored per user, so a signed-in fixture starts reading and
   * writing records. Nothing here is about the wire format — stub both ends so
   * a chapter loads empty and a save reports success.
   */
  function stubRecords() {
    Object.defineProperty(state.os, "getData", {
      value: vi.fn(async () => null),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(state.os, "recordData", {
      value: vi.fn(async () => ({ success: true })),
      configurable: true,
      writable: true,
    });
  }

  /**
   * Gives the state a signed-in user. `userId` is a computed off the session
   * key, so it can't be assigned — but the managers read `login.userId` off the
   * same object at call time, so swapping the property reaches all of them.
   * Signed in is the default here because it's the case these tests are about;
   * the signed-out ones say so explicitly.
   */
  function signIn(userId: string | null = "user-1") {
    Object.defineProperty(state.login, "userId", {
      value: signal(userId),
      configurable: true,
      writable: true,
    });
  }

  /** Spy on the login prompt so a test can assert it never opens. */
  function watchLoginPrompt() {
    const prompt = vi.fn(async () => null);
    Object.defineProperty(state.login, "login", {
      value: prompt,
      configurable: true,
      writable: true,
    });
    return prompt;
  }

  /**
   * Minimal stand-in for a joined session. The toolbar only reaches for
   * permissions, the highlight duration, and the shared-decoration removal
   * during this flow; `sharedSession` is otherwise handed to lazily-opened
   * modals.
   */
  function attachFakeSession({
    canDecorate = true,
    highlightDurationSeconds = 16 as number | null,
  } = {}) {
    const removeSharedDecoration = vi.fn((decorationId: string) => {
      readingStateOf().removeDecoration(decorationId);
    });
    const options = signal({
      allowedNavigators: null,
      allowedDecorators: canDecorate ? null : ["someone-else"],
      hostUserId: "host-user",
      coHostUserIds: null,
      highlightDurationSeconds,
      shareTranslation: true,
      endedAt: null,
    });
    const tab = state.app.currentReadingState.value!.tab;
    tab.sharedSession = {
      id: "group-abc",
      options,
      localSessionId: signal("user-1"),
      userCanDecorate: () => canDecorate,
      userCanNavigate: () => true,
      isHost: () => canDecorate,
      removeSharedDecoration,
      readingState: tab.readingState,
      allUsers: signal([]),
      connectedUsers: signal([]),
      currentUser: signal(null),
      document: {} as never,
      updateOptions: vi.fn(),
      dispose: vi.fn(),
    } as unknown as NonNullable<typeof tab.sharedSession>;
    return { removeSharedDecoration, options };
  }

  function readingStateOf() {
    return state.app.currentReadingState.value!.tab.readingState;
  }

  async function selectFirstVerse() {
    const readingState = readingStateOf();
    const chapter = readingState.chapterData.value!;
    const firstVerse = chapter.chapter.content.find(
      (entry): entry is ChapterVerse =>
        !!entry &&
        typeof entry === "object" &&
        (entry as { type?: string }).type === "verse"
    )!;

    await act(async () => {
      readingState.selectVerse(
        {
          bookId: chapter.book.id,
          chapterNumber: chapter.chapter.number,
          verse: firstVerse,
          translationId: chapter.translation.id,
        },
        10,
        10
      );
    });

    return { readingState, verseNumber: firstVerse.number };
  }

  async function renderToolbar() {
    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });
  }

  async function click(selector: string) {
    const element = container.querySelector<HTMLButtonElement>(selector);
    if (!element) {
      throw new Error(`No element matched ${selector}`);
    }
    await act(async () => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      // Highlighting is fire-and-forget from the handler and a signed-in save
      // waits on a record read first, so let that chain settle before asserting.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  /** Clicks the first preset colour, opening the picker first if it is closed. */
  async function openPickerAndHighlight() {
    if (!container.querySelector(".sb-verse-toolbar-color-button")) {
      await click(".sb-verse-toolbar-highlight-trigger");
    }
    await click(".sb-verse-toolbar-color-button");
  }

  const clearButton = () =>
    container.querySelector<HTMLButtonElement>(".sb-verse-toolbar-clear");

  /**
   * The session's broadcast copies only. Other decorations sit on these verses
   * too (the reader diminishes deep-linked verses, for one), and clear neither
   * removes them nor should be enabled by them.
   */
  const broadcastHighlights = () =>
    readingStateOf().decorations.value.filter((decoration) =>
      decoration.id.startsWith("shared-highlight:")
    );

  it("removes the saved highlight when clearing outside a session", async () => {
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    expect(readingState.highlights.value.highlights).toHaveLength(1);

    await click(".sb-verse-toolbar-clear");

    expect(readingState.highlights.value.highlights).toHaveLength(0);
  });

  it("broadcasts without saving when the session expires highlights", async () => {
    attachFakeSession({ highlightDurationSeconds: 16 });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    // The timer owns the lifetime. Saving too would outlive the broadcast and
    // leave the author alone in seeing it.
    expect(broadcastHighlights()).toHaveLength(1);
    expect(readingState.highlights.value.highlights).toHaveLength(0);
  });

  it("saves as well as broadcasts when the session keeps highlights forever", async () => {
    attachFakeSession({ highlightDurationSeconds: null });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    // Nothing expires it, so the author keeps a personal copy for after the
    // session. Participants get the broadcast, not a highlight of their own.
    expect(broadcastHighlights()).toHaveLength(1);
    expect(readingState.highlights.value.highlights).toHaveLength(1);
  });

  it("keeps a personal highlight the author already had when broadcasting with a timer", async () => {
    // Highlight under ∞ (saved), then switch the session to a finite duration
    // and re-highlight the same verse.
    const { options } = attachFakeSession({ highlightDurationSeconds: null });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();
    expect(readingState.highlights.value.highlights).toHaveLength(1);

    await act(async () => {
      options.value = { ...options.value, highlightDurationSeconds: 16 };
    });
    await openPickerAndHighlight();

    // The broadcast covers the saved highlight while it lives and uncovers it
    // on expiry. Deleting it here meant highlighting a verse you had already
    // highlighted destroyed your own colour once the timer ran out.
    expect(readingState.highlights.value.highlights).toHaveLength(1);
    expect(broadcastHighlights()).toHaveLength(1);
  });

  it("broadcasts without prompting a signed-out user to log in, even with no expiry", async () => {
    signIn(null);
    const prompt = watchLoginPrompt();
    attachFakeSession({ highlightDurationSeconds: null });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    // Broadcasting only needs a connection id. Reaching for the save path would
    // open the login modal over a highlight the session is already carrying.
    expect(broadcastHighlights()).toHaveLength(1);
    expect(readingState.highlights.value.highlights).toHaveLength(0);
    expect(prompt).not.toHaveBeenCalled();
  });

  it("does not prompt a signed-out user to log in when clearing a broadcast-only highlight", async () => {
    signIn(null);
    attachFakeSession({ highlightDurationSeconds: 16 });
    await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    // Nothing was ever saved, so clearing has no write to make — and asking for
    // an account to undo something that never persisted is pure interruption.
    const prompt = watchLoginPrompt();
    await click(".sb-verse-toolbar-clear");

    expect(broadcastHighlights()).toHaveLength(0);
    expect(prompt).not.toHaveBeenCalled();
  });

  it("does not apply a highlight a signed-out user declines to log in for", async () => {
    signIn(null);
    const prompt = watchLoginPrompt();
    // Restricted participant: saving is the only thing highlighting can mean.
    attachFakeSession({ canDecorate: false });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    expect(prompt).toHaveBeenCalled();
    // The highlight used to appear behind the modal and then never save.
    expect(readingState.highlights.value.highlights).toHaveLength(0);
  });

  it("saves a personal highlight instead, when not allowed to broadcast", async () => {
    attachFakeSession({ canDecorate: false });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    // Nobody else sees this one, so it behaves like any highlight made outside
    // a session. Previously a restricted participant got neither branch and
    // highlighting silently did nothing.
    expect(readingState.highlights.value.highlights).toHaveLength(1);
    expect(broadcastHighlights()).toHaveLength(0);
  });

  it("removes the broadcast copy when clearing in a session", async () => {
    const { removeSharedDecoration } = attachFakeSession();
    const { verseNumber } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    expect(broadcastHighlights()).toHaveLength(1);

    await click(".sb-verse-toolbar-clear");

    expect(removeSharedDecoration).toHaveBeenCalledWith(
      `shared-highlight:GEN:1:${verseNumber}`
    );
    expect(broadcastHighlights()).toHaveLength(0);
  });

  it("also clears a personal highlight left on the verses while in a session", async () => {
    // Highlight with no permission to broadcast (saved personally), then gain
    // it — the saved highlight is still on the verse and clear has to take it.
    attachFakeSession({ canDecorate: false });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();
    expect(readingState.highlights.value.highlights).toHaveLength(1);

    attachFakeSession({ canDecorate: true });
    await renderToolbar();
    await click(".sb-verse-toolbar-clear");

    expect(readingState.highlights.value.highlights).toHaveLength(0);
  });

  it("keeps clear enabled for a participant who cannot broadcast", async () => {
    attachFakeSession({ canDecorate: false });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    expect(broadcastHighlights()).toHaveLength(0);
    expect(readingState.highlights.value.highlights).toHaveLength(1);
    expect(clearButton()?.disabled).toBe(false);
  });

  it("disables clear in a session once the broadcast copy has expired", async () => {
    attachFakeSession();
    const { readingState, verseNumber } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();

    // Stand in for the session's highlight timer firing. Nothing was saved, so
    // the verse is genuinely unhighlighted again and there is nothing to clear.
    await act(async () => {
      readingState.removeDecoration(`shared-highlight:GEN:1:${verseNumber}`);
    });

    expect(readingState.highlights.value.highlights).toHaveLength(0);
    expect(clearButton()?.disabled).toBe(true);
  });

  it("leaves clear disabled in a session when nothing is highlighted", async () => {
    attachFakeSession();
    await selectFirstVerse();
    await renderToolbar();
    await click(".sb-verse-toolbar-highlight-trigger");

    expect(clearButton()?.disabled).toBe(true);
  });
});

describe("BibleReaderToolbar mobile More menu", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    // `viewportWidth` is seeded from `window.innerWidth` when the state is
    // created, so this has to be set before `createTestSeedBibleState`.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
  });

  async function renderToolbar(): Promise<{
    state: SeedBibleState;
    moreButton: HTMLButtonElement;
  }> {
    const state = await createTestSeedBibleState();

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const moreButton = container.querySelector<HTMLButtonElement>(
      ".sb-reader-toolbar-more-anchor button"
    );
    if (!moreButton) {
      throw new Error("The mobile More button did not render.");
    }
    return { state, moreButton };
  }

  const menu = () => container.querySelector(".sb-mobile-more-menu");

  async function openMenu(moreButton: HTMLButtonElement): Promise<void> {
    await act(async () => {
      moreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu()).not.toBeNull();
  }

  it("closes when a tap lands outside the menu", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    await act(async () => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });

  it("stays open while the tap is inside the menu", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    const item = container.querySelector(".sb-mobile-more-menu-item");
    expect(item).not.toBeNull();

    await act(async () => {
      item!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    // Menu items close the menu through their own click handler, not through the
    // outside-tap listener — so the pointerdown alone must leave it open.
    expect(menu()).not.toBeNull();
  });

  it("lets the dismissing tap through to whatever it landed on", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    // Stands in for a verse or a top quick-toolbar button: the tap that closes
    // the menu must still reach its target and do its job.
    const outside = document.createElement("button");
    const onClick = vi.fn();
    outside.addEventListener("click", onClick);
    document.body.appendChild(outside);

    await act(async () => {
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(menu()).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it("closes on Escape and returns focus to the More button", async () => {
    const { moreButton } = await renderToolbar();
    moreButton.focus();
    await openMenu(moreButton);

    // A keyboard user tabs into the menu before deciding to back out, so focus
    // is inside the popover — which is about to be removed from the document.
    const item = container.querySelector<HTMLButtonElement>(
      ".sb-mobile-more-menu-item"
    );
    item!.focus();
    expect(document.activeElement).toBe(item);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(menu()).toBeNull();
    // Without this, focus is left on the removed popover and the next Tab press
    // restarts from the top of the document.
    expect(document.activeElement).toBe(moreButton);
  });

  it("stops listening once the menu is closed", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    // Close it the ordinary way, by tapping the button again.
    await act(async () => {
      moreButton.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      moreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu()).toBeNull();

    // A later Escape must not be picked up by a listener that should have been
    // torn down — and must not reopen or otherwise disturb anything.
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });
});
