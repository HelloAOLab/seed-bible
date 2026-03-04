import { bibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";
import type { Tab } from "bibleVizUtils.models.interfaces";

type PresenceData = {
  book: string;
  bookId: string;
  chapter: number;
  tabId: string;
};

export type UserPresenceType = Map<string, PresenceData>;

class UserPresenceService {
  #userPresence: UserPresenceType = new Map();

  constructor() {
    this.updateUserPresence();
  }

  updateUserPresence() {
    const newPresence: UserPresenceType = new Map();
    const myPresence = (globalThis as unknown as { ActiveTab: Tab | undefined })
      .ActiveTab;
    const othersPresence: UserPresenceType = new Map(); // TODO: Get online users' state
    if (myPresence) {
      const {
        id,
        data: { book, bookId, chapter },
      } = myPresence;
      newPresence.set(configBot.id, { book, bookId, chapter, tabId: id });
    }
    othersPresence.forEach((presence, userId) => {
      newPresence.set(userId, presence);
    });

    this.#userPresence = newPresence;
    // emit an UserPresenceUpdate event from bibleVizUtilsEventManager
    bibleVizUtilsEventManager.emit("OnUserPresenceUpdate");
  }

  getUserPresence(): UserPresenceType {
    return new Map(this.#userPresence);
  }
}

// TODO: Move the implementation export to index.tsx
const userPresenceService = new UserPresenceService();

export { userPresenceService };
