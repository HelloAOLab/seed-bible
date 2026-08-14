import type { UserDatabasePort } from "@packages/seed-bible-utils/domain/ports/session";
import type { SubscribedUser } from "@packages/seed-bible-utils/domain/models/subscriptions";
import type { FollowsManager } from "@packages/seed-bible/seed-bible/managers/FollowsManager";

/**
 * Exposes the accounts the signed-in user follows as {@link SubscribedUser}s.
 *
 * A thin adapter over {@link FollowsManager} — it holds no state of its own, so
 * following or unfollowing someone is picked up on the next read.
 */
export class UserDatabase implements UserDatabasePort {
  #follows: FollowsManager;

  constructor(follows: FollowsManager) {
    this.#follows = follows;
  }

  async getSubscribedUsers(): Promise<SubscribedUser[]> {
    return this.#follows.following.value.map((user) => ({
      id: user.userId,
      name: user.name ?? undefined,
      photoLink: user.pictureUrl ?? undefined,
    }));
  }
}
