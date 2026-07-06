import type {
  UserPresenceData,
  UserPresence,
} from "@packages/seed-bible-utils/domain/models/userPresence";
import type {
  UserPresenceProviderPort,
  UserPresenceEventPort,
} from "@packages/seed-bible-utils/domain/ports/userPresence";
import type { UserPresencePort } from "@packages/seed-bible-utils/application/ports/in/userPresence";

interface UserPresenceParams {
  userPresenceEventPort: UserPresenceEventPort;
  userPresenceProviderPort: UserPresenceProviderPort;
}

export class UserPresenceService implements UserPresencePort {
  #userPresence: UserPresence = new Map();
  #userPresenceEventPort: UserPresenceEventPort;
  #userPresenceProviderPort: UserPresenceProviderPort;

  constructor({
    userPresenceEventPort,
    userPresenceProviderPort,
  }: UserPresenceParams) {
    this.#userPresenceEventPort = userPresenceEventPort;
    this.#userPresenceProviderPort = userPresenceProviderPort;
    this.updateUserPresence();
  }

  updateUserPresence() {
    const newPresence: UserPresence = new Map();
    const currUserId = this.#userPresenceProviderPort.getCurrUserId();
    const selectedReadingInstance =
      this.#userPresenceProviderPort.getSelectedReadingInstance();
    if (selectedReadingInstance) {
      const currUserPresenceData: UserPresenceData = {
        bookId: selectedReadingInstance.bookId,
        chapter: selectedReadingInstance.chapter,
        readingInstanceId: selectedReadingInstance.id,
      };
      newPresence.set(currUserId, currUserPresenceData);
    }
    const othersPresence: UserPresence =
      this.#userPresenceProviderPort.getRemotesPresence();
    for (const [otherId, otherPresence] of othersPresence) {
      if (!newPresence.has(otherId)) {
        newPresence.set(otherId, otherPresence);
      }
    }

    this.#userPresence = newPresence;
    this.#userPresenceEventPort.emit("OnUserPresenceUpdate");
  }

  getUserPresence(): UserPresence {
    return new Map(this.#userPresence);
  }

  getOwnUserConfigId() {
    return this.#userPresenceProviderPort.getCurrUserId();
  }

  getOwnUserPresence() {
    return this.#userPresence.get(this.getOwnUserConfigId());
  }
}
