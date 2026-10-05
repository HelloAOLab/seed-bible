import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import type { SharedMarkerPermission } from "@casual-simulation/aux-common";
import type { SharedPermission } from "@casual-simulation/aux-records";
import type { LoginManager, UserProfile } from "./LoginManager";
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

/** The parts of someone's public profile shown alongside them. */
export interface FriendProfile {
  /** Null until their profile has loaded, or when they never set a name. */
  name: string | null;
  pictureUrl: string | null;
  /** Optional: only the friend link prompts show these. */
  location?: string | null;
  description?: string | null;
}

/** Picks what's shown from a public profile; blanks stand in for no profile. */
export function toFriendProfile(
  profile: UserProfile | null | undefined
): Required<FriendProfile> {
  return {
    name: profile?.name?.trim() || null,
    pictureUrl: profile?.pictureUrl ?? null,
    location: profile?.location?.trim() || null,
    description: profile?.description?.trim() || null,
  };
}

export interface Friend extends FriendProfile {
  userId: string;
}

export interface FriendRequest extends FriendProfile {
  /** The shared permission ID, which is what accept/decline/cancel take. */
  id: string;
  /** The other person: the sender for incoming requests, the recipient for outgoing ones. */
  userId: string;
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

  /** Accepts a request, and ends any other still waiting with that person. */
  acceptRequest: (requestId: string) => Promise<AnswerFriendRequestResult>;
  /** Declines a request, and any other that person has waiting. */
  declineRequest: (requestId: string) => Promise<void>;
  /**
   * Withdraws a request the signed-in user sent, and any other still waiting
   * with that person.
   */
  cancelRequest: (requestId: string) => Promise<void>;

  /**
   * Ends every friendship connection with this person, and any request still
   * waiting between you.
   */
  unfriend: (userId: string) => Promise<void>;

  /** Stops following sign-in changes and the app coming back into focus. */
  dispose: () => void;
}

type FriendLink = { userId: string; sharedPermissionIds: string[] };
type Profile = Required<FriendProfile>;

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
  !hasExpired(request, nowMs);

/**
 * A request can expire after the lists were read, and nothing re-reads them
 * at that moment, so whatever acts on a listed request checks again.
 */
const hasExpired = (
  request: { expireTimeMs: number | null },
  nowMs = Date.now()
) => request.expireTimeMs !== null && request.expireTimeMs <= nowMs;

const EMPTY_LINKS: FriendLink[] = [];
const EMPTY_REQUESTS: SharedPermission[] = [];

const sameLinks = (a: FriendLink[], b: FriendLink[]): boolean =>
  a.length === b.length &&
  a.every(
    (link, i) =>
      link.userId === b[i]!.userId &&
      link.sharedPermissionIds.length === b[i]!.sharedPermissionIds.length &&
      link.sharedPermissionIds.every(
        (id, j) => id === b[i]!.sharedPermissionIds[j]
      )
  );

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
    profiles.value.get(userId) ?? {
      name: null,
      pictureUrl: null,
      location: null,
      description: null,
    };

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
    const nowMs = Date.now();
    const result: FriendRequest[] = [];
    // Newest first, so a person with several pending requests is shown once,
    // by their latest.
    for (const request of [...requests].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    )) {
      const userId = otherUserId(request);
      // A pending request with someone who is already a friend is left over
      // from both people asking at once. Accepting or unfriending ends it;
      // until then, the friendship already answers it.
      if (
        !userId ||
        friendSet.has(userId) ||
        seen.has(userId) ||
        hasExpired(request, nowMs)
      ) {
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
          const profile = await login.getPublicProfile(userId);
          const next = new Map(profiles.peek());
          next.set(userId, toFriendProfile(profile));
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

      // A request to your own email can be accepted if taking it back fails,
      // and it shouldn't make you your own friend.
      const byUser = new Map<string, string[]>();
      for (const record of records) {
        if (
          !isFriendsPermission(record.permission) ||
          record.ownerUserId === userId
        ) {
          continue;
        }
        const ids = byUser.get(record.ownerUserId) ?? [];
        ids.push(record.sharedPermissionId);
        byUser.set(record.ownerUserId, ids);
      }

      const nowMs = Date.now();
      const nextLinks = [...byUser].map(([friendId, sharedPermissionIds]) => ({
        userId: friendId,
        sharedPermissionIds,
      }));
      batch(() => {
        // Kept when nothing changed: everything that reads friends' content
        // reads it again whenever the friends list changes, and this runs
        // every time the app comes back into focus.
        if (!sameLinks(links.peek(), nextLinks)) {
          links.value = nextLinks;
        }
        incoming.value = requested.filter(
          (r) =>
            isPendingFriendRequest(r, nowMs) && r.requestingUserId !== userId
        );
        outgoing.value = sent.filter(
          (r) => isPendingFriendRequest(r, nowMs) && r.targetUserId !== userId
        );
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

  const stopFollowingSignIn = effect(() => {
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
  if (typeof window !== "undefined") {
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
  }

  const dispose = () => {
    stopFollowingSignIn();
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    }
  };

  /**
   * The account to act as, prompting sign-in if needed, with its lists read
   * at least once so the duplicate checks in `sendRequest` see real state.
   * Throws when the lists can't be read: acting on empty lists would send a
   * second request to an existing friend, or ask someone who already asked.
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
    if (login.userId.peek() !== userId) {
      return null;
    }
    if (loadedUserId.peek() !== userId) {
      throw new Error("Couldn't load the friends lists");
    }
    return userId;
  };

  /**
   * Ends every pending request between the signed-in user and `userId`,
   * except `keepId`: declines theirs and withdraws mine. When both people ask
   * at once, accepting one leaves the other waiting; left alone, it would let
   * one person restore the friendship without the other after it ends. A
   * failure here isn't worth failing the caller over, since the next refresh
   * just shows the request again.
   */
  const endPendingRequestsWith = async (
    userId: string,
    keepId?: string
  ): Promise<boolean> => {
    const theirs = incoming
      .peek()
      .filter((r) => r.requestingUserId === userId && r.id !== keepId);
    const mine = outgoing
      .peek()
      .filter((r) => r.targetUserId === userId && r.id !== keepId);
    if (theirs.length === 0 && mine.length === 0) {
      return false;
    }
    // Hidden straight away, so ending a friendship doesn't briefly show them
    // as new requests.
    batch(() => {
      incoming.value = incoming.peek().filter((r) => !theirs.includes(r));
      outgoing.value = outgoing.peek().filter((r) => !mine.includes(r));
    });
    try {
      await Promise.all([
        ...theirs.map((r) => os.rejectSharedPermission(r.id)),
        ...mine.map((r) => os.revokeSharedPermission(r.id)),
      ]);
    } catch (error) {
      console.warn(`Could not end pending requests with ${userId}:`, error);
    }
    return true;
  };

  const acceptRequest = async (
    requestId: string
  ): Promise<AnswerFriendRequestResult> => {
    const me = await resolveSignedInUser();
    if (!me) {
      return { success: false, reason: "not_signed_in" };
    }
    const requesterId = incoming
      .peek()
      .find((r) => r.id === requestId)?.requestingUserId;
    const result = await os.acceptSharedPermission(requestId, me);
    if (!result.success) {
      if (result.errorCode === "shared_permission_expired") {
        // Dropped from the list by the refresh, rather than left there to
        // fail the same way on every press.
        await refresh();
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
    // Signed in as someone else by now, the lists are theirs, and ending
    // "pending requests with the requester" would decline that account's own.
    if (login.userId.peek() !== me) {
      return { success: true };
    }
    // Read after the refresh, so a request sent since the lists were last
    // read is ended too.
    if (requesterId && (await endPendingRequestsWith(requesterId, requestId))) {
      await refresh();
    }
    return { success: true };
  };

  /**
   * Withdraws or declines a request, along with any other request waiting in
   * the same direction with the same person: only their newest is shown, so
   * ending just that one would bring the next one back. A request that's
   * already gone (answered, withdrawn, or revoked by the other side) is the
   * outcome the caller wanted, so that isn't an error.
   */
  const endRequest = async (
    requestId: string,
    requests: ReadonlySignal<SharedPermission[]>,
    otherUserId: (request: SharedPermission) => string | null,
    end: (
      id: string
    ) => Promise<{ success: true } | { success: false; errorCode: string }>,
    action: string
  ): Promise<void> => {
    const request = requests.peek().find((r) => r.id === requestId);
    const userId = request ? otherUserId(request) : null;
    const ids = userId
      ? requests
          .peek()
          .filter((r) => otherUserId(r) === userId)
          .map((r) => r.id)
      : [requestId];
    const results = await Promise.all(ids.map((id) => end(id)));
    const failed = results.find(
      (r) =>
        !r.success &&
        r.errorCode !== "not_found" &&
        r.errorCode !== "invalid_request"
    );
    await refresh();
    if (failed && !failed.success) {
      throw new Error(
        `Failed to ${action} friend request: ${failed.errorCode}`
      );
    }
  };

  // Two buttons for the same person can be pressed together, and each would
  // pass the duplicate checks before either request exists, so the second
  // press gets the first one's answer instead of sending again.
  const sendsInFlight = new Map<string, Promise<SendFriendRequestResult>>();
  const sendRequest = (
    target: { userId: string } | { email: string }
  ): Promise<SendFriendRequestResult> => {
    const key = `${login.userId.peek()}:${
      "userId" in target ? target.userId : target.email.trim().toLowerCase()
    }`;
    const inFlight = sendsInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }
    const sending = sendRequestNow(target).finally(() => {
      sendsInFlight.delete(key);
    });
    sendsInFlight.set(key, sending);
    return sending;
  };

  const sendRequestNow = async (
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
      const theirs = incomingRequests
        .peek()
        .find((r) => r.userId === userId && !hasExpired(r));
      if (theirs) {
        const accepted = await acceptRequest(theirs.id);
        if (accepted.success) {
          return { status: "accepted" };
        }
        // Their request went away in the meantime; fall through to asking.
        return null;
      }
      const mine = outgoingRequests
        .peek()
        .find((r) => r.userId === userId && !hasExpired(r));
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
      // picked, and take the new request back if one of them applies. Only a
      // tidy-up: the request has gone out, so if this fails it's still sent.
      try {
        const sent = await os.findSentSharedPermission(requestId);
        const existing = sent?.targetUserId
          ? await existingWith(sent.targetUserId)
          : null;
        if (existing) {
          const takeBack = await os.revokeSharedPermission(requestId);
          if (
            !takeBack.success &&
            takeBack.errorCode !== "not_found" &&
            takeBack.errorCode !== "invalid_request"
          ) {
            // Left waiting, which answering or ending a friendship tidies up:
            // both end every request between the two people.
            console.warn(
              `Couldn't take back friend request ${requestId}:`,
              takeBack.errorCode
            );
          }
          await refresh();
          return existing;
        }
      } catch (error) {
        console.warn(
          "Couldn't check who a friend request by email reached:",
          error
        );
      }
    }

    await refresh();
    return { status: "sent", requestId };
  };

  const unfriend = async (userId: string): Promise<void> => {
    const me = login.userId.peek();
    const link = links.peek().find((l) => l.userId === userId);
    if (!link) {
      return;
    }
    // Started first: it hides any leftover request before its first await, so
    // the request is already gone when dropping the link would surface it.
    const endingLeftovers = endPendingRequestsWith(userId);
    links.value = links.peek().filter((l) => l.userId !== userId);
    const [results] = await Promise.all([
      Promise.all(
        link.sharedPermissionIds.map((id) => os.revokeSharedPermission(id))
      ),
      endingLeftovers,
    ]);
    const failed = results.find(
      (r) =>
        !r.success &&
        r.errorCode !== "not_found" &&
        r.errorCode !== "invalid_request"
    );
    // Either way the server now decides what's left, including putting the
    // friend back if the revoke didn't go through.
    await refresh();
    // A request sent since the lists were last read only shows up now. Unless
    // another account signed in meanwhile: the lists are theirs now.
    if (login.userId.peek() === me && (await endPendingRequestsWith(userId))) {
      await refresh();
    }
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
      endRequest(
        requestId,
        incoming,
        (r) => r.requestingUserId,
        os.rejectSharedPermission,
        "decline"
      ),
    cancelRequest: (requestId) =>
      endRequest(
        requestId,
        outgoing,
        (r) => r.targetUserId,
        os.revokeSharedPermission,
        "cancel"
      ),
    unfriend,
    dispose,
  };
}
