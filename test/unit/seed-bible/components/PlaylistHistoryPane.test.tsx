import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { PlaylistHistoryPane } from "@packages/seed-bible/seed-bible/components/PlaylistHistoryPane/PlaylistHistoryPane";
import type { PlaylistPlayHistory } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Mock } from "vitest";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

vi.mock(
  "@packages/seed-bible/seed-bible/components/ContextMenu/ContextMenu",
  () => ({
    closeContextMenus: vi.fn(),
    ContextMenuItem: ({
      children,
      onClick,
      className,
    }: {
      children: ComponentChildren;
      onClick?: (event: MouseEvent) => void;
      className?: string;
    }) => (
      <button
        className={className}
        onClick={(event) => onClick?.(event as unknown as MouseEvent)}
        role="menuitem"
      >
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
      onClick?: (event: MouseEvent) => void;
    }) => (
      <div className="stub-context-menu-anchor">
        <button
          className={buttonClassName}
          onClick={(event) => onClick?.(event as unknown as MouseEvent)}
        >
          menu
        </button>
        <div>{children}</div>
      </div>
    ),
  })
);

function createHistoryEntry(
  overrides: Partial<PlaylistPlayHistory> = {}
): PlaylistPlayHistory {
  return {
    id: "hist-1",
    recordName: "user-1",
    userId: "user-1",
    playlistId: "playlist-1",
    playlistRecordName: "user-1",
    playlistTitle: "Shared Study",
    playlistDescription: null,
    previousHistoryId: null,
    totalSteps: 4,
    currentStep: 1,
    lastItem: {
      type: "bible-verse",
      ref: { bookId: "JHN", chapter: 3, verse: 16 },
    },
    startedAtMs: 1_000,
    endedAtMs: 1_000 + 65_000,
    durationMs: 65_000,
    createdAtMs: 1_000,
    updatedAtMs: 1_000 + 65_000,
    ...overrides,
  };
}

function createState(history: PlaylistPlayHistory[]) {
  const playFromHistory = vi.fn().mockResolvedValue(undefined);
  const removePlayHistory = vi.fn().mockResolvedValue(undefined);
  const toast = vi.fn();
  const state = {
    playlists: {
      userPlaylistHistory: signal(history),
      userPlaylists: signal([]),
      playFromHistory,
      removePlayHistory,
    },
    tabs: {
      tabs: signal([]),
      selectedTabId: signal(null),
    },
    app: { toast },
  } as unknown as SeedBibleState;

  return {
    state,
    playFromHistory,
    removePlayHistory,
    toast,
  };
}

describe("PlaylistHistoryPane", () => {
  let container: HTMLDivElement;
  let onLeave: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onLeave = vi.fn(() => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(state: SeedBibleState) {
    act(() => {
      render(
        <PlaylistHistoryPane state={state} onLeave={onLeave} />,
        container
      );
    });
  }

  it("shows an empty message when there is no history", () => {
    const { state } = createState([]);
    renderPane(state);

    expect(container.querySelector(".sb-playlist-history-item")).toBeNull();
    expect(container.textContent).toContain(
      "Playlists you listen to will show up here."
    );
  });

  it("lists a session with its progress and continues from the play button", async () => {
    const entry = createHistoryEntry();
    const { state, playFromHistory } = createState([entry]);
    renderPane(state);

    const item = container.querySelector(
      ".sb-playlist-history-item"
    ) as HTMLLIElement;
    expect(item.querySelector(".sb-discover-item-title")?.textContent).toBe(
      "Shared Study"
    );
    expect(
      item.querySelector(".sb-discover-item-description")?.textContent
    ).toMatch(/50% complete/);
    expect(
      item.querySelector(".sb-discover-item-description")?.textContent
    ).toContain("JHN 3:16");

    const play = item.querySelector(
      ".sb-discover-item-play"
    ) as HTMLButtonElement;
    expect(play.getAttribute("aria-label")).toBe("Continue");

    await act(async () => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(playFromHistory).toHaveBeenCalledWith(entry);
  });

  it("replays a completed session", async () => {
    const entry = createHistoryEntry({ currentStep: 3, totalSteps: 4 });
    const { state, playFromHistory } = createState([entry]);
    renderPane(state);

    const play = container.querySelector(
      ".sb-playlist-history-item .sb-discover-item-play"
    ) as HTMLButtonElement;
    expect(play.getAttribute("aria-label")).toBe("Replay");

    await act(async () => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(playFromHistory).toHaveBeenCalledWith(entry);
  });

  it("removes a session without leaving the page", async () => {
    const entry = createHistoryEntry();
    const { state, removePlayHistory } = createState([entry]);
    renderPane(state);

    const remove = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    ).find((el) => el.textContent?.includes("Remove from history")) as
      | HTMLButtonElement
      | undefined;
    expect(remove).toBeDefined();

    await act(async () => {
      remove!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(removePlayHistory).toHaveBeenCalledWith(entry);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("toasts when the playlist cannot be opened", async () => {
    const entry = createHistoryEntry();
    const { state, playFromHistory, toast } = createState([entry]);
    playFromHistory.mockRejectedValueOnce(new Error("missing"));
    renderPane(state);

    const play = container.querySelector(
      ".sb-discover-item-play"
    ) as HTMLButtonElement;
    await act(async () => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(toast).toHaveBeenCalledWith(
      "Couldn't open that playlist. It may have been deleted."
    );
    expect(onLeave).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-spinner")).toBeNull();
  });

  it("shows a small spinner while a playlist is opening", async () => {
    let resolvePlay: () => void = () => {};
    const entry = createHistoryEntry();
    const { state, playFromHistory } = createState([entry]);
    playFromHistory.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePlay = resolve;
      })
    );
    renderPane(state);

    const play = container.querySelector(
      ".sb-discover-item-play"
    ) as HTMLButtonElement;
    act(() => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(play.getAttribute("aria-busy")).toBe("true");
    expect(play.querySelector(".sb-spinner")).not.toBeNull();
    expect(onLeave).not.toHaveBeenCalled();

    act(() => {
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(playFromHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePlay();
    });
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(play.querySelector(".sb-spinner")).toBeNull();
  });
});
