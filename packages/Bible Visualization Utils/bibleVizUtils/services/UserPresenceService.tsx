import { bibleVizUtilsEventManager } from "bibleVizUtils.services.EventManager";
import type { TabData } from "bibleVizUtils.models.interfaces";

export type UserPresenceType = Map<
  string,
  {
    book: string;
    bookId: string;
    chapter: number;
  }
>;

class UserPresenceService {
  #userPresence: UserPresenceType = new Map();

  constructor() {
    this.updateUserPresence();
  }

  updateUserPresence() {
    const newPresence: UserPresenceType = new Map();
    // ToDo: Get online users' state
    const myPresence = (
      globalThis as unknown as { CurrentActiveTabData: TabData | undefined }
    ).CurrentActiveTabData;
    if (myPresence) {
      const { book, bookId, chapter } = myPresence;
      newPresence.set(configBot.id, { book, bookId, chapter });
    }
    // Format states and store them in this.#userPresence
    // emit an UserPresenceUpdate event from bibleVizUtilsEventManager
    bibleVizUtilsEventManager.emit("OnUserPresenceUpdate");
  }

  getUserPresence(): UserPresenceType {
    return new Map(this.#userPresence);
  }
}

const userPresenceService = new UserPresenceService();

export { userPresenceService };
