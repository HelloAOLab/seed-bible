import type { UserReadingInstance } from "../../../domain/models/reading";
import type { UserPresence } from "../../../domain/models/userPresence";

export interface UserPresenceProviderPort {
  getSelectedReadingInstance: () => UserReadingInstance | undefined;
  getRemotesPresence: () => UserPresence;
  getCurrUserId: () => string;
}
