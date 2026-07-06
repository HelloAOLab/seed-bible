import type { SessionPort } from "@packages/seed-bible-utils/application/ports/in/session";
// import type { Bot } from "../../../../../../typings/AuxLibraryDefinitions";

interface ControllerParams {
  sessionService: SessionPort;
}

export class SessionController {
  #sessionService: SessionPort;

  constructor({ sessionService }: ControllerParams) {
    this.#sessionService = sessionService;
  }

  handleUserLoggedIn() {
    this.#sessionService.tryEmitUserLoggedInEvent();
  }

  handleOnlineUsersChanged() {
    this.#sessionService.handleOnlineUsersChanged();
  }
}
