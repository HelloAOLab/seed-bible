import * as z from "zod/v4";
import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "./LoginManager";
import type { CasualOSManager } from "./OsManager";

/**
 * Address of the follow-list record inside the signed-in user's own record.
 * One blob rather than a record per follow: the list is small, and a single
 * address makes add/remove a single round trip that can't half-apply.
 */
const STORAGE_ADDRESS = "following";

/**
 * Marker for the follow list.
 *
 * Everything else this app stores is `publicRead`, but a follow list is the one
 * artifact with no reader other than its owner — following is asymmetric, and
 * nothing in the app resolves someone else's list. `private` grants no public
 * permissions at all, so owner reads resolve through the record-owner path and
 * everyone else gets `not_authorized`.
 */
const STORAGE_MARKER = "private";

/**
 * Upper bound on how many accounts one user can follow.
 *
 * The whole list is rewritten on every change and re-read on every sign-in, so
 * this is a guard against a single unbounded record rather than a product
 * limit — it is far above any plausible real follow count.
 */
export const MAX_FOLLOWS = 500;

export const followedUserSchema = z.object({
  userId: z.string().min(1),
  followedAtMs: z.number().positive(),

  /**
   * Snapshot of the followee's profile taken when they were followed (and
   * refreshed by {@link FollowsManager.refreshProfiles}).
   *
   * Denormalized so the list renders with real names and pictures on first
   * paint, instead of showing a row of placeholders while one profile request
   * per followee is in flight. `AnnotationsManager` embeds author details in
   * each annotation for the same reason. The followee's own `profile` record
   * stays the source of truth; this is a cache that is allowed to go stale.
   */
  name: z.string().max(100).nullable().optional(),
  pictureUrl: z.string().max(1024).nullable().optional(),
});

export const followingPayloadSchema = z.object({
  follows: z.array(followedUserSchema).max(MAX_FOLLOWS),
});

export type FollowedUser = z.infer<typeof followedUserSchema>;
export type FollowingPayload = z.infer<typeof followingPayloadSchema>;

/**
 * Reactive API over the set of accounts the signed-in user follows.
 *
 * Following is asymmetric and needs no approval: every stream it unlocks
 * (highlights, playlists, reading history) is already stored world-readable
 * under the author's own record, so following is purely a local statement of
 * "read this account's data too". Nothing is written into the followee's
 * record, and the followee is not notified.
 */
export interface FollowsManager {
  /** Followed accounts, most recently followed first. Empty when signed out. */
  following: ReadonlySignal<FollowedUser[]>;

  /**
   * Just the user IDs, in the same order as {@link following}. This is what
   * downstream consumers fan out over, so it gets its own computed rather than
   * having every caller re-map the list.
   */
  followingIds: ReadonlySignal<string[]>;

  /**
   * Reactive "am I following this account?". Views are cached per user ID so
   * repeated calls for the same account return the same signal.
   */
  isFollowing: (userId: string) => ReadonlySignal<boolean>;

  /**
   * Follows an account, prompting sign-in first if needed.
   *
   * No-ops when the account is already followed or is the signed-in user.
   * Throws when the list is already at {@link MAX_FOLLOWS}.
   */
  follow: (userId: string) => Promise<void>;

  /** Unfollows an account. No-ops when it wasn't followed. */
  unfollow: (userId: string) => Promise<void>;

  /**
   * Re-reads every followee's profile and updates the cached name/picture
   * snapshots. Only writes when something actually changed.
   */
  refreshProfiles: () => Promise<void>;

  /** True while the follow list is being read for the signed-in account. */
  isLoading: ReadonlySignal<boolean>;
}

const EMPTY_FOLLOWS: FollowedUser[] = [];

function sortFollows(follows: FollowedUser[]): FollowedUser[] {
  return [...follows].sort((a, b) => b.followedAtMs - a.followedAtMs);
}

export function createFollowsManager(
  os: CasualOSManager,
  login: LoginManager
): FollowsManager {
  const follows = signal<FollowedUser[]>(EMPTY_FOLLOWS);
  const loadedUserId = signal<string | null>(null);
  const loading = signal(false);

  const readFollowing: ReadonlySignal<FollowedUser[]> = computed(
    () => follows.value
  );
  const followingIds: ReadonlySignal<string[]> = computed(() =>
    follows.value.map((f) => f.userId)
  );
  const isLoading: ReadonlySignal<boolean> = computed(() => loading.value);

  // Identity-stable per-account views handed to callers. Cached so a component
  // that re-renders doesn't mint a fresh computed on every pass.
  const isFollowingViews = new Map<string, ReadonlySignal<boolean>>();

  const loadFollows = async (userId: string): Promise<void> => {
    loading.value = true;
    try {
      const data = await os.getData(userId, STORAGE_ADDRESS);

      // The signed-in account may have changed while the read was in the air.
      // Applying the response then would show one account's follows to
      // another, so drop it unless it still belongs to the current account.
      if (loadedUserId.value !== userId && login.userId.value !== userId) {
        return;
      }

      const setEmpty = () => {
        follows.value = EMPTY_FOLLOWS;
        loadedUserId.value = userId;
      };

      if (!data || !data.success || !data.data) {
        setEmpty();
        return;
      }

      const parsed = followingPayloadSchema.safeParse(data.data);
      if (!parsed.success) {
        console.warn("Failed to parse following payload:", parsed.error);
        setEmpty();
        return;
      }

      follows.value = sortFollows(parsed.data.follows);
      loadedUserId.value = userId;
    } finally {
      if (login.userId.value === userId) {
        loading.value = false;
      }
    }
  };

  /**
   * Writes the list to `userId`'s record and updates local state optimistically.
   *
   * Takes the account to write to explicitly rather than reading
   * `login.userId` again: the caller already resolved an account to read the
   * current list from, and an account switch part-way through a mutation would
   * otherwise store one account's follows in another account's record.
   *
   * Rolls the local list back and rethrows if the write fails, so the UI can't
   * end up showing someone as followed when the server never stored it.
   */
  const persist = async (
    userId: string,
    nextFollows: FollowedUser[]
  ): Promise<void> => {
    const sorted = sortFollows(nextFollows);
    const payload = followingPayloadSchema.parse({ follows: sorted });

    const previous = follows.peek();
    follows.value = sorted;
    loadedUserId.value = userId;

    try {
      await os.recordData(userId, STORAGE_ADDRESS, payload, {
        marker: STORAGE_MARKER,
      });
    } catch (error) {
      // Only roll back if nothing else has changed the list in the meantime —
      // a later mutation that did land is newer than what we're undoing.
      if (follows.peek() === sorted) {
        follows.value = previous;
      }
      throw error;
    }
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      follows.value = EMPTY_FOLLOWS;
      loadedUserId.value = null;
      loading.value = false;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void loadFollows(userId);
  });

  /**
   * Resolves the account to mutate, prompting sign-in if needed, and makes sure
   * its current follow list has been read. Returns null when no account could
   * be resolved. Mutating without loading first would replace the stored list
   * with whatever is in memory — i.e. wipe it.
   */
  const resolveUserIdToMutate = async (): Promise<string | null> => {
    let userId = login.userId.value;
    if (!userId) {
      await login.login();
      userId = login.userId.value;
    }
    if (!userId) {
      console.warn("Unable to change follows: user is not authenticated.");
      return null;
    }
    if (loadedUserId.peek() !== userId) {
      await loadFollows(userId);
    }
    // The load can be dropped as stale if the account changed underneath it.
    if (loadedUserId.peek() !== userId) {
      return null;
    }
    return userId;
  };

  const follow = async (userId: string): Promise<void> => {
    if (!userId) {
      return;
    }

    const myUserId = await resolveUserIdToMutate();
    if (!myUserId) {
      return;
    }

    if (userId === myUserId) {
      console.warn("Cannot follow yourself.");
      return;
    }

    const current = follows.peek();
    if (current.some((f) => f.userId === userId)) {
      return;
    }
    if (current.length >= MAX_FOLLOWS) {
      throw new Error(
        `Cannot follow more than ${MAX_FOLLOWS} accounts. Unfollow someone first.`
      );
    }

    // A missing profile is not a missing account: `getUserProfile` returns a
    // blank profile for `data_not_found`, and an account that has never opened
    // the profile editor is still perfectly followable. Only a genuine failure
    // (network, server) lands in the catch, and that shouldn't block the follow
    // either — `refreshProfiles` will fill the snapshot in later.
    let name: string | null = null;
    let pictureUrl: string | null = null;
    try {
      const profile = await login.getUserProfile(userId);
      name = profile?.name || null;
      pictureUrl = profile?.pictureUrl ?? null;
    } catch (err) {
      console.warn(
        `Could not load the profile for ${userId} while following`,
        err
      );
    }

    const entry: FollowedUser = {
      userId,
      followedAtMs: Date.now(),
      name,
      pictureUrl,
    };

    await persist(myUserId, [...follows.peek(), entry]);
  };

  const unfollow = async (userId: string): Promise<void> => {
    if (!userId) {
      return;
    }

    const myUserId = await resolveUserIdToMutate();
    if (!myUserId) {
      return;
    }

    const current = follows.peek();
    const next = current.filter((f) => f.userId !== userId);
    if (next.length === current.length) {
      return;
    }

    await persist(myUserId, next);
  };

  const isFollowing = (userId: string): ReadonlySignal<boolean> => {
    let view = isFollowingViews.get(userId);
    if (!view) {
      view = computed(() => follows.value.some((f) => f.userId === userId));
      isFollowingViews.set(userId, view);
    }
    return view;
  };

  const refreshProfiles = async (): Promise<void> => {
    const myUserId = login.userId.peek();
    if (!myUserId || loadedUserId.peek() !== myUserId) {
      return;
    }

    const current = follows.peek();
    if (current.length === 0) {
      return;
    }

    const refreshed = await Promise.all(
      current.map(async (entry) => {
        try {
          const profile = await login.getUserProfile(entry.userId);
          return {
            ...entry,
            name: profile?.name || null,
            pictureUrl: profile?.pictureUrl ?? null,
          };
        } catch {
          // Keep the existing snapshot for anyone we couldn't reach.
          return entry;
        }
      })
    );

    // The list can have been mutated (or the account switched) while the
    // profile requests were in the air; writing the pre-mutation list back
    // would undo that change.
    if (
      login.userId.peek() !== myUserId ||
      loadedUserId.peek() !== myUserId ||
      follows.peek() !== current
    ) {
      return;
    }

    const changed = refreshed.some(
      (entry, i) =>
        entry.name !== current[i]?.name ||
        entry.pictureUrl !== current[i]?.pictureUrl
    );
    if (!changed) {
      return;
    }

    await persist(myUserId, refreshed);
  };

  return {
    following: readFollowing,
    followingIds,
    isFollowing,
    follow,
    unfollow,
    refreshProfiles,
    isLoading,
  };
}
