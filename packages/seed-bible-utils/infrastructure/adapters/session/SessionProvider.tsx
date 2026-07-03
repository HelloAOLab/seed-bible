import type { UserIds } from "@packages/seed-bible-utils/domain/models/userPresence";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { SessionProviderPort } from "@packages/seed-bible-utils/domain/ports/session";

interface ConnectedUserData extends UserIds {
  profile: UserProfile | undefined;
}

interface UserVisual {
  color: string;
  defaultIcon: string;
}

interface ProviderParams {
  state: SeedBibleState;
  /**
   * Computes the deterministic visual (color + icon) for a user key.
   * Injected from bootstrap so this adapter doesn't depend on SessionsManager
   * directly; bootstrap passes SessionsManager's `getUserAnimalVisual`, the
   * single source of truth shared with the session avatars. Keeping it injected
   * guarantees the color/icon a user gets here matches what their avatar shows.
   */
  getUserVisual: (key: string) => UserVisual;
}

export class SessionProvider implements SessionProviderPort {
  #state: ProviderParams["state"];
  #getUserVisual: ProviderParams["getUserVisual"];

  constructor({ state, getUserVisual }: ProviderParams) {
    this.#state = state;
    this.#getUserVisual = getUserVisual;
  }

  getConnectedUsers(): ConnectedUserData[] {
    const connectedUsers: Map<string, ConnectedUserData> = new Map([
      [
        this.#state.os.connectionId,
        {
          configId: this.#state.os.connectionId,
          authId: this.#state.login.userId.value ?? undefined,
          profile: this.#state.login.profile.value ?? undefined,
        },
      ],
    ]);
    for (const tab of this.#state.tabs.tabs.value) {
      if (tab.sharedSession) {
        const users = tab.sharedSession.connectedUsers.value;
        if (users.length > 0) {
          for (const user of users) {
            if (!connectedUsers.has(user.connectionId)) {
              connectedUsers.set(user.connectionId, {
                configId: user.connectionId,
                authId: user.userId ?? undefined,
                profile: user.profile ?? undefined,
              });
            }
          }
        }
      }
    }
    return [...connectedUsers.values()];
  }

  getOwnUserConnectionId() {
    return this.#state.os.connectionId;
  }

  getConnectedUsersConfigId() {
    return this.getConnectedUsers().map((user) => {
      return user.configId!;
    });
  }
  // getConnectedUsersAuthMapList(): ConnectedUserData[] | undefined {
  //   return this.#connectedUsersProviderPort.getConnectedUsers().map((user) => {
  //     return {
  //       configId: user.configId,
  //       authId: user.authId,
  //     };
  //   });
  // }
  getUserColorById(id: string): string {
    return this.#getUserVisual(id).color;
  }

  getUserIconById(id: string): string {
    return this.#getUserVisual(id).defaultIcon;
  }

  getAuthIdByConnectionId(id: string): string | undefined {
    return (
      this.getConnectedUsers().find((user) => {
        return user.configId === id;
      })?.authId ?? undefined
    );
  }
}
