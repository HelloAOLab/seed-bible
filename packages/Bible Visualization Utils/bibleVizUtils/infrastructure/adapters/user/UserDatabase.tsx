import type { UserDatabasePort } from "bibleVizUtils.domain.ports.session";
import { getSubscribedUsers } from "db.annotations.library";

export class UserDatabase implements UserDatabasePort {
  getSubscribedUsers() {
    return getSubscribedUsers();
  }
}
