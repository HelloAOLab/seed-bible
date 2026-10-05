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
import type { TabsManager } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { fakeSharedPermissions, ME } from "./fakeSharedPermissions";

/**
 * The real friends and notes managers over one `CasualOSManager`, signed in
 * as `ME`, with only the server stood in for: `friendIds` are friends on the
 * fake shared-permissions server, and `notes` holds each user's notes by user
 * ID, as the records server lists them. Resolves once the friends list has
 * loaded; the friends manager is disposed when the test finishes.
 *
 * For component tests whose state is otherwise mocked, so a friend's notes
 * reach the component the way the app loads them rather than through a stub.
 */
export async function createRealFriendNotes(options: {
  friendIds: string[];
  notes?: Record<string, Annotation[]>;
  discover?: DiscoverManager;
}) {
  const { friendIds, notes = {} } = options;
  const os = CasualOSManager();
  vi.spyOn(os, "listDataByMarker").mockImplementation((async (
    recordName: string,
    _marker: string,
    lastAddress?: string
  ) => ({
    success: true,
    items: lastAddress
      ? []
      : (notes[recordName] ?? []).map((note) => ({
          address: note.id,
          data: note,
        })),
  })) as never);
  vi.spyOn(os, "getData").mockResolvedValue({
    success: false,
    errorCode: "data_not_found",
  } as never);

  const login = {
    userId: signal<string | null>(ME),
    login: vi.fn().mockResolvedValue(null),
    getPublicProfile: vi.fn().mockResolvedValue({ name: "", pictureUrl: null }),
    // What a note's author line reads its name from.
    getUserProfile: vi.fn().mockResolvedValue({ name: "" }),
  } as unknown as LoginManager;
  const server = fakeSharedPermissions(os, () => login.userId.peek());
  for (const id of friendIds) {
    server.friendsWith(id);
  }
  const friends = createFriendsManager(os, login);
  onTestFinished(() => friends.dispose());
  await vi.waitFor(() => expect(friends.friendIds.value).toEqual(friendIds));

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
