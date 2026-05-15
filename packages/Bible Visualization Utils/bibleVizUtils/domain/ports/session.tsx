import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import type {
  UserIds,
  UserData,
  ConnectedUserData,
} from "bibleVizUtils.domain.models.userPresence";
import type { SubscribedUser } from "bibleVizUtils.domain.models.subscriptions";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

export interface SessionEventPort {
  emit: <K extends "OnUserLoggedIn" | "OnlineUsersChanged">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}

export interface UserColorStoreEventPort {
  emit: <K extends "UserColorStoreChanged">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}

export interface UserColorStorePort {
  getUserColor: (params: UserIds) => string | undefined;
  addUserColor: (params: UserData) => void;
  removeUserColor: (params: UserIds) => boolean;
}

export interface SessionProviderPort {
  getConnectedUsersConfigId: () => string[];
  getConnectedUsers(): ConnectedUserData[];
  getUserColorById: (id: string) => HexString | undefined;
}

export interface UserDatabasePort {
  getSubscribedUsers: () => Promise<SubscribedUser[] | null>;
}
