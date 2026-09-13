import type {
  ConnectedUserData,
  UserIds,
} from "../../../domain/models/userPresence";

export interface UserIdentityPort {
  getUserDataByIds(params: UserIds): ConnectedUserData | undefined;
}
