import type { UserIdentityPort } from "../../../application/ports/out/UserIdentity";
import type {
  UserIds,
  ConnectedUserData,
  UserIdentityMap,
  UserProfile,
} from "../../../domain/models/userPresence";
import type { InfrastructureEventManager } from "../../models/events";

interface StoreParams {
  eventBus: InfrastructureEventManager;
}

export class UserIdentityStore implements UserIdentityPort {
  #userDataList: ConnectedUserData[];
  #eventBus: StoreParams["eventBus"];

  constructor({ eventBus }: StoreParams) {
    this.#userDataList = [];
    this.#eventBus = eventBus;
  }

  getUserDataByIds(params: UserIds): ConnectedUserData | undefined {
    const { connectionId, userId } = params;

    if (!userId && !connectionId) return undefined;

    const data = this.#userDataList.find((data) => {
      const matchesConnection =
        connectionId && data.connectionId === connectionId;
      const matchesUser = userId && data.userId === userId;

      return matchesConnection || matchesUser;
    });
    return data;
  }

  getUserColor(params: UserIds): string | undefined {
    const data = this.getUserDataByIds(params);
    if (data) {
      return data.visual.color;
    }
    return undefined;
  }

  listUsers(): ConnectedUserData[] {
    return this.#userDataList.map((data) => {
      return { ...data };
    });
  }

  #isSameIdentity(newIdentity: UserIdentityMap): boolean {
    if (this.#userDataList.length !== newIdentity.size) return false;

    for (const [connectionId, incoming] of newIdentity) {
      const current = this.getUserDataByIds({ connectionId });
      if (!current) return false;
      if (!this.#isSameUserData(current, incoming)) return false;
    }

    return true;
  }

  #isSameUserData(
    first: ConnectedUserData,
    second: ConnectedUserData
  ): boolean {
    return (
      first.userId === second.userId &&
      first.visual.defaultIcon === second.visual.defaultIcon &&
      first.visual.color === second.visual.color &&
      first.visual.colorName === second.visual.colorName &&
      this.#isSameProfile(first.profile, second.profile)
    );
  }

  #isSameProfile(
    first: UserProfile | undefined,
    second: UserProfile | undefined
  ): boolean {
    if (first === second) return true;
    if (!first || !second) return false;
    return (
      first.name === second.name &&
      first.location === second.location &&
      first.pictureUrl === second.pictureUrl &&
      first.description === second.description
    );
  }

  #parseIdentity(map: UserIdentityMap): ConnectedUserData[] {
    return [...map.values()].map(({ profile, visual, ...rest }) => {
      return {
        profile: profile ? { ...profile } : undefined,
        visual: { ...visual },
        ...rest,
      };
    });
  }

  tryUpdate(map: UserIdentityMap): boolean {
    const hasChanged = !this.#isSameIdentity(map);
    if (!hasChanged) return false;

    this.#userDataList = this.#parseIdentity(map);
    this.#eventBus.emit("OnUserIdentityChanged");
    return true;
  }
}
