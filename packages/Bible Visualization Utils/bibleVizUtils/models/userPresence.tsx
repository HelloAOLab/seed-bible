import type { Tab } from "bibleVizUtils.models.seedBible";

export interface UserPresenceData {
  book: string;
  bookId: string;
  chapter: number;
  tabId: string;
}

export type UserPresence = Map<string, UserPresenceData>;

export interface UserPresenceProvider {
  getActiveTab: () => Tab | undefined;
  getRemotesPresence: () => UserPresence;
  getCurrUserId: () => string;
}
