import type { UserIds } from "@packages/seed-bible-utils/domain/models/userPresence";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { SessionProviderPort } from "@packages/seed-bible-utils/domain/ports/session";

interface ConnectedUserData extends UserIds {
  profile: UserProfile | undefined;
}

interface ProviderParams {
  state: SeedBibleState;
  colors: string[];
  icons: string[];
}

export class SessionProvider implements SessionProviderPort {
  #state: ProviderParams["state"];
  #colors: ProviderParams["colors"];
  #icons: ProviderParams["icons"];

  constructor({ state, colors, icons }: ProviderParams) {
    this.#state = state;
    this.#colors = colors;
    this.#icons = icons;
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
    return this.#getDeterministicColor(id);
  }

  getUserIconById(id: string): string {
    return this.#getDeterministicIcon(id);
  }

  getAuthIdByConnectionId(id: string): string | undefined {
    return (
      this.getConnectedUsers().find((user) => {
        return user.configId === id;
      })?.authId ?? undefined
    );
  }

  #getHashString(str: string): number {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return h >>> 0;
  }

  #getDeterministicColor(key: string): string {
    const hashString = this.#getHashString(key);
    const iconsLenght = 10; // TODO: This hardcoded value is the amount of icons. This should be imported or inyected when possible.
    const colorIndex =
      Math.floor(hashString / iconsLenght) % this.#colors.length;

    const color = this.#colors[colorIndex];
    return color ?? "#E5E7EB";
  }

  #getDeterministicIcon(id: string): string {
    const normalized = id && id.length > 0 ? id : "anonymous";
    const hash = this.#getHashString(normalized);
    const iconIndex = hash % this.#icons.length;
    return this.#icons[iconIndex]!;
  }
}
