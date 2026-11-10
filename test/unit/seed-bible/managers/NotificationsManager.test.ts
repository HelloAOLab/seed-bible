import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createNotificationsManager,
  releaseNotesUrl,
  type CreateNotificationsManagerOptions,
  type NotificationsManager,
} from "@packages/seed-bible/seed-bible/managers/NotificationsManager";
import {
  NOTIFICATION_STATE_ADDRESS,
  type NotificationState,
} from "@packages/seed-bible/seed-bible/managers/NotificationState";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal, type Signal } from "@preact/signals";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";
import { mockTranslate } from "../testUtils/mockI18n";
import { stubPageVisibility } from "../testUtils/pageVisibility";

type GetDataResult = Awaited<ReturnType<CasualOSManager["getData"]>>;
type RecordDataResult = Awaited<ReturnType<CasualOSManager["recordData"]>>;

/** Lets pending promise callbacks and effects run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("NotificationsManager", () => {
  let os: CasualOSManager;
  let userId: Signal<string | null>;
  let login: LoginManager;
  let server: ReturnType<typeof fakeSharedPermissions>;
  /** The account copies of the notification state, by record name. */
  let accounts: Map<string, NotificationState>;
  let writes: { recordName: string; data: unknown; marker?: string }[];
  let failReads: boolean;
  let toast: ReturnType<
    typeof vi.fn<CreateNotificationsManagerOptions["toast"]>
  >;

  const names: Record<string, string> = { ada: "Ada", bob: "Bob" };

  const disposers: (() => void)[] = [];
  const createFriends = (): FriendsManager => {
    const friends = createFriendsManager(os, login);
    disposers.push(friends.dispose);
    return friends;
  };
  const create = (
    overrides: Partial<CreateNotificationsManagerOptions> = {}
  ): NotificationsManager => {
    const notifications = createNotificationsManager({
      os,
      login,
      friends: overrides.friends ?? createFriends(),
      toast,
      i18n: { t: mockTranslate },
      appVersion: "1.18.0",
      saveDelayMs: 0,
      ...overrides,
    });
    disposers.push(notifications.dispose);
    return notifications;
  };
  /** Creates the manager and runs the after-first-render hydration step. */
  const start = (
    overrides: Partial<CreateNotificationsManagerOptions> = {}
  ): NotificationsManager => {
    const notifications = create(overrides);
    notifications.hydrateStoredState();
    return notifications;
  };

  beforeEach(() => {
    localStorage.clear();
    os = CasualOSManager();
    userId = signal<string | null>(ME);
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getPublicProfile: vi.fn(async (id: string) => ({
        name: names[id] ?? "",
        pictureUrl: null,
      })),
    } as unknown as LoginManager;
    server = fakeSharedPermissions(os, () => userId.peek());
    accounts = new Map();
    writes = [];
    failReads = false;
    toast = vi.fn();

    vi.spyOn(os, "getData").mockImplementation(async (recordName, address) => {
      if (failReads) {
        return {
          success: false,
          errorCode: "server_error",
          errorMessage: "down",
        } as GetDataResult;
      }
      const saved =
        address === NOTIFICATION_STATE_ADDRESS
          ? accounts.get(recordName)
          : undefined;
      return (
        saved
          ? { success: true, data: structuredClone(saved) }
          : {
              success: false,
              errorCode: "data_not_found",
              errorMessage: "",
            }
      ) as GetDataResult;
    });
    vi.spyOn(os, "recordData").mockImplementation(
      async (recordName, address, data, options) => {
        if (address === NOTIFICATION_STATE_ADDRESS) {
          accounts.set(recordName, structuredClone(data) as NotificationState);
          writes.push({ recordName, data, marker: options.marker });
        }
        return { success: true } as RecordDataResult;
      }
    );
  });

  afterEach(() => {
    for (const dispose of disposers.splice(0)) {
      dispose();
    }
    vi.restoreAllMocks();
  });

  const ids = (notifications: NotificationsManager) =>
    notifications.items.value.map((item) => item.notification.id);

  describe("friend requests", () => {
    it("lists an incoming request as an unread notification", async () => {
      const request = server.requestFrom("bob");

      const notifications = start();

      await vi.waitFor(() => {
        expect(notifications.items.value).toEqual([
          {
            notification: expect.objectContaining({
              id: `friend-request:${request.id}`,
              kind: "friendRequest",
              request: expect.objectContaining({ userId: "bob", name: "Bob" }),
            }),
            isUnread: true,
          },
        ]);
      });
      expect(notifications.unreadCount.value).toBe(1);
    });

    it("lists nothing before the first render has hydrated, as on the server", async () => {
      server.requestFrom("bob");
      const friends = createFriends();

      const notifications = create({ friends });
      await vi.waitFor(() => expect(friends.isLoaded.value).toBe(true));

      expect(notifications.items.value).toEqual([]);
      expect(notifications.unreadCount.value).toBe(0);
    });

    it("drops a request's notification once it's accepted", async () => {
      const request = server.requestFrom("bob");
      const friends = createFriends();
      const notifications = start({ friends });
      await vi.waitFor(() => expect(ids(notifications)).toHaveLength(1));

      await friends.acceptRequest(request.id);

      expect(ids(notifications)).toEqual([]);
    });

    it("shows nothing for friend requests once signed out", async () => {
      server.requestFrom("bob");
      const notifications = start();
      await vi.waitFor(() => expect(ids(notifications)).toHaveLength(1));

      userId.value = null;

      await vi.waitFor(() => expect(ids(notifications)).toEqual([]));
    });
  });

  describe("toasts", () => {
    it("says who sent a single new request, and opens the list when tapped", async () => {
      server.requestFrom("bob");
      const notifications = start();

      await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
      const [message, options] = toast.mock.calls[0]!;
      expect(message).toBe("Bob sent you a friend request");
      expect(options?.hint).toBe("Tap to see your notifications");

      options?.onClick?.();
      expect(notifications.isFeedOpen.value).toBe(true);
    });

    it("counts several new notifications in one toast", async () => {
      server.requestFrom("ada");
      server.requestFrom("bob");
      start();

      await vi.waitFor(() => expect(toast).toHaveBeenCalled());
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast.mock.calls[0]![0]).toBe("You have 2 new notifications");
    });

    it("announces a notification only once on a device", async () => {
      server.requestFrom("bob");
      start();
      await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));

      // The app opened again later on the same device, still unread.
      start();
      await vi.waitFor(() =>
        expect(localStorage.getItem(`sb-notifications:${ME}`)).not.toBeNull()
      );
      await flush();

      expect(toast).toHaveBeenCalledTimes(1);
    });

    it("announces a request that arrives later, when the app comes back into focus", async () => {
      const visibility = stubPageVisibility();
      try {
        const friends = createFriends();
        start({ friends });
        await vi.waitFor(() => expect(friends.isLoaded.value).toBe(true));
        await flush();
        expect(toast).not.toHaveBeenCalled();

        server.requestFrom("ada");
        await friends.refresh();

        await vi.waitFor(() =>
          expect(toast).toHaveBeenCalledWith(
            "Ada sent you a friend request",
            expect.anything()
          )
        );
      } finally {
        visibility.restore();
      }
    });

    it("doesn't announce what another device has already marked as seen", async () => {
      const request = server.requestFrom("bob");
      accounts.set(ME, {
        seen: { [`friend-request:${request.id}`]: Date.now() },
        dismissed: {},
        appVersion: null,
      });

      const notifications = start();

      await vi.waitFor(() => expect(notifications.isReady.value).toBe(true));
      await flush();
      expect(toast).not.toHaveBeenCalled();
      expect(notifications.unreadCount.value).toBe(0);
    });

    it("waits for the friends lists before announcing anything", async () => {
      server.requestFrom("bob");
      let releaseLists!: () => void;
      const listsHeld = new Promise<void>((resolve) => {
        releaseLists = resolve;
      });
      const listRequested = server.spies.listRequested.getMockImplementation()!;
      server.spies.listRequested.mockImplementation(async () => {
        await listsHeld;
        return listRequested();
      });

      const notifications = start();
      await flush();
      expect(notifications.isReady.value).toBe(false);
      expect(toast).not.toHaveBeenCalled();

      releaseLists();
      await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    });

    it("doesn't toast while the list is open", async () => {
      server.requestFrom("bob");
      const notifications = start();
      notifications.openFeed();

      await vi.waitFor(() => expect(notifications.isReady.value).toBe(true));
      await flush();

      expect(toast).not.toHaveBeenCalled();
    });
  });

  describe("seen", () => {
    it("marks everything seen when the list opens, keeping it marked new until it closes", async () => {
      server.requestFrom("bob");
      const notifications = start();
      await vi.waitFor(() => expect(notifications.unreadCount.value).toBe(1));

      notifications.openFeed();
      expect(notifications.items.value[0]!.isUnread).toBe(true);

      notifications.closeFeed();
      expect(notifications.items.value[0]!.isUnread).toBe(false);
      expect(notifications.unreadCount.value).toBe(0);
    });

    it("saves what was seen to the account, privately, so other devices agree", async () => {
      const request = server.requestFrom("bob");
      const notifications = start();
      await vi.waitFor(() => expect(notifications.unreadCount.value).toBe(1));

      notifications.openFeed();

      await vi.waitFor(() =>
        expect(accounts.get(ME)?.seen).toHaveProperty(
          `friend-request:${request.id}`
        )
      );
      expect(writes.every((w) => w.marker === "private")).toBe(true);
    });

    it("keeps what another device recorded when saving its own", async () => {
      const request = server.requestFrom("bob");
      accounts.set(ME, {
        seen: {},
        dismissed: { "friend-request:older": Date.now() - 1000 },
        appVersion: { version: "1.18.0", previousVersion: null, sinceMs: 5 },
      });
      const notifications = start();
      await vi.waitFor(() => expect(notifications.unreadCount.value).toBe(1));

      // Meanwhile, the phone dismissed something else.
      accounts.get(ME)!.dismissed["friend-request:from-phone"] = Date.now();
      notifications.openFeed();

      await vi.waitFor(() =>
        expect(accounts.get(ME)?.seen).toHaveProperty(
          `friend-request:${request.id}`
        )
      );
      expect(Object.keys(accounts.get(ME)!.dismissed).sort()).toEqual([
        "friend-request:from-phone",
        "friend-request:older",
      ]);
    });
  });

  describe("dismissing", () => {
    it("removes the notification but leaves the request waiting in Friends", async () => {
      const request = server.requestFrom("bob");
      const friends = createFriends();
      const notifications = start({ friends });
      await vi.waitFor(() => expect(ids(notifications)).toHaveLength(1));

      notifications.dismiss(`friend-request:${request.id}`);

      expect(ids(notifications)).toEqual([]);
      expect(friends.incomingRequests.value.map((r) => r.id)).toEqual([
        request.id,
      ]);
      await vi.waitFor(() =>
        expect(accounts.get(ME)?.dismissed).toHaveProperty(
          `friend-request:${request.id}`
        )
      );
    });

    it("stays dismissed the next time the app opens", async () => {
      const request = server.requestFrom("bob");
      const first = start();
      await vi.waitFor(() => expect(ids(first)).toHaveLength(1));
      first.dismiss(`friend-request:${request.id}`);
      await vi.waitFor(() =>
        expect(accounts.get(ME)?.dismissed).toHaveProperty(
          `friend-request:${request.id}`
        )
      );

      // A different device: nothing on it, only the account copy.
      localStorage.clear();
      const second = start();

      await vi.waitFor(() => expect(second.isReady.value).toBe(true));
      expect(ids(second)).toEqual([]);
    });

    it("dismisses everything at once", async () => {
      server.requestFrom("ada");
      server.requestFrom("bob");
      const notifications = start();
      await vi.waitFor(() => expect(ids(notifications)).toHaveLength(2));

      notifications.dismissAll();

      expect(ids(notifications)).toEqual([]);
    });
  });

  describe("when the account copy can't be read", () => {
    it("never writes to the account, so another device's state isn't replaced", async () => {
      failReads = true;
      const request = server.requestFrom("bob");
      const notifications = start();
      await vi.waitFor(() => expect(notifications.isReady.value).toBe(true));

      notifications.openFeed();
      notifications.dismiss(`friend-request:${request.id}`);
      await flush();
      await flush();

      expect(writes).toEqual([]);
      // Still works on this device.
      expect(ids(notifications)).toEqual([]);
    });

    it("still announces new notifications", async () => {
      failReads = true;
      server.requestFrom("bob");
      start();

      await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    });
  });

  describe("app updates", () => {
    it("lists an update notice when the account last ran an older version", async () => {
      accounts.set(ME, {
        seen: {},
        dismissed: {},
        appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
      });

      const notifications = start();

      await vi.waitFor(() =>
        expect(notifications.items.value).toEqual([
          {
            notification: expect.objectContaining({
              id: "app-update:1.18.0",
              kind: "appUpdate",
              version: "1.18.0",
              previousVersion: "1.17.0",
              releaseNotesUrl: releaseNotesUrl("1.18.0"),
            }),
            isUnread: true,
          },
        ])
      );
      await vi.waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          "Seed Bible was updated to version 1.18.0",
          expect.anything()
        )
      );
      expect(accounts.get(ME)?.appVersion).toMatchObject({
        version: "1.18.0",
        previousVersion: "1.17.0",
      });
    });

    it("gives a brand-new account no update notice, and remembers its version", async () => {
      const notifications = start();

      await vi.waitFor(() =>
        expect(accounts.get(ME)?.appVersion).toMatchObject({
          version: "1.18.0",
          previousVersion: null,
        })
      );
      expect(ids(notifications)).toEqual([]);
      expect(toast).not.toHaveBeenCalled();
    });

    it("compares a new device against what the account last ran", async () => {
      // This device has never run Seed Bible; the account last ran 1.17.0
      // on another device.
      accounts.set(ME, {
        seen: {},
        dismissed: {},
        appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
      });

      const notifications = start();

      await vi.waitFor(() =>
        expect(ids(notifications)).toEqual(["app-update:1.18.0"])
      );
    });

    it("works signed out, from this device's copy alone", async () => {
      userId.value = null;
      localStorage.setItem(
        "sb-notifications:signed-out",
        JSON.stringify({
          seen: {},
          dismissed: {},
          appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
        })
      );

      const notifications = start();

      expect(ids(notifications)).toEqual(["app-update:1.18.0"]);
      expect(os.getData).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    });

    it("stops listing the notice 30 days after the update", async () => {
      const now = Date.UTC(2026, 10, 10);
      accounts.set(ME, {
        seen: {},
        dismissed: {},
        appVersion: {
          version: "1.18.0",
          previousVersion: "1.17.0",
          sinceMs: now - 31 * 24 * 60 * 60 * 1000,
        },
      });

      const notifications = start({ now: () => now });

      await vi.waitFor(() => expect(notifications.isReady.value).toBe(true));
      expect(ids(notifications)).toEqual([]);
    });
  });

  describe("switching accounts", () => {
    it("shows each account its own read state", async () => {
      const request = server.requestFrom("bob");
      accounts.set("someone-else", {
        seen: {},
        dismissed: {},
        appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
      });
      const notifications = start();
      await vi.waitFor(() => expect(ids(notifications)).toHaveLength(1));
      notifications.dismiss(`friend-request:${request.id}`);

      userId.value = "someone-else";

      await vi.waitFor(() =>
        expect(ids(notifications)).toEqual(["app-update:1.18.0"])
      );
      expect(accounts.get("someone-else")?.dismissed).toEqual({});
    });
  });
});
