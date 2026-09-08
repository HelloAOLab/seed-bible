import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { Sidebar } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import {
  DEFAULT_BOOKMARK_CATEGORY,
  type Bookmark,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createDefaultManagerResponseMap,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";
import { TestHost } from "./TestHost";

vi.mock("../components/ContextMenu", () => ({
  closeContextMenus: vi.fn(),
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ComponentChildren;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  ),
  ContextMenuWithButton: ({
    children,
    buttonClassName,
    onClick,
  }: {
    children: ComponentChildren;
    buttonClassName?: string;
    onClick?: () => void;
  }) => (
    <div>
      <button className={buttonClassName} onClick={onClick}>
        Menu
      </button>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("../components/SettingsPage", () => ({
  SettingsPage: () => <div>Settings Page</div>,
}));

vi.mock("../components/SidebarSearch", () => ({
  SidebarSearch: () => <div>Sidebar Search</div>,
}));

/** Narrow enough that `app.isMobile` reports true. */
const MOBILE_VIEWPORT_WIDTH = 400;

const EXODUS_2_BOOKMARK: Bookmark = {
  id: "bookmark-exodus-2",
  translationId: "AAB",
  bookId: "EXO",
  chapterNumber: 2,
  createdAt: 0,
  category: DEFAULT_BOOKMARK_CATEGORY,
};

const EXODUS_2_VERSE_BOOKMARK: Bookmark = {
  ...EXODUS_2_BOOKMARK,
  id: "bookmark-exodus-2-verse-3",
  verse: 3,
};

// A tab created after startup resolves its data against the app's default
// (private) endpoint, so the bookmark's chapter has to be mocked there too.
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

function createResponses() {
  return {
    ...createDefaultManagerResponseMap(),
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeUrl("/api/AAB/EXO/2.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "EXO", 2)
    ),
  };
}

/**
 * The bookmark list normally arrives from the records server for a logged-in
 * user. Swap in a fixed list at that boundary so the test can drive the real
 * bookmarks UI (and the real tab/navigation managers) without an auth round
 * trip.
 */
function seedBookmarks(state: SeedBibleState, bookmarks: Bookmark[]): void {
  Object.defineProperty(state.bookmarks, "bookmarks", {
    value: signal(bookmarks),
    configurable: true,
  });
}

describe("opening a bookmark from the mobile sidebar", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let originalInnerWidth: number;

  beforeEach(async () => {
    originalInnerWidth = window.innerWidth;
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState({ responses: createResponses() });

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    seedBookmarks(state, [EXODUS_2_BOOKMARK]);
    // The mobile Bookmarks screen: the drawer is open with the bookmark filter
    // on, which is what the bottom Bookmarks tab does.
    state.bookmarks.openedFromToolbar.value = true;
    state.bookmarks.isFilterActive.value = true;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
    window.localStorage.clear();
  });

  async function renderSidebar(): Promise<void> {
    await act(async () => {
      render(
        <TestHost state={state}>
          <Sidebar state={state} />
        </TestHost>,
        container
      );
    });
  }

  async function tapBookmark(): Promise<void> {
    const button = container.querySelector<HTMLButtonElement>(
      ".sb-bookmark-item-button"
    );
    expect(button).not.toBeNull();
    await act(async () => {
      button!.click();
    });
  }

  it("costs a single history entry and leaves the entry behind it intact", async () => {
    expect(state.app.isMobile.value).toBe(true);

    // Opening the drawer is its own history entry (`?sidebar=open`), the one
    // the back button should return to.
    await act(async () => {
      state.sidebar.openSidebar();
    });
    const sidebarEntryHref = window.location.href;
    expect(sidebarEntryHref).toContain("genesis/1");
    expect(sidebarEntryHref).toContain("sidebar=open");

    await renderSidebar();

    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    await tapBookmark();
    await waitFor(() => window.location.pathname.includes("exodus/2"), 2000);

    // One push for the bookmark, and nothing rewriting the entry that opened
    // the drawer: a `replace` there would stamp Exodus 2 onto it, so going
    // back would land on the chapter the user is already reading.
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain("sidebar=open");
    expect(window.location.pathname).toContain("exodus/2");

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it("costs a single history entry when a tab is already open at the bookmark", async () => {
    // Second tap on the same bookmark: the tab exists now, so this takes the
    // "select the open tab" path instead of creating one.
    await act(async () => {
      state.sidebar.openSidebar();
    });
    await renderSidebar();
    await tapBookmark();
    await waitFor(() => window.location.pathname.includes("exodus/2"), 2000);

    await act(async () => {
      state.sidebar.openSidebar();
    });
    const sidebarEntryHref = window.location.href;
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    await tapBookmark();
    await waitFor(() => !window.location.href.includes("sidebar=open"), 2000);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toContain("exodus/2");

    pushSpy.mockRestore();
    replaceSpy.mockRestore();

    await act(async () => {
      window.history.back();
    });
    await waitFor(() => window.location.href === sidebarEntryHref, 2000);
    expect(window.location.href).toBe(sidebarEntryHref);
  });

  it("costs a single history entry when a bookmark with a verse opens in an already-open tab", async () => {
    // The existing-tab branch reaches the verse through an async
    // `selectTranslationAndChapter()` that resolves after the batch has already
    // flushed, so whatever it writes to the URL escapes the batch. It costs no
    // entry today only because the tab is matched on chapter and the verse
    // never reaches the URL, leaving that write with nothing to change — an
    // invariant worth pinning, since either half of it could change.
    seedBookmarks(state, [EXODUS_2_VERSE_BOOKMARK]);

    await act(async () => {
      state.sidebar.openSidebar();
    });
    await renderSidebar();
    await tapBookmark();
    await waitFor(() => window.location.pathname.includes("exodus/2"), 2000);

    await act(async () => {
      state.sidebar.openSidebar();
    });
    const sidebarEntryHref = window.location.href;
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    await tapBookmark();
    await waitFor(() => !window.location.href.includes("sidebar=open"), 2000);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toContain("exodus/2");

    pushSpy.mockRestore();
    replaceSpy.mockRestore();

    await act(async () => {
      window.history.back();
    });
    await waitFor(() => window.location.href === sidebarEntryHref, 2000);
    expect(window.location.href).toBe(sidebarEntryHref);
  });

  it("returns to the sidebar over the previous chapter when going back", async () => {
    const readerEntryHref = window.location.href;
    expect(readerEntryHref).toContain("genesis/1");

    await act(async () => {
      state.sidebar.openSidebar();
    });
    const sidebarEntryHref = window.location.href;

    await renderSidebar();
    await tapBookmark();
    await waitFor(() => window.location.pathname.includes("exodus/2"), 2000);

    await act(async () => {
      window.history.back();
    });
    await waitFor(() => window.location.href === sidebarEntryHref, 2000);

    expect(window.location.href).toBe(sidebarEntryHref);
    expect(window.location.pathname).toContain("genesis/1");

    // ...and back once more lands on the chapter the user was reading before
    // they ever opened the sidebar.
    await act(async () => {
      window.history.back();
    });
    await waitFor(() => !window.location.href.includes("sidebar=open"), 2000);

    expect(window.location.href).toBe(readerEntryHref);
  });
});
