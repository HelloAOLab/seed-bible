import { signal, type Signal } from "@preact/signals";
import {
  createInvitationsManager,
  type AvailableSharedSession,
  type InvitationsManager,
} from "@packages/seed-bible/seed-bible/managers/InvitationsManager";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import type { Mock } from "vitest";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";

const REGISTRY_DOC_ID = "shared-sessions-registry";
const REGISTRY_DOC_DATA = "registry";
const FRIEND = "friend-host";

/**
 * Minimal fake of the Yjs shared map the registry stores its entries in.
 * Mirrors the `createMockSharedMap` helper in `SessionsManager.test.ts`.
 */
function createMockSharedMap(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const subscribers = new Set<() => void>();

  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: unknown) => {
      store.set(key, value);
      for (const subscriber of subscribers) subscriber();
    },
    delete: (key: string) => {
      store.delete(key);
      for (const subscriber of subscribers) subscriber();
    },
    forEach: (callback: (value: unknown, key: string) => void) => {
      for (const [key, value] of store.entries()) callback(value, key);
    },
    changes: {
      subscribe: (handler: () => void) => {
        subscribers.add(handler);
        return { unsubscribe: () => subscribers.delete(handler) };
      },
    },
  };
}

type RemoteClientEvent = {
  type: "client_connected" | "client_disconnected";
  client: { connectionId: string };
};

function createMockRemoteClients() {
  const subscribers = new Set<(event: RemoteClientEvent) => void>();
  return {
    subscribe: vi.fn((handler: (event: RemoteClientEvent) => void) => {
      subscribers.add(handler);
      return { unsubscribe: () => subscribers.delete(handler) };
    }),
    emit: (event: RemoteClientEvent) => {
      for (const subscriber of subscribers) subscriber(event);
    },
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("InvitationsManager", () => {
  let os: CasualOSManager;
  let getSharedDocumentMock: Mock;
  let mockMap: ReturnType<typeof createMockSharedMap>;
  let mockRemoteClients: ReturnType<typeof createMockRemoteClients>;
  let mockDocument: {
    getMap: Mock;
    transact: Mock;
    unsubscribe: Mock;
    remoteClients: { subscribe: Mock };
  };
  let userId: Signal<string | null>;
  let login: LoginManager;
  let server: ReturnType<typeof fakeSharedPermissions>;
  /** Public profiles by user ID; anyone else's has no name. */
  let profiles: Record<string, UserProfile>;
  let disposers: (() => void)[];

  beforeEach(() => {
    os = CasualOSManager();
    mockMap = createMockSharedMap();
    mockRemoteClients = createMockRemoteClients();
    mockDocument = {
      getMap: vi.fn(() => mockMap),
      transact: vi.fn((callback: () => void) => callback()),
      unsubscribe: vi.fn(),
      remoteClients: { subscribe: mockRemoteClients.subscribe },
    };
    getSharedDocumentMock = vi
      .spyOn(os, "getSharedDocument")
      .mockResolvedValue(mockDocument as unknown as SharedDocument);
    userId = signal<string | null>(ME);
    profiles = {};
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getPublicProfile: vi.fn(
        async (id: string) => profiles[id] ?? { name: "", pictureUrl: null }
      ),
      getUserProfile: vi.fn().mockResolvedValue({ name: "" } as UserProfile),
    } as unknown as LoginManager;
    server = fakeSharedPermissions(os, () => userId.peek());
    disposers = [];
  });

  afterEach(() => {
    for (const dispose of disposers) dispose();
    vi.restoreAllMocks();
  });

  /**
   * The real friends manager over the fake server, signed in as `account`
   * (or signed out) with `friendIds` as friends, and the invitations manager
   * on top of it. Waits for the friends lists to load first, unless told not
   * to, as the app's startup doesn't.
   */
  const start = async ({
    account = ME as string | null,
    friendIds = [] as string[],
    onJoin = vi.fn(),
    waitForFriends = true,
  } = {}): Promise<{
    friends: FriendsManager;
    manager: InvitationsManager;
  }> => {
    userId.value = account;
    for (const id of friendIds) {
      server.friendsWith(id, account ?? ME);
    }
    const friends = createFriendsManager(os, login);
    disposers.push(friends.dispose);
    if (account && waitForFriends) {
      await vi.waitFor(() => {
        expect(friends.isLoading.value).toBe(false);
        expect(friends.friendIds.value).toEqual(friendIds);
      });
    }
    const manager = createInvitationsManager(os, login, friends, onJoin);
    disposers.push(manager.dispose);
    return { friends, manager };
  };

  /** Holds the next friends listing's answer until the returned call. */
  const holdFriendsListing = () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const listRecords = server.spies.listRecords.getMockImplementation()!;
    server.spies.listRecords.mockImplementationOnce(async () => {
      const records = await listRecords();
      await gate;
      return records;
    });
    return release;
  };

  /** A session `FRIEND` is hosting live from connection `conn-1`. */
  const friendHostsLive = () => {
    mockRemoteClients.emit({
      type: "client_connected",
      client: { connectionId: "conn-1" },
    });
    mockMap.set("session-1", {
      sessionId: "session-1",
      hostUserId: FRIEND,
      hostConnectionId: "conn-1",
      publishedAt: 100,
    });
  };

  describe("opening the registry", () => {
    // Regression coverage: an earlier version opened the registry
    // unconditionally whenever `window` was defined — which is true in the
    // jsdom test environment too, so every test that constructed this manager
    // opened a real (mocked-away-in-prod-but-not-in-CI) WebSocket connection in
    // the background. That surfaced as unrelated uncaught exceptions across the
    // whole suite. The registry must stay closed until there is something to
    // gain from opening it.
    it("does not open while signed out", async () => {
      await start({ account: null });
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("does not open while signed in with no friends", async () => {
      await start();
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("opens once signed in with at least one friend", async () => {
      await start({ friendIds: [FRIEND] });
      await flushPromises();

      expect(getSharedDocumentMock).toHaveBeenCalledWith(
        null,
        REGISTRY_DOC_ID,
        REGISTRY_DOC_DATA
      );
    });

    it("opens once a signed-in user with no friends gains one", async () => {
      const { friends } = await start();
      await flushPromises();
      expect(getSharedDocumentMock).not.toHaveBeenCalled();

      server.friendsWith(FRIEND);
      await friends.refresh();
      await flushPromises();

      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1);
    });

    // The registry is public, so a host nobody can see shouldn't be listed in
    // it (or connect to it) just because they started a shared session.
    it("publishSession neither opens the registry nor publishes while signed in with no friends", async () => {
      const { manager } = await start();

      await manager.publishSession({ id: "session-1" } as any);

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
      expect(mockMap.get("session-1")).toBeUndefined();
    });

    it("publishSession neither opens the registry nor publishes while signed out", async () => {
      const { manager } = await start({ account: null });

      await manager.publishSession({ id: "session-1" } as any);

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
      expect(mockMap.get("session-1")).toBeUndefined();
    });
  });

  describe("filtering available sessions", () => {
    it("surfaces only sessions hosted by a friend, excluding self and dismissed entries", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });
      await flushPromises();

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-friend" },
      });
      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-stranger" },
      });
      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-self" },
      });

      mockMap.set("session-friend", {
        sessionId: "session-friend",
        hostUserId: FRIEND,
        hostConnectionId: "conn-friend",
        publishedAt: 100,
      });
      mockMap.set("session-stranger", {
        sessionId: "session-stranger",
        hostUserId: "stranger-host",
        hostConnectionId: "conn-stranger",
        publishedAt: 200,
      });
      mockMap.set("session-self", {
        sessionId: "session-self",
        hostUserId: ME,
        hostConnectionId: "conn-self",
        publishedAt: 300,
      });

      expect(manager.availableSessions.value.map((s) => s.sessionId)).toEqual([
        "session-friend",
      ]);
    });

    it("hides an entry whose host is no longer connected", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });
      await flushPromises();

      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: FRIEND,
        hostConnectionId: "conn-1",
        publishedAt: 100,
      });

      // Never marked connected, so it stays hidden — a stale entry left
      // behind by a host who closed without unpublishing.
      expect(manager.availableSessions.value).toEqual([]);

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-1" },
      });
      expect(manager.availableSessions.value.map((s) => s.sessionId)).toEqual([
        "session-1",
      ]);

      mockRemoteClients.emit({
        type: "client_disconnected",
        client: { connectionId: "conn-1" },
      });
      expect(manager.availableSessions.value).toEqual([]);
    });

    it("dismissAvailableSession hides an entry for this client only", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });
      await flushPromises();
      friendHostsLive();
      const entry: AvailableSharedSession = manager.availableSessions.value[0]!;

      manager.dismissAvailableSession(entry);

      expect(manager.availableSessions.value).toEqual([]);
    });

    it("hides a session once its host is unfriended", async () => {
      const { friends, manager } = await start({ friendIds: [FRIEND] });
      await flushPromises();
      friendHostsLive();
      expect(manager.availableSessions.value).toHaveLength(1);

      await friends.unfriend(FRIEND);

      expect(manager.availableSessions.value).toEqual([]);
    });
  });

  describe("the host's profile", () => {
    it("shows the name and picture the friends list has, without fetching a profile", async () => {
      profiles[FRIEND] = {
        name: "Ada",
        pictureUrl: "https://example.com/ada.jpg",
      } as UserProfile;
      const { friends, manager } = await start({ friendIds: [FRIEND] });
      await vi.waitFor(() =>
        expect(friends.friends.value[0]?.name).toBe("Ada")
      );
      await flushPromises();

      friendHostsLive();

      expect(manager.availableSessions.value[0]?.hostProfile).toEqual({
        name: "Ada",
        pictureUrl: "https://example.com/ada.jpg",
      });
      expect(login.getUserProfile).not.toHaveBeenCalled();
    });

    it("fills in the name once the friends list has loaded their profile", async () => {
      let finishLookup!: () => void;
      const lookedUp = new Promise<void>((resolve) => (finishLookup = resolve));
      (login.getPublicProfile as Mock).mockImplementation(async () => {
        await lookedUp;
        return { name: "Ada", pictureUrl: null };
      });
      const { manager } = await start({ friendIds: [FRIEND] });
      await flushPromises();
      friendHostsLive();
      expect(manager.availableSessions.value[0]?.hostProfile?.name).toBeNull();

      finishLookup();

      await vi.waitFor(() =>
        expect(manager.availableSessions.value[0]?.hostProfile?.name).toBe(
          "Ada"
        )
      );
    });
  });

  describe("publishSession / unpublishSession", () => {
    it("publishes under the signed-in user's id", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });

      await manager.publishSession({ id: "session-1" } as any);

      expect(mockMap.get("session-1")).toMatchObject({
        sessionId: "session-1",
        hostUserId: ME,
        hostConnectionId: os.connectionId,
      });
    });

    it("does not publish when the host signs out while the registry is connecting", async () => {
      let finishOpening!: () => void;
      const opened = new Promise<void>((resolve) => {
        finishOpening = resolve;
      });
      getSharedDocumentMock.mockImplementation(async () => {
        await opened;
        return mockDocument as unknown as SharedDocument;
      });
      const { manager } = await start({ friendIds: [FRIEND] });

      const publishing = manager.publishSession({ id: "session-1" } as any);
      userId.value = null;
      finishOpening();
      await publishing;

      expect(mockMap.get("session-1")).toBeUndefined();
    });

    // Sessions are published once, when they're created. On startup the
    // friends list is still loading, so without a later publish a session
    // created then would never reach anyone.
    it("publishes a session hosted while the friends list is still loading, once it loads", async () => {
      const release = holdFriendsListing();
      const { manager } = await start({
        friendIds: [FRIEND],
        waitForFriends: false,
      });

      await manager.publishSession({ id: "session-1" } as any);
      expect(mockMap.get("session-1")).toBeUndefined();

      release();

      await vi.waitFor(() =>
        expect(mockMap.get("session-1")).toMatchObject({
          sessionId: "session-1",
          hostUserId: ME,
        })
      );
    });

    it("publishes a session hosted before the first friend, once there is one", async () => {
      const { friends, manager } = await start();
      await manager.publishSession({ id: "session-1" } as any);
      expect(mockMap.get("session-1")).toBeUndefined();

      server.friendsWith(FRIEND);
      await friends.refresh();

      await vi.waitFor(() =>
        expect(mockMap.get("session-1")).toMatchObject({ hostUserId: ME })
      );
    });

    it("publishes a session created while signed out once the host signs in", async () => {
      server.friendsWith(FRIEND);
      const { manager } = await start({ account: null });

      await manager.publishSession({ id: "session-1" } as any);
      userId.value = ME;

      await vi.waitFor(() =>
        expect(mockMap.get("session-1")).toMatchObject({ hostUserId: ME })
      );
    });

    it("lists the session under the new account after switching accounts", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });
      await manager.publishSession({ id: "session-1" } as any);
      server.friendsWith("their-friend", "other-account");

      userId.value = "other-account";

      await vi.waitFor(() =>
        expect(mockMap.get("session-1")).toMatchObject({
          hostUserId: "other-account",
        })
      );
    });

    // Otherwise friends keep seeing, and joining, a session whose host has
    // signed out.
    it("takes the session off the list when the host signs out, and lists it again when they sign back in", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });
      await manager.publishSession({ id: "session-1" } as any);
      expect(mockMap.get("session-1")).toBeDefined();

      userId.value = null;
      expect(mockMap.get("session-1")).toBeUndefined();

      userId.value = ME;
      await vi.waitFor(() =>
        expect(mockMap.get("session-1")).toMatchObject({ hostUserId: ME })
      );
    });

    it("takes the session off the list when the host's last friend is unfriended", async () => {
      const { friends, manager } = await start({ friendIds: [FRIEND] });
      await manager.publishSession({ id: "session-1" } as any);
      expect(mockMap.get("session-1")).toBeDefined();

      await friends.unfriend(FRIEND);

      expect(mockMap.get("session-1")).toBeUndefined();
    });

    it("doesn't publish a session that ended before it could be listed", async () => {
      const { friends, manager } = await start();
      await manager.publishSession({ id: "session-1" } as any);
      await manager.unpublishSession("session-1");

      server.friendsWith(FRIEND);
      await friends.refresh();
      await vi.waitFor(() => expect(getSharedDocumentMock).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMap.get("session-1")).toBeUndefined();
    });

    it("opens the registry once when a session is published while it's connecting", async () => {
      let finishOpening!: () => void;
      const opened = new Promise<void>((resolve) => {
        finishOpening = resolve;
      });
      getSharedDocumentMock.mockImplementation(async () => {
        await opened;
        return mockDocument as unknown as SharedDocument;
      });
      const { manager } = await start({ friendIds: [FRIEND] });

      const publishing = manager.publishSession({ id: "session-1" } as any);
      finishOpening();
      await publishing;

      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockMap.get("session-1")).toBeDefined();
    });

    it("removes the entry on unpublish", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });

      await manager.publishSession({ id: "session-1" } as any);
      expect(mockMap.get("session-1")).toBeDefined();

      await manager.unpublishSession("session-1");
      expect(mockMap.get("session-1")).toBeUndefined();
    });
  });

  describe("joinAvailableSession", () => {
    it("calls the join callback with the session id", async () => {
      const onJoin = vi.fn();
      const { manager } = await start({ onJoin });

      await manager.joinAvailableSession({
        sessionId: "session-1",
        hostUserId: FRIEND,
        hostProfile: null,
        publishedAt: 1,
      });

      expect(onJoin).toHaveBeenCalledWith("session-1");
    });
  });

  describe("dispose", () => {
    it("stops surfacing sessions and does not throw on further registry changes", async () => {
      const { manager } = await start({ friendIds: [FRIEND] });
      await flushPromises();

      manager.dispose();

      expect(() =>
        mockMap.set("session-1", {
          sessionId: "session-1",
          hostUserId: FRIEND,
          hostConnectionId: "conn-1",
          publishedAt: 100,
        })
      ).not.toThrow();
      expect(manager.availableSessions.value).toEqual([]);
    });
  });
});
