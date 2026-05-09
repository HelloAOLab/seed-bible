import type { SessionEventPort } from "bibleVizUtils.domain.ports.session";

export class SessionService {
  #hasLoginEventBeenEmitted = false;
  #sessionEventPort: SessionEventPort;

  constructor(sessionEventPort: SessionEventPort) {
    this.#sessionEventPort = sessionEventPort;
  }

  tryEmitUserLoggedInEvent(isLogged: boolean): void {
    if (!isLogged || this.#hasLoginEventBeenEmitted) return;

    this.#hasLoginEventBeenEmitted = true;
    this.#sessionEventPort.emit("OnUserLoggedIn");
  }
}
