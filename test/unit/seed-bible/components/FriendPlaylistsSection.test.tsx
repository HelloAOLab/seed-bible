import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { FriendPlaylistsSection } from "@packages/seed-bible/seed-bible/components/Discover/FriendPlaylistsSection";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { AppState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createDiscoverManager,
  type DiscoverManager,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  createPlaylistManager,
  type Playlist,
  type PlaylistManager,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";
import { createBibleReadingExtensionManager } from "@packages/seed-bible/seed-bible/managers/BibleReadingExtensionManager";
import { createAudioPlaybackManager } from "@packages/seed-bible/seed-bible/managers/AudioPlaybackManager";
import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { ChatsManager } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { Friend } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { createRealFriendContent } from "../testUtils/realFriendContent";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function createPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: "My Playlist",
    description: null,
    items: [],
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides,
  };
}

/**
 * The real playlist manager over the `os` and `login` from
 * `createRealFriendContent`, with the app pieces it needs alongside.
 */
function createRealPlaylists(
  os: CasualOSManager,
  login: LoginManager,
  discover: DiscoverManager
): PlaylistManager {
  const navigation = createNavigationManager();
  return createPlaylistManager(
    os,
    login,
    // No reader tab: nothing here plays into one.
    {
      tabs: signal([]),
      selectedTabId: signal(null),
    } as unknown as TabsManager,
    navigation,
    signal(false),
    createModalManager(),
    createI18nManager(navigation, ["en"]),
    createBibleReadingExtensionManager(),
    discover,
    { addContext: vi.fn(), removeContext: vi.fn() } as unknown as ChatsManager,
    createAudioPlaybackManager()
  );
}

describe("FriendPlaylistsSection", () => {
  let container: HTMLDivElement;

  const ada: Friend = { userId: "ada", name: "Ada", pictureUrl: null };
  const bob: Friend = { userId: "bob", name: "Bob", pictureUrl: null };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  const friendsSection = () =>
    Array.from(container.querySelectorAll(".sb-discover-section")).find((el) =>
      el.textContent?.includes("Playlists from your friends")
    ) ?? null;
  const groupNames = () =>
    Array.from(
      container.querySelectorAll(".sb-friend-playlists-group-name")
    ).map((el) => el.textContent);

  /** Opens a playlist row's menu, which is portaled to <body>. */
  const openRowMenu = () => {
    act(() => {
      friendsSection()!
        .querySelector<HTMLButtonElement>(".sb-context-menu-button")!
        .click();
    });
    return Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
  };

  /**
   * The section with the real friends and playlist managers, signed in with
   * `friends` as friends and `friendPlaylists` on the server, once each
   * friend's playlists have been read.
   */
  const renderWithFriends = async (
    friends: Friend[],
    friendPlaylists: Record<string, Playlist[]>
  ) => {
    const discover = createDiscoverManager();
    const content = await createRealFriendContent({
      friendIds: friends.map((f) => f.userId),
      names: Object.fromEntries(friends.map((f) => [f.userId, f.name ?? ""])),
      playlists: friendPlaylists,
      discover,
    });
    const playlists = createRealPlaylists(content.os, content.login, discover);
    const modals = createModalManager();
    // The share sheet itself is covered by PlaylistShare.test.tsx; here only
    // that Share opens it is checked, which needs no more of the app.
    const app = { toast: vi.fn() } as unknown as AppState;
    act(() => {
      render(
        <FriendPlaylistsSection
          friends={content.friends}
          playlists={playlists}
          modals={modals}
          app={app}
        />,
        container
      );
    });
    await vi.waitFor(() => {
      for (const friend of friends) {
        expect(content.os.listDataByMarker).toHaveBeenCalledWith(
          friend.userId,
          "publicRead:playlists",
          undefined
        );
      }
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    return { ...content, playlists, modals };
  };

  it("lists each friend's playlists under their name, leaving out friends with none", async () => {
    await renderWithFriends([ada, bob], {
      ada: [
        createPlaylist({
          id: "p1",
          recordName: "ada",
          title: "Psalms of Ascent",
        }),
      ],
    });

    expect(groupNames()).toEqual(["Ada"]);
    expect(friendsSection()?.textContent).toContain("Psalms of Ascent");
  });

  it("is left out when no friend has a playlist", async () => {
    await renderWithFriends([ada], {});

    expect(friendsSection()).toBeNull();
  });

  it("opens a friend's playlist on its page when play is pressed", async () => {
    const { playlists } = await renderWithFriends([ada], {
      ada: [
        createPlaylist({
          id: "p1",
          recordName: "ada",
          title: "Psalms of Ascent",
        }),
      ],
    });

    act(() => {
      friendsSection()!
        .querySelector<HTMLButtonElement>(".sb-discover-item-play")!
        .click();
    });

    expect(playlists.playlistPage.value?.item).toMatchObject({
      id: "p1",
      recordName: "ada",
    });
    expect(playlists.playing.value).toBeNull();
  });

  it("shares a friend's playlist, and offers nothing to edit or delete it", async () => {
    const { modals } = await renderWithFriends([ada], {
      ada: [createPlaylist({ id: "p1", recordName: "ada" })],
    });
    const items = openRowMenu();

    expect(items.map((el) => el.textContent)).toEqual([
      expect.stringContaining("Share"),
    ]);
    await act(async () => {
      items[0]!.click();
    });

    // The share sheet opens rather than the link being copied outright.
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(modals.modals.value.map((m) => m.id)).toEqual([
      "share-playlist-ada-p1",
    ]);
  });

  it("shows a friend's playlist cover, as your own playlists do", async () => {
    await renderWithFriends([ada], {
      ada: [
        createPlaylist({
          id: "p1",
          recordName: "ada",
          heroImageUrl: "https://example.com/cover.jpg",
        }),
      ],
    });

    expect(friendsSection()!.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/cover.jpg"
    );
  });

  it("drops a friend's playlists once you unfriend them", async () => {
    const { friends } = await renderWithFriends([ada, bob], {
      ada: [
        createPlaylist({
          id: "p1",
          recordName: "ada",
          title: "Psalms of Ascent",
        }),
      ],
      bob: [createPlaylist({ id: "p2", recordName: "bob", title: "Gospels" })],
    });
    expect(groupNames()).toEqual(["Ada", "Bob"]);

    await act(() => friends.unfriend("ada"));

    expect(groupNames()).toEqual(["Bob"]);
    expect(friendsSection()?.textContent).not.toContain("Psalms of Ascent");
  });
});
