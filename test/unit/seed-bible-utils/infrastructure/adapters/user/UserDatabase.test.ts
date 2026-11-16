import { UserDatabase } from "../../../../../../packages/seed-bible-utils/infrastructure/adapters/user/UserDatabase";
import type {
  Friend,
  FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import { computed, signal } from "@preact/signals";

function makeFriends(initial: Friend[] = []) {
  const friends = signal<Friend[]>(initial);
  const manager = {
    friends,
    friendIds: computed(() => friends.value.map((f) => f.userId)),
  } as unknown as FriendsManager;
  return { manager, friends };
}

describe("getSubscribedUsers", () => {
  it("resolves to an empty array when the user has no friends", async () => {
    const { manager } = makeFriends();
    await expect(
      new UserDatabase(manager).getSubscribedUsers()
    ).resolves.toEqual([]);
  });

  it("maps friends onto the SubscribedUser shape", async () => {
    const { manager } = makeFriends([
      {
        userId: "user-1",
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
    const { manager } = makeFriends([
      { userId: "user-1", name: null, pictureUrl: null },
    ]);

    await expect(
      new UserDatabase(manager).getSubscribedUsers()
    ).resolves.toEqual([
      { id: "user-1", name: undefined, photoLink: undefined },
    ]);
  });

  it("reads through to the friends list rather than caching it", async () => {
    const { manager, friends } = makeFriends([]);
    const db = new UserDatabase(manager);

    await expect(db.getSubscribedUsers()).resolves.toEqual([]);

    friends.value = [{ userId: "user-2", name: "Grace", pictureUrl: null }];

    await expect(db.getSubscribedUsers()).resolves.toEqual([
      { id: "user-2", name: "Grace", photoLink: undefined },
    ]);
  });
});
