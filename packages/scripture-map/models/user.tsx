import type { ConnectedUserData } from "../../seed-bible-utils/domain/models/userPresence";

export type UserData = {
  profileName?: string;
  photoLink?: string;
  id: string;
};

export type UsersDataMap = Map<string, ConnectedUserData>;
