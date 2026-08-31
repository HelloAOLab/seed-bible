import type { UserPresenceService } from "../../../application/services/UserPresenceService";
import type { UserPresence } from "../../../domain/models/userPresence";

interface ControllerParams {
  userPresenceService: UserPresenceService;
}

export class UserPresenceController {
  #userPresenceService: ControllerParams["userPresenceService"];

  constructor({ userPresenceService }: ControllerParams) {
    this.#userPresenceService = userPresenceService;
  }
  handleUserPresenceChanged(presence: UserPresence) {
    this.#userPresenceService.update(presence);
  }
}
