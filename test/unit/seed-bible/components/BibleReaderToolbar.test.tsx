import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { TODAY_PANE_ID } from "@packages/seed-bible/seed-bible/managers/TodayManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import { resetFlingSafeTapForTests } from "@packages/seed-bible/seed-bible/app/flingSafeTap";
import { TestHost } from "./TestHost";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";

// The real implementation dynamically imports `dompurify`, which resolves
// after the `act()` that mounts `AnnotationPreview` — mocked synchronously
// here, same as `DiscoverPane.test.tsx`, so its `useEffect` settles inline.
vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  setSafeHtml: vi.fn(async (html: string, element: HTMLElement) => {
    element.innerHTML = html;
  }),
}));

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

  it("clears the verse selection when a tap lands in empty chapter-content space (not on a verse)", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();
    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();

    // Stands in for the real `.sb-chapter-content` BibleReader renders (not
    // mounted in this unit test) — its padding, the gaps between verse spans,
    // and section headings all sit inside this container but outside any
    // `.sb-verse` span, and a tap there should count as "outside" the verse.
    const chapterContent = document.createElement("div");
    chapterContent.className = "sb-chapter-content";
    document.body.appendChild(chapterContent);

    try {
      await act(async () => {
        chapterContent.dispatchEvent(
          new window.PointerEvent("pointerdown", { bubbles: true })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(0);
    } finally {
      chapterContent.remove();
    }
  });

  it("does not clear the verse selection when a tap lands on a verse's rendered text", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    // The decorator span is what actually wraps a verse's rendered words (see
    // `.sb-verse-decorator` in `BibleReader.tsx`) — a real tap on the text
    // lands here, not merely somewhere inside the outer `.sb-verse` span.
    const verse = document.createElement("span");
    verse.className = "sb-verse";
    const decorator = document.createElement("span");
    decorator.className = "sb-verse-decorator";
    verse.appendChild(decorator);
    document.body.appendChild(verse);

    try {
      await act(async () => {
        decorator.dispatchEvent(
          new window.PointerEvent("pointerdown", { bubbles: true })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(1);
    } finally {
      verse.remove();
    }
  });

  it("clears the verse selection when a mouse tap lands in a poetry verse's blank space (not on its text)", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    // A poetry verse's outer span is `display: block` (`.sb-verse-poetry` in
    // `BibleReader.inline.css`), so it spans the full content width even when
    // its actual text — wrapped in the nested `.sb-verse-decorator` — is much
    // narrower. Tapping that outer span directly (not the decorator) stands
    // in for a mouse click that lands in the blank margin past a short line,
    // which should count as "outside" the verse, not "on" it — a mouse click
    // is precise enough that missing the text is a deliberate miss.
    const verse = document.createElement("span");
    verse.className = "sb-verse sb-verse-poetry";
    const decorator = document.createElement("span");
    decorator.className = "sb-verse-decorator";
    verse.appendChild(decorator);
    document.body.appendChild(verse);

    try {
      await act(async () => {
        verse.dispatchEvent(
          new window.PointerEvent("pointerdown", {
            bubbles: true,
            pointerType: "mouse",
          })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(0);
    } finally {
      verse.remove();
    }
  });

  it("does not clear the verse selection when a touch tap lands in a poetry verse's blank space", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    // Same blank-space scenario as the mouse case above, but a finger is far
    // less precise than a mouse pointer — there's no "blank space" inside a
    // verse's box that a touch could deliberately miss the text into the way
    // a mouse click could. A touch tap here should keep the original,
    // forgiving behavior of the whole `.sb-verse` block rather than clearing
    // the selection out from under the finger that just placed it.
    const verse = document.createElement("span");
    verse.className = "sb-verse sb-verse-poetry";
    const decorator = document.createElement("span");
    decorator.className = "sb-verse-decorator";
    verse.appendChild(decorator);
    document.body.appendChild(verse);

    try {
      await act(async () => {
        verse.dispatchEvent(
          new window.PointerEvent("pointerdown", {
            bubbles: true,
            pointerType: "touch",
          })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(1);
    } finally {
      verse.remove();
    }
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

describe("BibleReaderToolbar — verse selection vs. side panes", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    // Desktop viewport: a "side" pane (e.g. Discover) docks beside the
    // reader instead of covering it, so `isVerseToolbarVisible` stays true
    // and the outside-click listener stays attached while the pane is open.
    window.innerWidth = 1200;
    window.innerHeight = 900;

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

  it("does not clear the verse selection when a tap lands inside a side pane docked beside the reader", async () => {
    expect(state.app.isMobile.value).toBe(false);

    const readingState = await selectFirstVerse();
    await renderToolbar();
    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();

    await act(async () => {
      state.panes.openPane({
        placement: "side",
        title: "Discover",
        component: () => <div className="test-side-pane-body" />,
      });
    });

    // Stands in for the actual side-pane shell PaneLayout's `SidePane`
    // renders (not mounted in this unit test) - a tap on the real Discover
    // pane (e.g. composing an annotation) lands inside the same wrapper.
    const sidePane = document.createElement("div");
    sidePane.className = "sb-pane-side-shell";
    document.body.appendChild(sidePane);

    try {
      await act(async () => {
        sidePane.dispatchEvent(
          new window.PointerEvent("pointerdown", { bubbles: true })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(1);
    } finally {
      sidePane.remove();
    }
  });

  it("does not clear the verse selection when a tap lands inside a floating pane", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    await act(async () => {
      state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });

    // Stands in for the real overlay pane shell `PaneLayout.tsx` renders for
    // a floating/fullscreen pane (not mounted in this unit test) — it, unlike
    // an ordinary reader tab slot, carries the `-detached` modifier.
    const floatingPane = document.createElement("div");
    floatingPane.className = "sb-pane-shell sb-pane-shell-detached";
    document.body.appendChild(floatingPane);

    try {
      await act(async () => {
        floatingPane.dispatchEvent(
          new window.PointerEvent("pointerdown", { bubbles: true })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(1);
    } finally {
      floatingPane.remove();
    }
  });

  it("clears the verse selection when a tap lands in the reader's own tab slot (not on a verse)", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    // Stands in for the plain `.sb-pane-shell` every reader tab slot renders
    // in `TabsLayout.tsx` — it carries the same base class as a detached
    // overlay pane but none of the `-detached` modifier, so a tap here (on
    // empty reader space, not a verse) should count as "outside" and close
    // the toolbar, not be mistaken for a tap inside a covering pane.
    const readerSlot = document.createElement("div");
    readerSlot.className = "sb-pane-shell sb-pane-slot-1";
    document.body.appendChild(readerSlot);

    try {
      await act(async () => {
        readerSlot.dispatchEvent(
          new window.PointerEvent("pointerdown", { bubbles: true })
        );
      });

      expect(readingState.selectedVerses.value).toHaveLength(0);
    } finally {
      readerSlot.remove();
    }
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

  /**
   * Opens the highlight colour picker if it is closed. The picker (and the
   * "Clear" button, which lives inside it) auto-closes whenever the
   * selection is cleared, so this has to run again after every highlight —
   * highlighting always clears the selection (#1704).
   */
  async function openPicker() {
    if (!container.querySelector(".sb-verse-toolbar-color-button")) {
      await click(".sb-verse-toolbar-highlight-trigger");
    }
  }

  /** Clicks the first preset colour, opening the picker first if it is closed. */
  async function openPickerAndHighlight() {
    await openPicker();
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

    // Highlighting clears the selection (and with it, the verse toolbar) —
    // reselect the verse and reopen the picker to bring the clear button
    // back before clicking it.
    await selectFirstVerse();
    await openPicker();
    await click(".sb-verse-toolbar-clear");

    expect(readingState.highlights.value.highlights).toHaveLength(0);
  });

  it("clears the verse selection and closes the toolbar after applying a highlight", async () => {
    const { readingState } = await selectFirstVerse();
    await renderToolbar();

    expect(readingState.selectedVerses.value).toHaveLength(1);
    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();

    await openPickerAndHighlight();

    expect(readingState.highlights.value.highlights).toHaveLength(1);
    expect(readingState.selectedVerses.value).toHaveLength(0);
    expect(container.querySelector(".sb-verse-toolbar")).toBeNull();
  });

  it("clears the verse selection and closes the toolbar after clearing a highlight", async () => {
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();
    expect(readingState.highlights.value.highlights).toHaveLength(1);

    // Highlighting already cleared the selection — reselect it and reopen the
    // picker to bring the clear button back.
    await selectFirstVerse();
    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();
    await openPicker();

    await click(".sb-verse-toolbar-clear");

    expect(readingState.highlights.value.highlights).toHaveLength(0);
    expect(readingState.selectedVerses.value).toHaveLength(0);
    expect(container.querySelector(".sb-verse-toolbar")).toBeNull();
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
    // Highlighting cleared the selection made above — reselect the verse to
    // re-highlight it.
    await selectFirstVerse();
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
    // Highlighting cleared the selection — reselect it and reopen the picker
    // to bring the clear button back.
    await selectFirstVerse();
    await openPicker();

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

    // Highlighting cleared the selection — reselect it and reopen the picker
    // to bring the clear button back.
    await selectFirstVerse();
    await openPicker();
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
    // Highlighting cleared the selection — reselect it and reopen the picker
    // to bring the clear button back.
    await selectFirstVerse();
    await openPicker();
    await click(".sb-verse-toolbar-clear");

    expect(readingState.highlights.value.highlights).toHaveLength(0);
  });

  it("keeps clear enabled for a participant who cannot broadcast", async () => {
    attachFakeSession({ canDecorate: false });
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();
    // Highlighting cleared the selection — reselect it and reopen the picker
    // so the clear button is showing again to check.
    await selectFirstVerse();
    await openPicker();

    expect(broadcastHighlights()).toHaveLength(0);
    expect(readingState.highlights.value.highlights).toHaveLength(1);
    expect(clearButton()?.disabled).toBe(false);
  });

  it("disables clear in a session once the broadcast copy has expired", async () => {
    attachFakeSession();
    const { readingState, verseNumber } = await selectFirstVerse();
    await renderToolbar();
    await openPickerAndHighlight();
    // Highlighting cleared the selection — reselect it and reopen the picker
    // so the clear button is showing again to check.
    await selectFirstVerse();
    await openPicker();

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

  /**
   * Fires the native colour input's `input` event, as the OS colour dialog
   * would while the user drags. (Preact rewrites this input's `onChange` to
   * also listen for the native `input` event rather than `change` — see
   * `preact/compat`'s `onChangeInputType` — so both of the component's
   * `onChange`/`onInput` handlers respond to this, same as a real browser.)
   */
  function dragCustomColor(value: string) {
    const input = container.querySelector<HTMLInputElement>(
      ".sb-verse-toolbar-color-input"
    );
    if (!input) {
      throw new Error("No element matched .sb-verse-toolbar-color-input");
    }
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /**
   * Blurs the colour input, as closing the native colour dialog would.
   * (Preact rewrites `onBlur` to listen for the native `focusout` event.)
   */
  function closeCustomColorDialog() {
    const input = container.querySelector<HTMLInputElement>(
      ".sb-verse-toolbar-color-input"
    );
    if (!input) {
      throw new Error("No element matched .sb-verse-toolbar-color-input");
    }
    input.dispatchEvent(new Event("focusout", { bubbles: true }));
  }

  it("applies a live-dragged custom color without clearing the selection, clearing only once the dialog closes", async () => {
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPicker();

    // Fake timers only start now — `click()` (used by `openPicker()`) awaits
    // a real `setTimeout`, which would never resolve once timers are faked.
    vi.useFakeTimers();
    try {
      // The OS colour dialog fires `input` continuously while dragging.
      await act(async () => {
        dragCustomColor("#112233");
        await vi.advanceTimersByTimeAsync(300);
      });

      // The debounced live-drag commit applies the color, but the selection
      // (and picker) stays open so the user can keep adjusting the shade —
      // clearing here would silently drop any further tweaking (#1725).
      expect(readingState.highlights.value.highlights).toHaveLength(1);
      expect(readingState.highlights.value.highlights[0]?.customColor).toBe(
        "#112233"
      );
      expect(readingState.selectedVerses.value).toHaveLength(1);
      expect(
        container.querySelector(".sb-verse-toolbar-color-input")
      ).not.toBeNull();

      // Still dragging — another live commit updates the color and still
      // doesn't clear the selection.
      await act(async () => {
        dragCustomColor("#334455");
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(readingState.highlights.value.highlights).toHaveLength(1);
      expect(readingState.highlights.value.highlights[0]?.customColor).toBe(
        "#334455"
      );
      expect(readingState.selectedVerses.value).toHaveLength(1);

      // The dialog closes: the color already settled 300ms ago, so this just
      // clears the selection, same as any other highlight action.
      await act(async () => {
        closeCustomColorDialog();
      });

      expect(readingState.highlights.value.highlights).toHaveLength(1);
      expect(readingState.highlights.value.highlights[0]?.customColor).toBe(
        "#334455"
      );
      expect(readingState.selectedVerses.value).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flushes a still-pending custom color immediately when the dialog closes before the debounce settles", async () => {
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPicker();

    vi.useFakeTimers();
    try {
      // Pick a color and close the dialog right away, well inside the 300ms
      // debounce window — the pending pick shouldn't be lost to the delay.
      await act(async () => {
        dragCustomColor("#112233");
        closeCustomColorDialog();
      });

      expect(readingState.highlights.value.highlights).toHaveLength(1);
      expect(readingState.highlights.value.highlights[0]?.customColor).toBe(
        "#112233"
      );
      expect(readingState.selectedVerses.value).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves the selection untouched when the color dialog closes without picking a color", async () => {
    const { readingState } = await selectFirstVerse();
    await renderToolbar();
    await openPicker();

    await act(async () => {
      closeCustomColorDialog();
    });

    expect(readingState.highlights.value.highlights).toHaveLength(0);
    expect(readingState.selectedVerses.value).toHaveLength(1);
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

    // `viewportWidth` seeds to match the server's UA-based guess (never
    // `window.innerWidth`) so a hydrate pass can't mismatch — see
    // `SeedBibleStateManager.tsx`. The real correction happens once, from a
    // post-mount effect that calls `applyViewport()`; the closest
    // equivalent here is the same `resize` dispatch the sibling describe
    // block above already uses.
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

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

  it("does not include Share, which lives in the chapter header on mobile", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    const labels = Array.from(
      container.querySelectorAll(".sb-mobile-more-menu-label")
    ).map((el) => el.textContent);

    expect(labels).not.toContain("Share");
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

describe("BibleReaderToolbar — mobile Bible tab", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
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
    bibleButton: HTMLButtonElement;
  }> {
    const state = await createTestSeedBibleState();

    // `viewportWidth` seeds from the server's UA-based guess, never
    // `window.innerWidth`, so it has to be corrected the same way the real
    // post-mount effect does — see `SeedBibleStateManager.tsx`.
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const bibleButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        ".sb-reader-toolbar-mobile-tab-button"
      )
    ).find((button) => button.getAttribute("aria-label") === "Bible");
    if (!bibleButton) {
      throw new Error("The mobile Bible tab did not render.");
    }
    return { state, bibleButton };
  }

  async function tap(button: HTMLButtonElement): Promise<void> {
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  it("opens the book selector when the Bible text is already showing", async () => {
    const { state, bibleButton } = await renderToolbar();
    expect(state.selector.isOpen.value).toBe(false);

    await tap(bibleButton);

    await waitFor(() => state.selector.isOpen.value === true);
  });

  it("shows the Bible text instead of the selector when another screen covers the reader", async () => {
    const { state, bibleButton } = await renderToolbar();

    await act(async () => {
      state.sidebar.openSearchPanel();
    });
    expect(state.sidebar.isSearchPanelOpen.value).toBe(true);

    await tap(bibleButton);

    expect(state.sidebar.isSearchPanelOpen.value).toBe(false);
    expect(state.selector.isOpen.value).toBe(false);
  });
});

/**
 * Height jsdom reports for the sheet's overflow row. jsdom does no layout, so
 * every element measures 0 and the sheet would believe it has nothing to reveal.
 */
const OVERFLOW_HEIGHT = 120;

describe("BibleReaderToolbar — mobile verse sheet drag", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let readingState: BibleReadingState;
  let originalScrollHeight: PropertyDescriptor | undefined;

  beforeEach(async () => {
    // Mobile viewport, so the verse toolbar renders as the bottom sheet.
    window.innerWidth = 400;
    window.innerHeight = 800;

    originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight"
    );
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains("sb-verse-toolbar-overflow-row")
          ? OVERFLOW_HEIGHT
          : 0;
      },
    });

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState({
      responses: createPrivateEndpointResponses(),
    });

    // The default tool set renders exactly one row here (highlight, bookmark,
    // copy, share), so there would be nothing to drag open. Two extra tools push
    // it past a row, which is the case the gesture exists for.
    for (const id of ["test-extra-one", "test-extra-two"]) {
      state.tools.registerVerseToolbarTool({
        id,
        priority: 500,
        title: id,
        icon: () => <span className="material-symbols-outlined">star</span>,
        onSelect: () => {},
      });
    }

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        originalScrollHeight
      );
    }
  });

  async function renderSheet() {
    readingState = state.app.currentReadingState.value!.tab.readingState;
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

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const handle = container.querySelector<HTMLElement>(
      ".sb-verse-toolbar-handle-area"
    );
    if (!handle) throw new Error("The verse sheet handle did not render.");
    return handle;
  }

  const sheet = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-mobile");
  const overflow = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-overflow");
  const hint = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-swipe-hint");

  async function press(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          pointerId: 1,
          clientY,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  async function moveTo(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointermove", {
          pointerId: 1,
          clientY,
          bubbles: true,
        })
      );
    });
  }

  async function release(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointerup", {
          pointerId: 1,
          clientY,
          bubbles: true,
        })
      );
    });
  }

  it("starts collapsed, with the swipe hint in place of a More button", async () => {
    await renderSheet();

    expect(overflow()?.style.height).toBe("0px");
    expect(hint()).not.toBeNull();
    expect(hint()?.textContent).toContain("Swipe up to see more");
    // The card that used to carry this job is gone — the hint replaced it.
    expect(container.querySelector(".sb-verse-toolbar-more-toggle")).toBeNull();
  });

  it("expands the sheet when the swipe-up hint is tapped", async () => {
    await renderSheet();
    const hintEl = hint()!;

    expect(overflow()?.style.height).toBe("0px");

    await press(hintEl, 500);
    await release(hintEl, 500);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(hint()).toBeNull();
  });

  it("opens the drawer by the distance the finger has travelled when dragging the swipe-up hint", async () => {
    await renderSheet();
    const hintEl = hint()!;

    await press(hintEl, 500);
    await moveTo(hintEl, 460);

    // Same drag-tracks-the-finger behavior as the handle itself.
    expect(overflow()?.style.height).toBe("40px");
    expect(sheet()?.className).toContain("sb-verse-sheet-dragging");

    await moveTo(hintEl, 420);
    expect(overflow()?.style.height).toBe("80px");

    await release(hintEl, 420);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
  });

  it("expands the sheet when dragged from the panel background, not just the handle", async () => {
    await renderSheet();
    // The panel element itself, rather than the handle or the swipe hint —
    // stands in for a finger landing on empty space in the sheet.
    const panel = sheet()!;

    await press(panel, 500);
    await moveTo(panel, 460);

    expect(overflow()?.style.height).toBe("40px");
    expect(sheet()?.className).toContain("sb-verse-sheet-dragging");

    // Past halfway, so releasing settles it fully open.
    await moveTo(panel, 400);
    await release(panel, 400);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
  });

  it("does not start the sheet drag when pressing down on a toolbar button", async () => {
    await renderSheet();
    const closeButton = container.querySelector<HTMLElement>(
      ".sb-verse-toolbar-close"
    );
    if (!closeButton) throw new Error("The close button did not render.");

    await press(closeButton, 500);
    await moveTo(closeButton, 460);

    expect(overflow()?.style.height).toBe("0px");
    expect(sheet()?.className).not.toContain("sb-verse-sheet-dragging");
  });

  it("keeps the closed drawer's actions out of the tab order", async () => {
    const handle = await renderSheet();

    // Clipped-but-focusable would let a keyboard land on invisible buttons.
    expect(overflow()?.className).toContain("sb-verse-toolbar-overflow-closed");

    await press(handle, 500);
    await moveTo(handle, 480);

    expect(overflow()?.className).not.toContain(
      "sb-verse-toolbar-overflow-closed"
    );
  });

  it("opens the drawer by the distance the finger has travelled", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 460);

    // The point of the rework: the drawer moves with the finger instead of
    // waiting for a threshold and jumping open.
    expect(overflow()?.style.height).toBe("40px");
    expect(sheet()?.className).toContain("sb-verse-sheet-dragging");

    await moveTo(handle, 420);
    expect(overflow()?.style.height).toBe("80px");
  });

  it("never opens the drawer further than its content", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 100);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
  });

  it("follows the finger back down again mid-drag", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 400);
    expect(overflow()?.style.height).toBe("100px");

    await moveTo(handle, 480);
    expect(overflow()?.style.height).toBe("20px");
  });

  it("settles open when released past halfway", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 500 - OVERFLOW_HEIGHT / 2 - 5);
    await release(handle, 500 - OVERFLOW_HEIGHT / 2 - 5);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(sheet()?.className).not.toContain("sb-verse-sheet-dragging");
    // Nothing left to reveal, so the hint stands down.
    expect(hint()).toBeNull();
  });

  it("falls back closed when released short of halfway", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 480);
    await release(handle, 480);

    expect(overflow()?.style.height).toBe("0px");
    expect(hint()).not.toBeNull();
  });

  it("closes an open drawer when dragged back down", async () => {
    const handle = await renderSheet();

    // Open it first.
    await press(handle, 500);
    await moveTo(handle, 300);
    await release(handle, 300);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    // Then drag most of the way back down.
    await press(handle, 300);
    await moveTo(handle, 300 + OVERFLOW_HEIGHT);
    expect(overflow()?.style.height).toBe("0px");
    await release(handle, 300 + OVERFLOW_HEIGHT);

    expect(overflow()?.style.height).toBe("0px");
  });

  it("continues straight into the dismiss slide when a single drag from expanded closes the drawer and keeps going", async () => {
    const handle = await renderSheet();

    // Open it first.
    await press(handle, 500);
    await moveTo(handle, 300);
    await release(handle, 300);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    // One continuous drag: closes the drawer, then keeps going and starts
    // sliding the sheet itself away — no release/re-press in between.
    await press(handle, 300);
    await moveTo(handle, 300 + OVERFLOW_HEIGHT + 40);

    expect(overflow()?.style.height).toBe("0px");
    expect(sheet()?.style.transform).toBe("translateY(40px)");

    await release(handle, 300 + OVERFLOW_HEIGHT + 40);
  });

  it("dismisses the selection from one continuous drag starting expanded", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 300);
    await release(handle, 300);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    await press(handle, 300);
    await moveTo(handle, 300 + OVERFLOW_HEIGHT + 100);
    await release(handle, 300 + OVERFLOW_HEIGHT + 100);

    expect(readingState.selectedVerses.value).toHaveLength(0);
  });

  it("toggles on a tap that barely moves", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 498);
    await release(handle, 498);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    await press(handle, 500);
    await release(handle, 500);

    expect(overflow()?.style.height).toBe("0px");
  });

  it("slides the whole sheet down when dragged down while collapsed", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 540);

    // Nothing to close, so the gesture becomes a dismiss and the sheet itself
    // follows the finger.
    expect(sheet()?.style.transform).toBe("translateY(40px)");
    expect(overflow()?.style.height).toBe("0px");
  });

  it("dismisses the selection when the sheet is dragged far enough down", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 600);
    await release(handle, 600);

    expect(readingState.selectedVerses.value).toHaveLength(0);
  });

  it("springs back and keeps the selection when the drag stops short", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 530);
    await release(handle, 530);

    expect(readingState.selectedVerses.value).toHaveLength(1);
    expect(sheet()?.style.transform).toBe("");
    expect(overflow()?.style.height).toBe("0px");
  });

  it("restores the starting state when the gesture is cancelled", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 380);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointercancel", {
          pointerId: 1,
          bubbles: true,
        })
      );
    });

    expect(overflow()?.style.height).toBe("0px");
    expect(readingState.selectedVerses.value).toHaveLength(1);
  });

  it("exposes the handle to keyboards, which have no gesture available", async () => {
    const handle = await renderSheet();

    expect(handle.getAttribute("role")).toBe("button");
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(handle.tabIndex).toBe(0);

    await act(async () => {
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(handle.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    });

    expect(overflow()?.style.height).toBe("0px");
  });
});

describe("BibleReaderToolbar — mobile verse sheet annotations", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let originalScrollHeight: PropertyDescriptor | undefined;

  beforeEach(async () => {
    // Mobile viewport, so the verse toolbar renders as the bottom sheet.
    window.innerWidth = 400;
    window.innerHeight = 800;

    originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight"
    );
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains("sb-verse-toolbar-overflow-row")
          ? OVERFLOW_HEIGHT
          : 0;
      },
    });

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
    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        originalScrollHeight
      );
    }
  });

  // `selectionAnnotations` now lives on the reading state itself (see
  // `BibleReadingManager.tsx`): it captures `getAnnotationsForChapter` off
  // an `AnnotationsManager` reference the reading state closed over at
  // construction time — reassigning `state.annotations` to a new object (a
  // spread copy) wouldn't reach that closure, so the method is mutated
  // in place on the existing object instead. The chapter was already
  // navigated to during `createTestSeedBibleState` in `beforeEach`, before
  // this mock exists, so swapping the method alone has no effect until
  // something re-runs `applyPosition` — re-selecting the same translation/
  // book/chapter does that unconditionally (see `selectTranslationAndChapter`),
  // which is what re-captures this mock.
  async function mockAnnotationsForChapter(annotations: Annotation[]) {
    const { readingState, chapter } = getFirstVerse();
    const annotationsSignal = signal(annotations);
    state.annotations.getAnnotationsForChapter = vi.fn(() => annotationsSignal);
    await act(async () => {
      await readingState.selectTranslationAndChapter(
        chapter.translation.id,
        chapter.book.id,
        chapter.chapter.number
      );
    });
  }

  function getFirstVerse() {
    const readingState = state.app.currentReadingState.value!.tab.readingState;
    const chapter = readingState.chapterData.value!;
    const firstVerse = chapter.chapter.content.find(
      (entry): entry is ChapterVerse =>
        !!entry &&
        typeof entry === "object" &&
        (entry as { type?: string }).type === "verse"
    )!;
    return { readingState, chapter, firstVerse };
  }

  async function renderSheet() {
    const { readingState, chapter, firstVerse } = getFirstVerse();

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

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const handle = container.querySelector<HTMLElement>(
      ".sb-verse-toolbar-handle-area"
    );
    if (!handle) throw new Error("The verse sheet handle did not render.");
    return { handle, chapter, firstVerse };
  }

  const overflow = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-overflow");
  const annotationItems = () =>
    container.querySelectorAll<HTMLElement>(
      ".sb-verse-toolbar-annotations .sb-annotation-item"
    );

  async function press(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          pointerId: 1,
          clientY,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  async function moveTo(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointermove", {
          pointerId: 1,
          clientY,
          bubbles: true,
        })
      );
    });
  }

  it("hides the annotation while collapsed and shows it once the sheet is expanded", async () => {
    const { chapter, firstVerse } = getFirstVerse();
    await mockAnnotationsForChapter([
      {
        id: "a1",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        data: { type: "comment", html: "<p>Note</p>" },
      },
    ]);
    const { handle } = await renderSheet();

    expect(annotationItems()).toHaveLength(1);
    expect(overflow()?.className).toContain("sb-verse-toolbar-overflow-closed");

    await press(handle, 500);
    await moveTo(handle, 460);

    expect(overflow()?.className).not.toContain(
      "sb-verse-toolbar-overflow-closed"
    );
    await vi.waitFor(() => {
      expect(annotationItems()[0]?.textContent).toContain("Note");
    });
  });

  it("makes the sheet openable from an annotation alone, even with the default tool cards fitting in one row", async () => {
    const { chapter, firstVerse } = getFirstVerse();
    // The default verse toolbar tools already overflow one row on their own
    // in this environment, so this asserts the weaker but still meaningful
    // claim: with an annotation present, the sheet has something to open.
    await mockAnnotationsForChapter([
      {
        id: "a1",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        data: { type: "comment", html: "<p>Note</p>" },
      },
    ]);
    const { handle } = await renderSheet();

    expect(handle.tabIndex).toBe(0);
    expect(overflow()).not.toBeNull();
  });

  it("excludes a whole-chapter annotation (no verse targeting) from the expanded sheet", async () => {
    const { chapter } = getFirstVerse();
    await mockAnnotationsForChapter([
      {
        id: "a1",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: null,
        data: { type: "comment", html: "<p>Whole chapter note</p>" },
      },
    ]);
    const { handle } = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 460);

    expect(annotationItems()).toHaveLength(0);
  });

  it("groups annotations by verse range, like the Discover pane", async () => {
    const { chapter, firstVerse } = getFirstVerse();
    await mockAnnotationsForChapter([
      {
        id: "a1",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        data: { type: "comment", html: "<p>Just this verse</p>" },
      },
      {
        id: "a2",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        endVerseNumber: firstVerse.number + 1,
        data: { type: "comment", html: "<p>A short range</p>" },
      },
    ]);
    const { handle } = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 460);

    const groupTitles = Array.from(
      container.querySelectorAll(
        ".sb-verse-toolbar-annotations .sb-annotation-group-header-title"
      )
    ).map((el) => el.textContent);
    expect(groupTitles).toHaveLength(2);

    await vi.waitFor(() => {
      expect(annotationItems()[0]?.textContent).toContain("Just this verse");
      expect(annotationItems()[1]?.textContent).toContain("A short range");
    });
  });

  it("shows a generic account icon on the current user's notes when nobody else has annotated the selection", async () => {
    state.highlights.getChapterHighlights = vi.fn(() =>
      signal({ highlights: [] })
    );
    state.login.userId = signal("toolbar-user-self");
    state.login.getUserProfile = vi.fn().mockResolvedValue({});

    const { chapter, firstVerse } = getFirstVerse();
    await mockAnnotationsForChapter([
      {
        id: "a1",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        data: {
          type: "comment",
          html: "<p>Mine</p>",
          userId: "toolbar-user-self",
        },
      },
    ]);
    const { handle } = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 460);

    await vi.waitFor(() => {
      expect(
        container.querySelector(
          ".sb-verse-toolbar-annotations .sb-tab-user-icon-generic"
        )
      ).not.toBeNull();
    });
    expect(
      container.querySelector(
        ".sb-verse-toolbar-annotations .sb-tab-user-icon-generic"
      )?.textContent
    ).toContain("account_circle");
    expect(
      container.querySelector(
        ".sb-verse-toolbar-annotations .sb-tab-user-icon-animal"
      )
    ).toBeNull();
  });

  it("shows the animal fallback on verse-sheet notes when other people have also annotated the selection", async () => {
    state.highlights.getChapterHighlights = vi.fn(() =>
      signal({ highlights: [] })
    );
    state.login.userId = signal("toolbar-user-self");
    state.login.getUserProfile = vi.fn().mockResolvedValue({});

    const { chapter, firstVerse } = getFirstVerse();
    await mockAnnotationsForChapter([
      {
        id: "a1",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        data: {
          type: "comment",
          html: "<p>Mine</p>",
          userId: "toolbar-user-self",
        },
      },
      {
        id: "a2",
        bookId: chapter.book.id,
        chapterNumber: chapter.chapter.number,
        verseNumber: firstVerse.number,
        data: {
          type: "comment",
          html: "<p>Theirs</p>",
          userId: "toolbar-user-other",
        },
      },
    ]);
    const { handle } = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 460);

    await vi.waitFor(() => {
      expect(
        container.querySelectorAll(
          ".sb-verse-toolbar-annotations .sb-tab-user-icon-animal"
        )
      ).toHaveLength(2);
    });
    expect(
      container.querySelector(
        ".sb-verse-toolbar-annotations .sb-tab-user-icon-generic"
      )
    ).toBeNull();
  });
});

describe("BibleReaderToolbar floating chapter nav", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
    resetFlingSafeTapForTests();
  });

  async function renderToolbar(): Promise<{
    state: SeedBibleState;
    bookLabel: HTMLButtonElement;
  }> {
    const state = await createTestSeedBibleState();

    // `viewportWidth` seeds from the server's UA-based guess, never
    // `window.innerWidth`, so it has to be corrected the same way the real
    // post-mount effect does — see `SeedBibleStateManager.tsx`.
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const bookLabel = container.querySelector<HTMLButtonElement>(
      ".sb-reader-floating-nav-label"
    );
    if (!bookLabel) {
      throw new Error("The floating book/chapter label did not render.");
    }
    return { state, bookLabel };
  }

  const TAP_X = 100;
  const TAP_Y = 700;

  function touchEvent(type: "pointerdown" | "pointerup", x: number) {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "touch",
      clientX: x,
      clientY: TAP_Y,
    });
  }

  function tap(
    element: HTMLElement,
    options: { withClick?: boolean; releaseX?: number } = {}
  ) {
    element.dispatchEvent(touchEvent("pointerdown", TAP_X));
    element.dispatchEvent(touchEvent("pointerup", options.releaseX ?? TAP_X));
    if (options.withClick) {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  }

  it("opens the book selector on a tap that lands mid-scroll", async () => {
    const { state, bookLabel } = await renderToolbar();
    expect(state.selector.isOpen.value).toBe(false);

    // Chromium spends the tap that halts a momentum scroll on stopping it: the
    // pointer events arrive but no click follows, so a click-only control sits
    // there doing nothing until the page settles.
    await act(async () => {
      // The helper only treats a tap as fling-stop when a scroll was still
      // coasting; without that, it waits for `click`, which this gesture has
      // none of.
      document.body.dispatchEvent(new Event("scroll", { bubbles: false }));
      tap(bookLabel);
    });

    await waitFor(() => state.selector.isOpen.value);
  });

  it("opens the book selector on an ordinary tap", async () => {
    const { state, bookLabel } = await renderToolbar();

    await act(async () => {
      tap(bookLabel, { withClick: true });
    });

    await waitFor(() => state.selector.isOpen.value);
  });

  it("leaves the book selector closed when the tap becomes a swipe", async () => {
    const { state, bookLabel } = await renderToolbar();

    await act(async () => {
      tap(bookLabel, { releaseX: TAP_X + 140 });
      // Let anything the press started settle, so the assertion isn't just
      // beating an open that was on its way.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(state.selector.isOpen.value).toBe(false);
  });
});

/**
 * On mobile, the toolbar is the only way into the Today screen from the reader, and it had
 * no coverage at all — the migration replaced an install-on-demand path (and a
 * second, divergent copy in the sidebar) with a single `today.open()` call.
 */
describe("BibleReaderToolbar — the mobile Today tab", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    // Seeded into `viewportWidth` at creation, so it has to precede the state.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
  });

  async function renderToolbar() {
    const state = await createTestSeedBibleState();
    // `viewportWidth` seeds from the server's UA-based guess, never
    // `window.innerWidth`, so it has to be corrected the same way the real
    // post-mount effect does — see `SeedBibleStateManager.tsx`.
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });
    const tab = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Today"]'
    );
    if (!tab) throw new Error("The Today bottom tab did not render.");
    return { state, tab };
  }

  const tapTab = async (tab: HTMLButtonElement) => {
    await act(async () => {
      tab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  it("opens the Today screen when tapped", async () => {
    const { state, tab } = await renderToolbar();
    expect(state.today.isOpen.value).toBe(false);

    await tapTab(tab);

    expect(state.today.isOpen.value).toBe(true);
  });

  it("highlights itself while Today is open", async () => {
    const { state, tab } = await renderToolbar();
    const isActive = () =>
      container
        .querySelector('button[aria-label="Today"]')!
        .classList.contains("sb-reader-toolbar-mobile-tab-button-active");
    expect(isActive()).toBe(false);

    await tapTab(tab);
    expect(isActive()).toBe(true);

    // Closing from anywhere else has to un-highlight it too: the tab reads the
    // manager signal rather than tracking its own taps.
    await act(async () => state.today.close());
    expect(isActive()).toBe(false);
  });

  /**
   * An ordering guard. `openTodayScreen` closes what is on screen before
   * calling `today.open()`; swap those two and the close sweeps away the pane
   * Today just opened, so the tab does nothing visible. Both assertions below
   * have to hold at once to rule that out — verified by making the swap.
   *
   * It deliberately does *not* claim to cover `panes.closeAll()`: on a mobile
   * viewport `openPane` treats every pane as fullscreen and already evicts the
   * others, firing their `onClose` the same way, so removing that call changes
   * nothing observable here.
   */
  it("leaves Today as the only thing covering the reader", async () => {
    const { state, tab } = await renderToolbar();

    await act(async () => {
      state.panes.openPane({
        placement: "fullscreen",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });
    expect(state.panes.panes.value).toHaveLength(1);

    await tapTab(tab);

    expect(state.today.isOpen.value).toBe(true);
    const ids = state.panes.panes.value.map((pane) => pane.id);
    expect(ids).toContain(TODAY_PANE_ID);
    expect(ids).toHaveLength(1);
  });
});
