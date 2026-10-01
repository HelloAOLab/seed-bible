import type {
  ConnectedUserData,
  UserIdentityMap,
  UserIds,
} from "../../../domain/models/userPresence";

export interface UserIdentityStorePort {
  getUserDataByIds(params: UserIds): ConnectedUserData | undefined;
  getUserColor(params: UserIds): string | undefined;
  listUsers(): ConnectedUserData[];
  tryUpdate(map: UserIdentityMap): boolean;
}
