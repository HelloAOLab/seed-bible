import type { SeedBibleUtilsEvents } from "../models/events";
import type {
  UserIds,
  UserData,
  ConnectedUserData,
} from "@packages/seed-bible-utils/domain/models/userPresence";
import type { SubscribedUser } from "../models/subscriptions";
import type { HexString } from "../models/commonTypes";

export interface SessionEventPort {
  emit: <K extends "OnUserLoggedIn" | "OnlineUsersChanged">(
    eventName: K,
    ...args: SeedBibleUtilsEvents[K] extends undefined | void
      ? [payload?: SeedBibleUtilsEvents[K]]
      : [payload: SeedBibleUtilsEvents[K]]
  ) => void;
}

export interface UserColorStoreEventPort {
  emit: <K extends "UserColorStoreChanged">(
    eventName: K,
    ...args: SeedBibleUtilsEvents[K] extends undefined | void
      ? [payload?: SeedBibleUtilsEvents[K]]
      : [payload: SeedBibleUtilsEvents[K]]
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
  getOwnUserConnectionId(): string;
}

export interface UserDatabasePort {
  getSubscribedUsers: () => Promise<SubscribedUser[] | null>;
}
