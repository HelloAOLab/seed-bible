import type { UserDatabasePort } from "bibleVizUtils.domain.ports.session";
import { getSubscribedUsers } from "seed-bible.managers.ReadingHistoryManager";

export class UserDatabase implements UserDatabasePort {
  getSubscribedUsers() {
    return getSubscribedUsers();
  }
}
