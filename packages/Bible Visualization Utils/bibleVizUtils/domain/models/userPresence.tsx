import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

export interface UserPresenceData {
  bookId: string;
  chapter: number;
  readingInstanceId: string;
}

export type UserPresence = Map<string, UserPresenceData>;

export interface UserIds {
  configId?: string;
  authId?: string;
}

export interface UserData extends UserIds {
  color: HexString;
}

export interface ConnectedUserData extends UserIds {
  profile: UserProfile | undefined;
}
