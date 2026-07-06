import type { UserReadingInstance } from "../models/seedBible";
import type { UserPresence } from "../models/userPresence";
import type { SeedBibleUtilsEvents } from "../models/events";

export interface UserPresenceProviderPort {
  getSelectedReadingInstance: () => UserReadingInstance | undefined;
  getRemotesPresence: () => UserPresence;
  getCurrUserId: () => string;
}

export interface UserPresenceEventPort {
  emit: <K extends "OnUserPresenceUpdate">(
    eventName: K,
    ...args: SeedBibleUtilsEvents[K] extends undefined | void
      ? [payload?: SeedBibleUtilsEvents[K]]
      : [payload: SeedBibleUtilsEvents[K]]
  ) => void;
}
