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
  FollowedUser,
  FollowsManager,
} from "@packages/seed-bible/seed-bible/managers/FollowsManager";
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

function makeFollows(initial: FollowedUser[] = []) {
  const following = signal<FollowedUser[]>(initial);
  const manager = {
    following,
    followingIds: computed(() => following.value.map((f) => f.userId)),
    isFollowing: (userId: string) =>
      computed(() => following.value.some((f) => f.userId === userId)),
    follow: vi.fn(),
    unfollow: vi.fn(),
    refreshProfiles: vi.fn(),
    isLoading: computed(() => false),
  } as unknown as FollowsManager;
  return { manager, following };
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
    it("does not open while signed out, even with follows", async () => {
      const { manager: follows } = makeFollows([
        { userId: "other-1", followedAtMs: 1, name: null, pictureUrl: null },
      ]);
      createInvitationsManager(os, makeLogin(null), follows, vi.fn());
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("does not open while signed in but following nobody", async () => {
      const { manager: follows } = makeFollows([]);
      createInvitationsManager(os, makeLogin("me"), follows, vi.fn());
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("opens once signed in and following at least one account", async () => {
      const { manager: follows } = makeFollows([
        { userId: "other-1", followedAtMs: 1, name: null, pictureUrl: null },
      ]);
      createInvitationsManager(os, makeLogin("me"), follows, vi.fn());
      await flushPromises();

      expect(getSharedDocumentMock).toHaveBeenCalledWith(
        null,
        REGISTRY_DOC_ID,
        REGISTRY_DOC_DATA
      );
    });

    it("opens once a signed-in user with no follows later follows someone", async () => {
      const { manager: follows, following } = makeFollows([]);
      createInvitationsManager(os, makeLogin("me"), follows, vi.fn());
      await flushPromises();
      expect(getSharedDocumentMock).not.toHaveBeenCalled();

      following.value = [
        { userId: "other-1", followedAtMs: 1, name: null, pictureUrl: null },
      ];
      await flushPromises();

      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1);
    });

    it("does not open when disabled, even signed in with follows", async () => {
      const { manager: follows } = makeFollows([
        { userId: "other-1", followedAtMs: 1, name: null, pictureUrl: null },
      ]);
      createInvitationsManager(os, makeLogin("me"), follows, vi.fn(), {
        enabled: () => false,
      });
      await flushPromises();

      expect(getSharedDocumentMock).not.toHaveBeenCalled();
    });

    it("publishSession opens the registry even with no follows", async () => {
      const { manager: follows } = makeFollows([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("host"),
        follows,
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
    it("surfaces only sessions hosted by someone the user follows, excluding self and dismissed entries", async () => {
      const { manager: follows } = makeFollows([
        {
          userId: "followed-host",
          followedAtMs: 1,
          name: null,
          pictureUrl: null,
        },
      ]);
      const login = makeLogin("me");
      const manager = createInvitationsManager(os, login, follows, vi.fn());
      await flushPromises();

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-followed" },
      });
      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-unfollowed" },
      });
      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-self" },
      });

      mockMap.set("session-followed", {
        sessionId: "session-followed",
        hostUserId: "followed-host",
        hostConnectionId: "conn-followed",
        publishedAt: 100,
      });
      mockMap.set("session-unfollowed", {
        sessionId: "session-unfollowed",
        hostUserId: "unfollowed-host",
        hostConnectionId: "conn-unfollowed",
        publishedAt: 200,
      });
      mockMap.set("session-self", {
        sessionId: "session-self",
        hostUserId: "me",
        hostConnectionId: "conn-self",
        publishedAt: 300,
      });

      expect(manager.availableSessions.value.map((s) => s.sessionId)).toEqual([
        "session-followed",
      ]);
    });

    it("hides an entry whose host is no longer connected", async () => {
      const { manager: follows } = makeFollows([
        {
          userId: "followed-host",
          followedAtMs: 1,
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        follows,
        vi.fn()
      );
      await flushPromises();

      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: "followed-host",
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
      const { manager: follows } = makeFollows([
        {
          userId: "followed-host",
          followedAtMs: 1,
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        follows,
        vi.fn()
      );
      await flushPromises();

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-1" },
      });
      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: "followed-host",
        hostConnectionId: "conn-1",
        publishedAt: 100,
      });
      const entry: AvailableSharedSession = manager.availableSessions.value[0]!;

      manager.dismissAvailableSession(entry);

      expect(manager.availableSessions.value).toEqual([]);
    });

    it("re-filters when the follow list changes without a registry change", async () => {
      const { manager: follows, following } = makeFollows([
        {
          userId: "followed-host",
          followedAtMs: 1,
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        follows,
        vi.fn()
      );
      await flushPromises();

      mockRemoteClients.emit({
        type: "client_connected",
        client: { connectionId: "conn-1" },
      });
      mockMap.set("session-1", {
        sessionId: "session-1",
        hostUserId: "followed-host",
        hostConnectionId: "conn-1",
        publishedAt: 100,
      });
      expect(manager.availableSessions.value).toHaveLength(1);

      following.value = [];
      expect(manager.availableSessions.value).toEqual([]);
    });
  });

  describe("publishSession / unpublishSession", () => {
    it("publishes under the signed-in user's id", async () => {
      const { manager: follows } = makeFollows([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("host-1"),
        follows,
        vi.fn()
      );

      await manager.publishSession({ id: "session-1" } as any);

      expect(mockMap.get("session-1")).toMatchObject({
        sessionId: "session-1",
        hostUserId: "host-1",
      });
    });

    it("falls back to the connection id when signed out", async () => {
      const { manager: follows } = makeFollows([]);
      const manager = createInvitationsManager(
        os,
        makeLogin(null),
        follows,
        vi.fn()
      );

      await manager.publishSession({ id: "session-1" } as any);

      expect(mockMap.get("session-1")).toMatchObject({
        sessionId: "session-1",
        hostUserId: os.connectionId,
      });
    });

    it("removes the entry on unpublish", async () => {
      const { manager: follows } = makeFollows([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("host-1"),
        follows,
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
      const { manager: follows } = makeFollows([]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        follows,
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
      const { manager: follows } = makeFollows([
        {
          userId: "followed-host",
          followedAtMs: 1,
          name: null,
          pictureUrl: null,
        },
      ]);
      const manager = createInvitationsManager(
        os,
        makeLogin("me"),
        follows,
        vi.fn()
      );
      await flushPromises();

      manager.dispose();

      expect(() =>
        mockMap.set("session-1", {
          sessionId: "session-1",
          hostUserId: "followed-host",
          hostConnectionId: "conn-1",
          publishedAt: 100,
        })
      ).not.toThrow();
      expect(manager.availableSessions.value).toEqual([]);
    });
  });
});
