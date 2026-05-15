import type {
  UserPresenceData,
  UserPresence,
} from "bibleVizUtils.domain.models.userPresence";
import type {
  UserPresenceProviderPort,
  UserPresenceEventPort,
} from "bibleVizUtils.domain.ports.userPresence";
import type { UserPresenceServicePort } from "bibleVizUtils.domain.ports.pieceActivity";

interface UserPresenceParams {
  userPresenceEventPort: UserPresenceEventPort;
  userPresenceProviderPort: UserPresenceProviderPort;
}

export class UserPresenceService implements UserPresenceServicePort {
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
    const currUserActiveTab = this.#userPresenceProviderPort.getActiveTab();
    if (currUserActiveTab) {
      const currUserPresenceData: UserPresenceData = {
        book: currUserActiveTab.data.book,
        bookId: currUserActiveTab.data.bookId,
        chapter: currUserActiveTab.data.chapter,
        tabId: currUserActiveTab.id,
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
