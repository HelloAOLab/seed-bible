import type {
  UserPresenceData,
  UserPresence,
} from "../../domain/models/userPresence";
import type { UserPresenceProviderPort } from "../../application/ports/out/UserPresence";
import type { UserPresencePort } from "../ports/in/userPresence";

interface UserPresenceParams {
  userPresenceProviderPort: UserPresenceProviderPort;
}

export class UserPresenceService implements UserPresencePort {
  #userPresence: UserPresence = new Map();
  #userPresenceProviderPort: UserPresenceProviderPort;

  constructor({ userPresenceProviderPort }: UserPresenceParams) {
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
