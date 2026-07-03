import type { SessionEventPort } from "@packages/seed-bible-utils/domain/ports/session";
import type { SessionPort } from "@packages/seed-bible-utils/application/ports/in/session";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers";

interface ServiceParams {
  loginManager: LoginManager;
  sessionEventPort: SessionEventPort;
}

export class SessionService implements SessionPort {
  #hasLoginEventBeenEmitted = false;
  #sessionEventPort: ServiceParams["sessionEventPort"];
  #loginManager: ServiceParams["loginManager"];

  constructor({ loginManager, sessionEventPort }: ServiceParams) {
    this.#sessionEventPort = sessionEventPort;
    this.#loginManager = loginManager;
  }

  tryEmitUserLoggedInEvent(): void {
    if (!this.#loginManager.userId || this.#hasLoginEventBeenEmitted) return;

    this.#hasLoginEventBeenEmitted = true;
    this.#sessionEventPort.emit("OnUserLoggedIn");
  }

  handleOnlineUsersChanged() {
    this.#sessionEventPort.emit("OnlineUsersChanged");
  }
}
