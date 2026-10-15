import type { UserDatabasePort } from "@packages/seed-bible-utils/domain/ports/session";
import type { SubscribedUser } from "@packages/seed-bible-utils/domain/models/subscriptions";
import type { FriendsManager } from "@packages/seed-bible/seed-bible/managers/FriendsManager";

/**
 * Exposes the signed-in user's friends as {@link SubscribedUser}s.
 *
 * A thin adapter over {@link FriendsManager} — it holds no state of its own, so
 * gaining or losing a friend is picked up on the next read.
 */
export class UserDatabase implements UserDatabasePort {
  #friends: FriendsManager;

  constructor(friends: FriendsManager) {
    this.#friends = friends;
  }

  async getSubscribedUsers(): Promise<SubscribedUser[]> {
    return this.#friends.friends.value.map((user) => ({
      id: user.userId,
      name: user.name ?? undefined,
      photoLink: user.pictureUrl ?? undefined,
    }));
  }
}
