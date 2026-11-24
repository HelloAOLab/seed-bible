import { signal } from "@preact/signals";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createNotificationsManager,
  type CreateNotificationsManagerOptions,
  type NotificationsManager,
} from "@packages/seed-bible/seed-bible/managers/NotificationsManager";
import {
  NOTIFICATION_STATE_ADDRESS,
  type NotificationState,
} from "@packages/seed-bible/seed-bible/managers/NotificationState";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { fakeSharedPermissions, ME } from "./fakeSharedPermissions";
import { mockTranslate } from "./mockI18n";

type GetDataResult = Awaited<ReturnType<CasualOSManager["getData"]>>;
type RecordDataResult = Awaited<ReturnType<CasualOSManager["recordData"]>>;

/** The version the harness's app is running. */
export const HARNESS_APP_VERSION = "1.18.0";

/**
 * A real `NotificationsManager` over a real `FriendsManager`, with the
 * CasualOS calls they make answered in memory: friend requests by
 * {@link fakeSharedPermissions}, and the account's read/dismissed record by
 * {@link accounts}. Signed in as {@link ME} unless `userId` is set to null.
 *
 * Set up what the server holds first, then call `start()`. The manager keeps
 * this device's copy in `localStorage`, so clear it between tests.
 */
export function notificationsHarness() {
  const os = CasualOSManager();
  const userId = signal<string | null>(ME);
  /** Profile names by user id; anyone missing has no name. */
  const names: Record<string, string> = {};
  const login = {
    userId,
    login: vi.fn().mockResolvedValue(null),
    getPublicProfile: vi.fn(async (id: string) => ({
      name: names[id] ?? "",
      pictureUrl: null,
    })),
  } as unknown as LoginManager;
  const server = fakeSharedPermissions(os, () => userId.peek());
  /** The account copies of the read/dismissed state, by record name. */
  const accounts = new Map<string, NotificationState>();
  const toast = vi.fn<CreateNotificationsManagerOptions["toast"]>();

  vi.spyOn(os, "getData").mockImplementation(
    async (recordName, address) =>
      (address === NOTIFICATION_STATE_ADDRESS && accounts.has(recordName)
        ? { success: true, data: structuredClone(accounts.get(recordName)) }
        : {
            success: false,
            errorCode: "data_not_found",
            errorMessage: "",
          }) as GetDataResult
  );
  vi.spyOn(os, "recordData").mockImplementation(
    async (recordName, address, data) => {
      if (address === NOTIFICATION_STATE_ADDRESS) {
        accounts.set(recordName, structuredClone(data) as NotificationState);
      }
      return { success: true } as RecordDataResult;
    }
  );

  const disposers: (() => void)[] = [];

  return {
    os,
    userId,
    names,
    login,
    server,
    accounts,
    /** Every toast, from the manager and from whatever it's handed to. */
    toast,
    start(overrides: Partial<CreateNotificationsManagerOptions> = {}): {
      friends: FriendsManager;
      notifications: NotificationsManager;
    } {
      const friends = createFriendsManager(os, login);
      const notifications = createNotificationsManager({
        os,
        login,
        friends,
        toast,
        i18n: { t: mockTranslate },
        appVersion: HARNESS_APP_VERSION,
        saveDelayMs: 0,
        ...overrides,
      });
      // What the app does after its first render.
      notifications.hydrateStoredState();
      disposers.push(notifications.dispose, friends.dispose);
      return { friends, notifications };
    },
    dispose() {
      for (const dispose of disposers.splice(0)) {
        dispose();
      }
    },
  };
}

export type NotificationsHarness = ReturnType<typeof notificationsHarness>;
