import type { UserIds } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/userPresence";
import type { SessionProviderPort } from "bibleVizUtils.domain.ports.session";

interface ConnectedUsersProviderPort {
  getConnectedUsers(): UserIds[];
}

interface ProviderParams {
  connectedUsersProviderPort: ConnectedUsersProviderPort;
  colors: string[];
}

export class SessionProvider implements SessionProviderPort {
  #connectedUsersProviderPort: ProviderParams["connectedUsersProviderPort"];
  #colors: ProviderParams["colors"];

  constructor({ connectedUsersProviderPort, colors }: ProviderParams) {
    this.#connectedUsersProviderPort = connectedUsersProviderPort;
    this.#colors = colors;
  }

  getConnectedUsersConfigId() {
    return this.#connectedUsersProviderPort.getConnectedUsers().map((user) => {
      return user.configId!;
    });
  }
  getConnectedUsersAuthMapList(): UserIds[] | undefined {
    return this.#connectedUsersProviderPort.getConnectedUsers().map((user) => {
      return {
        configId: user.configId,
        authId: user.authId,
      };
    });
  }
  getUserColorById(id: string): string {
    return this.#getDeterministicColor(id);
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
}
