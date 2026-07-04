import type { UserDatabasePort } from "@packages/seed-bible-utils/domain/ports/session";
// import { getSubscribedUsers } from "seed-bible.managers.ReadingHistoryManager";

export class UserDatabase implements UserDatabasePort {
  async getSubscribedUsers() {
    return []; // getSubscribedUsers();
  }
}
