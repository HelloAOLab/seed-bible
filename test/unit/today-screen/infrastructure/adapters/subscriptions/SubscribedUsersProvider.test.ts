import { SubscribedUsersProvider } from "../../../../../../packages/today-screen/infrastructure/adapters/subscriptions/SubscribedUsersProvider";
import type {
  FollowedUser,
  FollowsManager,
} from "@packages/seed-bible/seed-bible/managers/FollowsManager";
import { computed, signal } from "@preact/signals";

/**
 * `SubscribedUsersProvider` is a read-through adapter over `FollowsManager`,
 * so a real signal-backed stub is enough to exercise it — and it lets these
 * tests check that the provider reflects follow-list changes rather than
 * caching a snapshot.
 */
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

function makeFollowedUser(overrides: Partial<FollowedUser> = {}): FollowedUser {
  return {
    userId: "user-1",
    followedAtMs: Date.UTC(2026, 0, 1),
    name: "Ada",
    pictureUrl: "https://example.com/ada.png",
    ...overrides,
  };
}

describe("SubscribedUsersProvider", () => {
  describe("getUsersIds", () => {
    it("returns an empty list when the user follows nobody", () => {
      const { manager } = makeFollows();
      const provider = new SubscribedUsersProvider(manager);
      expect(provider.getUsersIds()).toEqual([]);
    });

    it("returns the followed user ids", () => {
      const { manager } = makeFollows([
        makeFollowedUser({ userId: "user-1" }),
        makeFollowedUser({ userId: "user-2" }),
      ]);
      const provider = new SubscribedUsersProvider(manager);
      expect(provider.getUsersIds()).toEqual(["user-1", "user-2"]);
    });

    it("reflects follows and unfollows without being rebuilt", () => {
      const { manager, following } = makeFollows([
        makeFollowedUser({ userId: "user-1" }),
      ]);
      const provider = new SubscribedUsersProvider(manager);

      following.value = [
        makeFollowedUser({ userId: "user-1" }),
        makeFollowedUser({ userId: "user-2" }),
      ];
      expect(provider.getUsersIds()).toEqual(["user-1", "user-2"]);

      following.value = [makeFollowedUser({ userId: "user-2" })];
      expect(provider.getUsersIds()).toEqual(["user-2"]);
    });
  });

  describe("getUserProfile", () => {
    it("returns undefined for someone who isn't followed", () => {
      const { manager } = makeFollows([makeFollowedUser({ userId: "user-1" })]);
      const provider = new SubscribedUsersProvider(manager);
      expect(provider.getUserProfile("stranger")).toBeUndefined();
    });

    it("returns the stored profile snapshot plus a visual identity", () => {
      const { manager } = makeFollows([
        makeFollowedUser({
          userId: "user-1",
          name: "Ada",
          pictureUrl: "https://example.com/ada.png",
        }),
      ]);
      const provider = new SubscribedUsersProvider(manager);

      const profile = provider.getUserProfile("user-1");
      expect(profile?.name).toBe("Ada");
      expect(profile?.pictureUrl).toBe("https://example.com/ada.png");
      // Colour and icon are derived from the id by a pure hash, so they're
      // always present and stable rather than being stored per follow.
      expect(profile?.color).toBeTruthy();
      expect(profile?.icon).toBeTruthy();
      expect(provider.getUserProfile("user-1")?.color).toBe(profile?.color);
    });

    it("falls back to a short id when the account has no name", () => {
      const { manager } = makeFollows([
        makeFollowedUser({ userId: "abcdef123456", name: null }),
      ]);
      const provider = new SubscribedUsersProvider(manager);
      expect(provider.getUserProfile("abcdef123456")?.name).toBe(
        "User abcdef12"
      );
    });
  });

  describe("getReadingHistoryEvents", () => {
    it("returns an empty iterable — events are fetched by the caller", async () => {
      const { manager } = makeFollows([makeFollowedUser()]);
      const provider = new SubscribedUsersProvider(manager);
      expect([...(await provider.getReadingHistoryEvents())]).toEqual([]);
    });
  });
});
