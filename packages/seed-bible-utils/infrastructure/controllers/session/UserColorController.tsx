import { DebouncerService } from "../../utils/DebouncerService";
import type { UserColorSyncPort } from "@packages/seed-bible-utils/application/ports/in/userColorSync";

export class UserColorController {
  #debouncedSync: DebouncerService;

  constructor(userColorSyncService: UserColorSyncPort) {
    this.#debouncedSync = new DebouncerService(
      () => userColorSyncService.syncUserColors(),
      500
    );
  }

  handleUserLogin() {
    this.syncUserColors();
  }

  handleUserSubscribed() {
    this.syncUserColors();
  }

  handleUserUnsubscribed() {
    this.syncUserColors();
  }

  handleGetOrSetVisualInTagsDefined() {
    this.syncUserColors();
  }

  handleOnlineUsersChanged() {
    this.syncUserColors();
  }

  syncUserColors() {
    this.#debouncedSync.execute();
  }
}
