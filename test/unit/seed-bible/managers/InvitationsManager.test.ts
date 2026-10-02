import { signal, computed } from "@preact/signals";
import {
  createInvitationsManager,
  type AvailableSharedSession,
} from "@packages/seed-bible/seed-bible/managers/InvitationsManager";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type {
  Friend,
  FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import type { Mock } from "vitest";

const REGISTRY_DOC_ID = "shared-sessions-registry";
const REGISTRY_DOC_DATA = "registry";

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

function makeFriends(initial: Friend[] = []) {
  const friendList = signal<Friend[]>(initial);
  const manager = {
    friends: friendList,
    friendIds: computed(() => friendList.value.map((f) => f.userId)),
  } as unknown as FriendsManager;
  return { manager, friendList };
}

function makeLogin(userId: string | null = null) {
  return {
    userId: signal<string | null>(userId),
    getUserProfile: vi.fn().mockResolvedValue({ name: "" } as UserProfile),
  } as unknown as LoginManager;
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("opening the registry", () => {
    // Regression coverage: an earlier version opened the registry
    // unconditionally whenever `window` was defined — which is true in the
    // jsdom test environment too, so every test that constructed this manager
    // opened a real (mocked-away-in-prod-but-not-in-CI) WebSocket connection in
    // the background. That surfaced as unrelated uncaught exceptions across the
    // whole suite. The registry must stay closed until there is something to
    // gain from opening it.
    it("does not open while signed out, even with friends", async () => {
      const { manager: friends } = makeFriends([
        { userId: "other-1", name: null, pictureUrl: null },
      ]);
      createInvitationsManager(os, makeLogin(null), friends, vi.fn());
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("does not open while signed in with no friends", async () => {
      const { manager: friends } = makeFriends([]);
      createInvitationsManager(os, makeLogin("me"), friends, vi.fn());
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("opens once signed in with at least one friend", async () => {
      const { manager: friends } = makeFriends([
        { userId: "other-1", name: null, pictureUrl: null },
      ]);
      createInvitationsManager(os, makeLogin("me"), friends, vi.fn());
      await flushPromises();

      expect(getSharedDocumentMock).toHaveBeenCalledWith(
        null,
        REGISTRY_DOC_ID,
        REGISTRY_DOC_DATA
      );
    });

    it("opens once a signed-in user with no friends gains one", async () => {
      const { manager: friends, friendList } = makeFriends([]);
      createInvitationsManager(os, makeLogin("me"), friends, vi.fn());
      await flushPromises();
      expect(getSharedDocumentMock).not.toHaveBeenCalled();

      friendList.value = [{ userId: "other-1", name: null, pictureUrl: null }];
      await flushPromises();

      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1);
    });

    it("publishSession opens the registry even with no friends", async () => {
      const { manager: friends } = makeFriends([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("host"),
        friends,
        vi.fn()
      );

      await manager.publishSession({ id: "session-1" } as any);

      expect(getSharedDocumentMock).toHaveBeenCalledWith(
        null,
        REGISTRY_DOC_ID,
        REGISTRY_DOC_DATA
      );
    });
  });

  describe("filtering available sessions", () => {
    it("surfaces only sessions hosted by a friend, excluding self and dismissed entries", async () => {
      const { manager: friends } = makeFriends([
        {
          userId: "friend-host",
          name: null,
          pictureUrl: null,
        },
      ]);
      const login = makeLogin("me");
      const manager = createInvitationsManager(os, login, friends, vi.fn());
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
        hostUserId: "friend-host",
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
        hostUserId: "me",
        hostConnectionId: "conn-self",
        publishedAt: 300,
      });

      expect(manager.availableSessions.value.map((s) => s.sessionId)).toEqual([
        "session-friend",
      ]);
    });

    it("hides an entry whose host is no longer connected", async () => {
      const { manager: friends } = makeFriends([
        {
          userId: "friend-host",
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        friends,
        vi.fn()
      );
      await flushPromises();

      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: "friend-host",
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
      const { manager: friends } = makeFriends([
        {
          userId: "friend-host",
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        friends,
        vi.fn()
      );
      await flushPromises();

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-1" },
      });
      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: "friend-host",
        hostConnectionId: "conn-1",
        publishedAt: 100,
      });
      const entry: AvailableSharedSession = manager.availableSessions.value[0]!;

      manager.dismissAvailableSession(entry);

      expect(manager.availableSessions.value).toEqual([]);
    });

    it("re-filters when the friends list changes without a registry change", async () => {
      const { manager: friends, friendList } = makeFriends([
        {
          userId: "friend-host",
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        friends,
        vi.fn()
      );
      await flushPromises();

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-1" },
      });
      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: "friend-host",
        hostConnectionId: "conn-1",
        publishedAt: 100,
      });
      expect(manager.availableSessions.value).toHaveLength(1);

      friendList.value = [];
      expect(manager.availableSessions.value).toEqual([]);
    });
  });

  describe("publishSession / unpublishSession", () => {
    it("publishes under the signed-in user's id", async () => {
      const { manager: friends } = makeFriends([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("host-1"),
        friends,
        vi.fn()
      );

      await manager.publishSession({ id: "session-1" } as any);

      expect(mockMap.get("session-1")).toMatchObject({
        sessionId: "session-1",
        hostUserId: "host-1",
      });
    });

    it("falls back to the connection id when signed out", async () => {
      const { manager: friends } = makeFriends([]);
      const manager = createInvitationsManager(
        os,
        makeLogin(null),
        friends,
        vi.fn()
      );

      await manager.publishSession({ id: "session-1" } as any);

      expect(mockMap.get("session-1")).toMatchObject({
        sessionId: "session-1",
        hostUserId: os.connectionId,
      });
    });

    it("removes the entry on unpublish", async () => {
      const { manager: friends } = makeFriends([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("host-1"),
        friends,
        vi.fn()
      );

      await manager.publishSession({ id: "session-1" } as any);
      expect(mockMap.get("session-1")).toBeDefined();

      await manager.unpublishSession("session-1");
      expect(mockMap.get("session-1")).toBeUndefined();
    });
  });

  describe("joinAvailableSession", () => {
    it("calls the join callback with the session id", async () => {
      const onJoin = vi.fn();
      const { manager: friends } = makeFriends([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        friends,
        onJoin
      );

      await manager.joinAvailableSession({
        sessionId: "session-1",
        hostUserId: "host-1",
        hostProfile: null,
        publishedAt: 1,
      });

      expect(onJoin).toHaveBeenCalledWith("session-1");
    });
  });

  describe("dispose", () => {
    it("stops surfacing sessions and does not throw on further registry changes", async () => {
      const { manager: friends } = makeFriends([
        {
          userId: "friend-host",
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        friends,
        vi.fn()
      );
      await flushPromises();

      manager.dispose();

      expect(() =>
        mockMap.set("session-1", {
          sessionId: "session-1",
          hostUserId: "friend-host",
          hostConnectionId: "conn-1",
          publishedAt: 100,
        })
      ).not.toThrow();
      expect(manager.availableSessions.value).toEqual([]);
    });
  });
});
