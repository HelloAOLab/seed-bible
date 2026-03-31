import type {
  UserPresenceData,
  UserPresenceProvider,
  UserPresence,
} from "bibleVizUtils.models.userPresence";

interface EventManager {
  emit: (eventName: "OnUserPresenceUpdate") => void;
}

interface UserPresenceParams {
  eventManager: EventManager;
  userPresenceProvider: UserPresenceProvider;
}

export class UserPresenceService {
  #userPresence: UserPresence = new Map();
  #eventManager: EventManager;
  #userPresenceProvider: UserPresenceProvider;

  constructor({ eventManager, userPresenceProvider }: UserPresenceParams) {
    this.#eventManager = eventManager;
    this.#userPresenceProvider = userPresenceProvider;
    this.updateUserPresence();
  }

  updateUserPresence() {
    const newPresence: UserPresence = new Map();
    const currUserId = this.#userPresenceProvider.getCurrUserId();
    const currUserActiveTab = this.#userPresenceProvider.getActiveTab();
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
      this.#userPresenceProvider.getRemotesPresence();
    othersPresence.forEach((presence, userId) => {
      newPresence.set(userId, presence);
    });

    this.#userPresence = newPresence;
    this.#eventManager.emit("OnUserPresenceUpdate");
  }

  getUserPresence(): UserPresence {
    return new Map(this.#userPresence);
  }
}
