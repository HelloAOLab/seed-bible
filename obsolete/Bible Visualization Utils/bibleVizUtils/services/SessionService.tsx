import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

interface EventManager {
  emit: (eventName: "OnUserLoggedIn", payload?: any) => void;
}

export class SessionService {
  #hasLoginEventBeenEmitted = false;
  #eventManager: EventManager;

  constructor(eventManager: EventManager) {
    this.#eventManager = eventManager;
  }

  tryEmitUserLoggedInEvent(authBot: Bot | null): void {
    if (!authBot || this.#hasLoginEventBeenEmitted) return;

    this.#eventManager.emit("OnUserLoggedIn");
    this.#hasLoginEventBeenEmitted = true;
  }
}
