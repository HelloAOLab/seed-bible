import { signal } from "@preact/signals";
import { onTestFinished } from "vitest";
import {
  createAnnotationsManager,
  type Annotation,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import {
  createDiscoverManager,
  type DiscoverManager,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { createFriendsManager } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { Playlist } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { fakeSharedPermissions, ME } from "./fakeSharedPermissions";

const PLAYLISTS_MARKER = "publicRead:playlists";

/**
 * The real friends and notes managers over one `CasualOSManager`, signed in
 * as `ME`, with only the server stood in for:
 * - `friendIds` are friends on the fake shared-permissions server, with the
 *   public profile names in `names`.
 * - `notes` and `playlists` hold each user's notes and playlists by user ID,
 *   as the records server lists them.
 *
 * Resolves once the friends list and their names have loaded; the friends
 * manager is disposed when the test finishes. A test that needs the real
 * playlist manager builds it over the returned `os` and `login`.
 *
 * For component tests whose state is otherwise mocked, so a friend's content
 * reaches the component the way the app loads it rather than through a stub.
 */
export async function createRealFriendContent(options: {
  friendIds: string[];
  names?: Record<string, string>;
  notes?: Record<string, Annotation[]>;
  playlists?: Record<string, Playlist[]>;
  discover?: DiscoverManager;
}) {
  const { friendIds, names = {}, notes = {}, playlists = {} } = options;
  const os = CasualOSManager();
  vi.spyOn(os, "listDataByMarker").mockImplementation((async (
    recordName: string,
    marker: string,
    lastAddress?: string
  ) => {
    const records: { id: string }[] =
      marker === PLAYLISTS_MARKER
        ? (playlists[recordName] ?? [])
        : (notes[recordName] ?? []);
    const items = lastAddress
      ? []
      : records.map((record) => ({ address: record.id, data: record }));
    return { success: true, items, totalCount: records.length };
  }) as never);
  vi.spyOn(os, "getData").mockResolvedValue({
    success: false,
    errorCode: "data_not_found",
  } as never);

  const login = {
    userId: signal<string | null>(ME),
    login: vi.fn().mockResolvedValue(null),
    getPublicProfile: vi.fn(async (id: string) => ({
      name: names[id] ?? "",
      pictureUrl: null,
    })),
    // What a note's author line reads its name from.
    getUserProfile: vi.fn().mockResolvedValue({ name: "" }),
  } as unknown as LoginManager;
  const server = fakeSharedPermissions(os, () => login.userId.peek());
  for (const id of friendIds) {
    server.friendsWith(id);
  }
  const friends = createFriendsManager(os, login);
  onTestFinished(() => friends.dispose());
  await vi.waitFor(() =>
    expect(friends.friends.value.map((f) => [f.userId, f.name ?? ""])).toEqual(
      friendIds.map((id) => [id, names[id] ?? ""])
    )
  );

  const tabs = {
    tabs: signal([]),
    selectedTabId: signal(null),
  } as unknown as TabsManager;
  const annotations = createAnnotationsManager(
    os,
    login,
    tabs,
    options.discover ?? createDiscoverManager(),
    undefined,
    { store: null }
  );

  return { os, login, server, friends, annotations };
}
