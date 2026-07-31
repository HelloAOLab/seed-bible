import type { SessionService } from "@packages/Bible Visualization Utils/bibleVizUtils/application/services/SessionService";
import type { Bot } from "../../../../../../typings/AuxLibraryDefinitions";

export class SessionController {
  #sessionService: SessionService;
  constructor(sessionService: SessionService) {
    this.#sessionService = sessionService;
  }

  handleAnyBotsAdded(addedBots: Bot[]) {
    if (!authBot) return;

    const hasUserJustLoggedIn = addedBots.some((bot) => bot.id === authBot.id);

    if (hasUserJustLoggedIn) {
      this.#sessionService.tryEmitUserLoggedInEvent(true);
    }
  }

  handleOnlineUsersChanged() {
    this.#sessionService.handleOnlineUsersChanged();
  }
}
