import type { UserPresencePort } from "@packages/seed-bible-utils/application/ports/in/userPresence";

export class UserPresenceController {
  #userPresenceService: UserPresencePort;
  constructor(userPresenceService: UserPresencePort) {
    this.#userPresenceService = userPresenceService;
  }

  handleActiveTabDataUpdated() {
    this.#userPresenceService.updateUserPresence();
  }
  handleOnlineUsersChanged() {
    this.#userPresenceService.updateUserPresence();
  }
}
