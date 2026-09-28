import type { UserIdentityStore } from "../../adapters/userPresence/UserIdentityStore";
import { ToUserIdentityMap } from "../../../domain/functions/userPresence";

interface ControllerParams {
  userIdentityStore: UserIdentityStore;
}

export class UserIdentityController {
  #userIdentityStore: ControllerParams["userIdentityStore"];

  constructor({ userIdentityStore }: ControllerParams) {
    this.#userIdentityStore = userIdentityStore;
  }

  handleUserIdentityChanged(identity: unknown) {
    const userIdentity = ToUserIdentityMap(identity);
    if (!userIdentity) {
      console.warn(
        "bible-stack UserIdentityController: received an invalid user identity",
        { identity }
      );
      return;
    }
    if (identity instanceof Map && userIdentity.size !== identity.size) {
      console.warn(
        "bible-stack UserIdentityController: dropped invalid user identity entries",
        { identity, userIdentity }
      );
    }

    this.#userIdentityStore.tryUpdate(userIdentity);
  }
}
