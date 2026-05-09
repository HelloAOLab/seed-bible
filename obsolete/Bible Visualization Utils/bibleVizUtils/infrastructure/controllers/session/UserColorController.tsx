import { DebouncerService } from "bibleVizUtils.infrastructure.utils.DebouncerService";
import type { UserColorSyncService } from "bibleVizUtils.application.services.UserColorSyncService";

export class UserColorController {
  #debouncedSync: DebouncerService;

  constructor(userColorSyncService: UserColorSyncService) {
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
