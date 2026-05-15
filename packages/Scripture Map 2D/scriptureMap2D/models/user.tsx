import type { ConnectedUserData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/userPresence";

export type UserData = {
  profileName?: string;
  photoLink?: string;
  id: string;
};

export type UsersDataMap = Map<string, ConnectedUserData>;
