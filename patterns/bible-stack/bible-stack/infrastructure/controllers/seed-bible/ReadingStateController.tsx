import type { UserPresenceService } from "../../../application/services/UserPresenceService";
import { ToUserPresence } from "../../../domain/functions/userPresence";

function countInstances(instancesLists: Iterable<unknown>): number {
  let count = 0;
  for (const instances of instancesLists) {
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
  handleUserPresenceChanged(presence: unknown) {
    const userPresence = ToUserPresence(presence);
    if (!userPresence) {
      console.warn(
        "bible-stack UserPresenceController: received an invalid user presence",
        { presence }
      );
      return;
    }
    const received = Object.values(presence as Record<string, unknown>);
    if (
      userPresence.size !== received.length ||
      countInstances(userPresence.values()) !== countInstances(received)
    ) {
      console.warn(
        "bible-stack UserPresenceController: dropped invalid reading instances",
        { presence, userPresence }
      );
    }

    this.#userPresenceService.update(userPresence);
  }
}
