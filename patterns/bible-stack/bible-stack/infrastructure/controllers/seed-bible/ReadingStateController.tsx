import type { UserPresenceService } from "../../../application/services/UserPresenceService";
import type { UserPresence } from "../../../domain/models/userPresence";
import { ToUserPresence } from "../../../domain/functions/userPresence";

interface ControllerParams {
  userPresenceService: UserPresenceService;
}

export class UserPresenceController {
  #userPresenceService: ControllerParams["userPresenceService"];

  constructor({ userPresenceService }: ControllerParams) {
    this.#userPresenceService = userPresenceService;
  }
  handleUserPresenceChanged(presence: UserPresence) {
    const userPresence = ToUserPresence(presence);
    if (!userPresence) {
      console.warn(
        "bible-stack UserPresenceController: received an invalid user presence",
        { presence }
      );
      return;
    }

    this.#userPresenceService.update(userPresence);
  }
}
