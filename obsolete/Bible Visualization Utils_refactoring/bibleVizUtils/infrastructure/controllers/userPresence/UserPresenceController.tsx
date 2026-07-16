import type { UserPresenceService } from "@packages/Bible Visualization Utils/bibleVizUtils/application/services/UserPresenceService";

export class UserPresenceController {
  #userPresenceService: UserPresenceService;
  constructor(userPresenceService: UserPresenceService) {
    this.#userPresenceService = userPresenceService;
  }

  handleActiveTabDataUpdated() {
    this.#userPresenceService.updateUserPresence();
  }
  handleOnlineUsersChanged() {
    this.#userPresenceService.updateUserPresence();
  }
}
