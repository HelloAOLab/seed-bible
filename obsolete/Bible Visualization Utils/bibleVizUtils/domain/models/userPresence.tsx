import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

export interface UserPresenceData {
  book: string;
  bookId: string;
  chapter: number;
  tabId: string;
}

export type UserPresence = Map<string, UserPresenceData>;

export interface UserIds {
  configId?: string;
  authId?: string;
}

export interface UserData extends UserIds {
  color: HexString;
}
