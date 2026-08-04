import { UserDatabase } from "../../../../../../packages/seed-bible-utils/infrastructure/adapters/user/UserDatabase";
import type {
  FollowedUser,
  FollowsManager,
} from "@packages/seed-bible/seed-bible/managers/FollowsManager";
import { computed, signal } from "@preact/signals";

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

describe("getSubscribedUsers", () => {
  it("resolves to an empty array when the user follows nobody", async () => {
    const { manager } = makeFollows();
    await expect(
      new UserDatabase(manager).getSubscribedUsers()
    ).resolves.toEqual([]);
  });

  it("maps followed accounts onto the SubscribedUser shape", async () => {
    const { manager } = makeFollows([
      {
        userId: "user-1",
        followedAtMs: Date.UTC(2026, 0, 1),
        name: "Ada",
        pictureUrl: "https://example.com/ada.png",
      },
    ]);

    await expect(
      new UserDatabase(manager).getSubscribedUsers()
    ).resolves.toEqual([
      {
        id: "user-1",
        name: "Ada",
        photoLink: "https://example.com/ada.png",
      },
    ]);
  });

  it("maps a missing name or picture to undefined rather than null", async () => {
    const { manager } = makeFollows([
      {
        userId: "user-1",
        followedAtMs: Date.UTC(2026, 0, 1),
        name: null,
        pictureUrl: null,
      },
    ]);

    await expect(
      new UserDatabase(manager).getSubscribedUsers()
    ).resolves.toEqual([
      { id: "user-1", name: undefined, photoLink: undefined },
    ]);
  });

  it("reads through to the follow list rather than caching it", async () => {
    const { manager, following } = makeFollows([]);
    const db = new UserDatabase(manager);

    await expect(db.getSubscribedUsers()).resolves.toEqual([]);

    following.value = [
      {
        userId: "user-2",
        followedAtMs: Date.UTC(2026, 0, 2),
        name: "Grace",
        pictureUrl: null,
      },
    ];

    await expect(db.getSubscribedUsers()).resolves.toEqual([
      { id: "user-2", name: "Grace", photoLink: undefined },
    ]);
  });
});
