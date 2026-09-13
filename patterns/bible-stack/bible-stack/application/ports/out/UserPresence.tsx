import type { ReadingInstance } from "../../../domain/models/userPresence";
import type { UserPresence } from "../../../domain/models/userPresence";

export interface UserPresenceProviderPort {
  getSelectedReadingInstance: () => ReadingInstance | undefined;
  getRemotesPresence: () => UserPresence;
  getCurrUserId: () => string;
}
