import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import type { SharedMarkerPermission } from "@casual-simulation/aux-common";
import type { SharedPermission } from "@casual-simulation/aux-records";
import type { LoginManager } from "./LoginManager";
import type { CasualOSManager } from "./OsManager";

/**
 * The shared permission that makes two people friends: each can read the
 * other's data marked `friends`.
 *
 * `expireTimeMs` here is how long the grant lasts once accepted (never), not
 * how long the request can wait; the server rejects a permission without it.
 */
export const FRIENDS_PERMISSION: SharedMarkerPermission = {
  marker: "friends",
  resourceKind: "data",
  action: "read",
  options: {},
  expireTimeMs: null,
};

/** How long a friend request can wait to be answered: 7 days. */
export const FRIEND_REQUEST_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Focus and visibility changes refresh the lists at most this often (every
 * 30 seconds), so flicking between windows doesn't fire three list requests
 * every time.
 */
const FOCUS_REFRESH_INTERVAL_MS = 30 * 1000;

export interface Friend {
  userId: string;
  /** Null until their profile has loaded, or when they never set a name. */
  name: string | null;
  pictureUrl: string | null;
}

export interface FriendRequest {
  /** The shared permission ID, which is what accept/decline/cancel take. */
  id: string;
  /** The other person: the sender for incoming requests, the recipient for outgoing ones. */
  userId: string;
  name: string | null;
  pictureUrl: string | null;
  createdAtMs: number;
  expireTimeMs: number | null;
}

export type SendFriendRequestResult =
  | { status: "sent"; requestId: string }
  /** They had already asked you, so their request was accepted instead. */
  | { status: "accepted" }
  | { status: "already_friends" }
  | { status: "already_requested"; requestId: string }
  | { status: "self" }
  | { status: "user_not_found" }
  | { status: "not_signed_in" };

export type AnswerFriendRequestResult =
  | { success: true }
  | {
      success: false;
      /**
       * `unavailable` covers a request that was withdrawn, already answered,
       * or sent to a different account.
       */
      reason: "expired" | "unavailable" | "not_signed_in";
    };

/**
 * Reactive API over the signed-in user's friendships.
 *
 * A friendship is an accepted shared permission ({@link FRIENDS_PERMISSION})
 * between two accounts. It's mutual by construction: accepting grants the
 * permission in both people's records, and either side revoking removes both.
 * Requests are always sent to a specific account, never left open for whoever
 * finds them.
 */
export interface FriendsManager {
  /** Friends, most recently connected first. Empty when signed out. */
  friends: ReadonlySignal<Friend[]>;

  /** Just the user IDs, in the same order as {@link friends}. */
  friendIds: ReadonlySignal<string[]>;

  /** Pending requests others have sent the signed-in user, newest first. */
  incomingRequests: ReadonlySignal<FriendRequest[]>;

  /** Pending requests the signed-in user has sent, newest first. */
  outgoingRequests: ReadonlySignal<FriendRequest[]>;

  /** True while the lists are being read for the signed-in account. */
  isLoading: ReadonlySignal<boolean>;

  /**
   * Re-reads friends and requests from the server. Profiles are only fetched
   * for people not seen yet unless `reloadProfiles` is set.
   */
  refresh: (options?: { reloadProfiles?: boolean }) => Promise<void>;

  /**
   * Sends a friend request, prompting sign-in first if needed.
   *
   * Never creates a second connection with someone: an existing friendship or
   * pending request is reported instead, and a request they already sent you
   * is accepted rather than answered with a new one.
   */
  sendRequest: (
    target: { userId: string } | { email: string }
  ) => Promise<SendFriendRequestResult>;

  acceptRequest: (requestId: string) => Promise<AnswerFriendRequestResult>;
  declineRequest: (requestId: string) => Promise<void>;
  /** Withdraws a request the signed-in user sent. */
  cancelRequest: (requestId: string) => Promise<void>;

  /** Ends every friendship connection with this person. */
  unfriend: (userId: string) => Promise<void>;
}

type FriendLink = { userId: string; sharedPermissionIds: string[] };
type Profile = { name: string | null; pictureUrl: string | null };

const isFriendsPermission = (permission: SharedMarkerPermission): boolean =>
  permission.marker === FRIENDS_PERMISSION.marker &&
  permission.resourceKind === FRIENDS_PERMISSION.resourceKind &&
  permission.action === FRIENDS_PERMISSION.action;

/**
 * The listings return every request in every status, and an expired request
 * keeps `status: "requested"`, so "still waiting for an answer" is decided
 * here.
 */
const isPendingFriendRequest = (request: SharedPermission, nowMs: number) =>
  request.status === "requested" &&
  isFriendsPermission(request.permission) &&
  (request.expireTimeMs === null || request.expireTimeMs > nowMs);

const EMPTY_LINKS: FriendLink[] = [];
const EMPTY_REQUESTS: SharedPermission[] = [];

export function createFriendsManager(
  os: CasualOSManager,
  login: LoginManager
): FriendsManager {
  const links = signal<FriendLink[]>(EMPTY_LINKS);
  const incoming = signal<SharedPermission[]>(EMPTY_REQUESTS);
  const outgoing = signal<SharedPermission[]>(EMPTY_REQUESTS);
  const profiles = signal<ReadonlyMap<string, Profile>>(new Map());
  const loadedUserId = signal<string | null>(null);
  const loading = signal(false);

  // Bumped by every refresh and by sign-in changes, so a response that lands
  // after a newer refresh (or after the account changed) is dropped instead
  // of overwriting fresher state.
  let refreshVersion = 0;
  let lastRefreshStartedMs = 0;
  const profilesInFlight = new Set<string>();

  const profileFor = (userId: string): Profile =>
    profiles.value.get(userId) ?? { name: null, pictureUrl: null };

  const friends = computed<Friend[]>(() =>
    links.value.map((link) => ({
      userId: link.userId,
      ...profileFor(link.userId),
    }))
  );
  const friendIds = computed(() => links.value.map((link) => link.userId));

  const toRequests = (
    requests: SharedPermission[],
    otherUserId: (request: SharedPermission) => string | null
  ): FriendRequest[] => {
    const friendSet = new Set(friendIds.value);
    const seen = new Set<string>();
    const result: FriendRequest[] = [];
    // Newest first, so a person with several pending requests is shown once,
    // by their latest.
    for (const request of [...requests].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    )) {
      const userId = otherUserId(request);
      // A pending request with someone who is already a friend is left over
      // from both people asking at once; the friendship already answers it.
      if (!userId || friendSet.has(userId) || seen.has(userId)) {
        continue;
      }
      seen.add(userId);
      result.push({
        id: request.id,
        userId,
        ...profileFor(userId),
        createdAtMs: request.createdAtMs,
        expireTimeMs: request.expireTimeMs,
      });
    }
    return result;
  };

  const incomingRequests = computed(() =>
    toRequests(incoming.value, (request) => request.requestingUserId)
  );
  const outgoingRequests = computed(() =>
    toRequests(outgoing.value, (request) => request.targetUserId)
  );
  const isLoading = computed(() => loading.value);

  const loadProfiles = async (userIds: string[], reload: boolean) => {
    const wanted = userIds.filter(
      (id) => !profilesInFlight.has(id) && (reload || !profiles.peek().has(id))
    );
    await Promise.all(
      wanted.map(async (userId) => {
        profilesInFlight.add(userId);
        try {
          const profile = await login.getUserProfile(userId);
          const next = new Map(profiles.peek());
          next.set(userId, {
            name: profile?.name?.trim() || null,
            pictureUrl: profile?.pictureUrl ?? null,
          });
          profiles.value = next;
        } catch (error) {
          // Left out of the cache so the next refresh tries again; the UI
          // shows a placeholder name meanwhile.
          console.warn(`Could not load the profile for ${userId}:`, error);
        } finally {
          profilesInFlight.delete(userId);
        }
      })
    );
  };

  const refresh = async (options?: {
    reloadProfiles?: boolean;
  }): Promise<void> => {
    const userId = login.userId.peek();
    if (!userId) {
      return;
    }
    const version = ++refreshVersion;
    lastRefreshStartedMs = Date.now();
    loading.value = true;
    try {
      const [records, requested, sent] = await Promise.all([
        os.listAllSharedRecords(),
        os.listAllRequestedSharedPermissions(),
        os.listAllSentSharedPermissions(),
      ]);
      if (version !== refreshVersion || login.userId.peek() !== userId) {
        return;
      }

      const byUser = new Map<string, string[]>();
      for (const record of records) {
        if (!isFriendsPermission(record.permission)) {
          continue;
        }
        const ids = byUser.get(record.ownerUserId) ?? [];
        ids.push(record.sharedPermissionId);
        byUser.set(record.ownerUserId, ids);
      }

      const nowMs = Date.now();
      batch(() => {
        links.value = [...byUser].map(([friendId, sharedPermissionIds]) => ({
          userId: friendId,
          sharedPermissionIds,
        }));
        incoming.value = requested.filter((r) =>
          isPendingFriendRequest(r, nowMs)
        );
        outgoing.value = sent.filter((r) => isPendingFriendRequest(r, nowMs));
        loadedUserId.value = userId;
      });

      const people = new Set<string>(byUser.keys());
      for (const r of incoming.peek()) people.add(r.requestingUserId);
      for (const r of outgoing.peek()) {
        if (r.targetUserId) people.add(r.targetUserId);
      }
      void loadProfiles([...people], options?.reloadProfiles ?? false);
    } catch (error) {
      // Keeps whatever was shown before rather than blanking the lists over a
      // dropped request; the next refresh tries again.
      console.error("Failed to refresh friends:", error);
    } finally {
      if (version === refreshVersion) {
        loading.value = false;
      }
    }
  };

  effect(() => {
    const userId = login.userId.value;
    if (loadedUserId.peek() === userId) {
      return;
    }
    // Invalidates anything in flight for the previous account.
    refreshVersion++;
    batch(() => {
      links.value = EMPTY_LINKS;
      incoming.value = EMPTY_REQUESTS;
      outgoing.value = EMPTY_REQUESTS;
      loadedUserId.value = null;
      loading.value = false;
    });
    if (userId) {
      void refresh();
    }
  });

  if (typeof window !== "undefined") {
    // Requests arrive while the app sits in the background, and there's no
    // push channel yet, so coming back to the app is when to look again.
    const refreshOnReturn = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRefreshStartedMs >= FOCUS_REFRESH_INTERVAL_MS
      ) {
        void refresh();
      }
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
  }

  /**
   * The account to act as, prompting sign-in if needed, with its lists read
   * at least once so the duplicate checks in `sendRequest` see real state.
   */
  const resolveSignedInUser = async (): Promise<string | null> => {
    let userId = login.userId.peek();
    if (!userId) {
      await login.login();
      userId = login.userId.peek();
    }
    if (!userId) {
      return null;
    }
    if (loadedUserId.peek() !== userId) {
      await refresh();
    }
    return login.userId.peek() === userId ? userId : null;
  };

  const acceptRequest = async (
    requestId: string
  ): Promise<AnswerFriendRequestResult> => {
    const me = await resolveSignedInUser();
    if (!me) {
      return { success: false, reason: "not_signed_in" };
    }
    const result = await os.acceptSharedPermission(requestId, me);
    if (!result.success) {
      if (result.errorCode === "shared_permission_expired") {
        return { success: false, reason: "expired" };
      }
      if (
        result.errorCode === "not_found" ||
        result.errorCode === "invalid_request" ||
        result.errorCode === "not_authorized"
      ) {
        await refresh();
        return { success: false, reason: "unavailable" };
      }
      throw new Error(`Failed to accept friend request: ${result.errorCode}`);
    }
    await refresh();
    return { success: true };
  };

  /**
   * Withdraws or declines a request. A request that's already gone (answered,
   * withdrawn, or revoked by the other side) is the outcome the caller wanted,
   * so that isn't an error.
   */
  const endRequest = async (
    requestId: string,
    end: (
      id: string
    ) => Promise<{ success: true } | { success: false; errorCode: string }>,
    action: string
  ): Promise<void> => {
    const result = await end(requestId);
    if (
      !result.success &&
      result.errorCode !== "not_found" &&
      result.errorCode !== "invalid_request"
    ) {
      await refresh();
      throw new Error(
        `Failed to ${action} friend request: ${result.errorCode}`
      );
    }
    await refresh();
  };

  const sendRequest = async (
    target: { userId: string } | { email: string }
  ): Promise<SendFriendRequestResult> => {
    const me = await resolveSignedInUser();
    if (!me) {
      return { status: "not_signed_in" };
    }

    // What to do about an existing connection with `userId`, if there is one.
    const existingWith = async (
      userId: string
    ): Promise<SendFriendRequestResult | null> => {
      if (userId === me) {
        return { status: "self" };
      }
      if (friendIds.peek().includes(userId)) {
        return { status: "already_friends" };
      }
      const theirs = incomingRequests.peek().find((r) => r.userId === userId);
      if (theirs) {
        const accepted = await acceptRequest(theirs.id);
        if (accepted.success) {
          return { status: "accepted" };
        }
        // Their request went away in the meantime; fall through to asking.
        return null;
      }
      const mine = outgoingRequests.peek().find((r) => r.userId === userId);
      if (mine) {
        return { status: "already_requested", requestId: mine.id };
      }
      return null;
    };

    if ("userId" in target) {
      const existing = await existingWith(target.userId);
      if (existing) {
        return existing;
      }
    }

    const result = await os.requestSharedPermission(
      me,
      FRIENDS_PERMISSION,
      target,
      { expireTimeMs: Date.now() + FRIEND_REQUEST_LIFETIME_MS }
    );
    if (!result.success) {
      if (result.errorCode === "user_not_found") {
        return { status: "user_not_found" };
      }
      throw new Error(`Failed to send friend request: ${result.errorCode}`);
    }
    const requestId = result.sharedPermissionId;

    if ("email" in target) {
      // The server resolved the email to an account only now, so the checks
      // above couldn't run before sending. Run them against the account it
      // picked, and take the new request back if one of them applies.
      const sent = await os.listAllSentSharedPermissions();
      const targetUserId = sent.find((r) => r.id === requestId)?.targetUserId;
      const existing = targetUserId ? await existingWith(targetUserId) : null;
      if (existing) {
        await os.revokeSharedPermission(requestId);
        await refresh();
        return existing;
      }
    }

    await refresh();
    return { status: "sent", requestId };
  };

  const unfriend = async (userId: string): Promise<void> => {
    const link = links.peek().find((l) => l.userId === userId);
    if (!link) {
      return;
    }
    links.value = links.peek().filter((l) => l.userId !== userId);
    const results = await Promise.all(
      link.sharedPermissionIds.map((id) => os.revokeSharedPermission(id))
    );
    const failed = results.find(
      (r) =>
        !r.success &&
        r.errorCode !== "not_found" &&
        r.errorCode !== "invalid_request"
    );
    // Either way the server now decides what's left, including putting the
    // friend back if the revoke didn't go through.
    await refresh();
    if (failed && !failed.success) {
      throw new Error(`Failed to unfriend: ${failed.errorCode}`);
    }
  };

  return {
    friends,
    friendIds,
    incomingRequests,
    outgoingRequests,
    isLoading,
    refresh,
    sendRequest,
    acceptRequest,
    declineRequest: (requestId) =>
      endRequest(requestId, os.rejectSharedPermission, "decline"),
    cancelRequest: (requestId) =>
      endRequest(requestId, os.revokeSharedPermission, "cancel"),
    unfriend,
  };
}
