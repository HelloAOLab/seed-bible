import type { UserPresenceService } from "../../../application/services/UserPresenceService";
import type { UserPresence } from "../../../domain/models/userPresence";
import { ToUserPresence } from "../../../domain/functions/userPresence";

function countInstances(presence: Map<unknown, unknown>): number {
  let count = 0;
  for (const instances of presence.values()) {
    if (Array.isArray(instances)) count += instances.length;
  }
  return count;
}

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
    if (
      userPresence.size !== presence.size ||
      countInstances(userPresence) !== countInstances(presence)
    ) {
      console.warn(
        "bible-stack UserPresenceController: dropped invalid reading instances",
        { presence, userPresence }
      );
    }

    this.#userPresenceService.update(userPresence);
  }
}
