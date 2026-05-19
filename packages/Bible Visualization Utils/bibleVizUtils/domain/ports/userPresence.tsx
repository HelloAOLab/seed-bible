import type { UserReadingInstance } from "bibleVizUtils.domain.models.seedBible";
import type { UserPresence } from "bibleVizUtils.domain.models.userPresence";
import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";

export interface UserPresenceProviderPort {
  getSelectedReadingInstance: () => UserReadingInstance | undefined;
  getRemotesPresence: () => UserPresence;
  getCurrUserId: () => string;
}

export interface UserPresenceEventPort {
  emit: <K extends "OnUserPresenceUpdate">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}
