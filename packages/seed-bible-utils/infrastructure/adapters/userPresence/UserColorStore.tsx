import type { UserColorStoreEventPort } from "@packages/seed-bible-utils/domain/ports/session";
import type {
  UserIds,
  UserData,
} from "@packages/seed-bible-utils/domain/models/userPresence";
// import type { UserColorStorePort as PieceActivityUserColorStorePort } from "@packages/seed-bible-utils/domain/ports/pieceActivity";
import type { UserColorStorePort as SessionUserColorStorePort } from "@packages/seed-bible-utils/domain/ports/session";

export class UserColorStore implements SessionUserColorStorePort {
  #userDataList: UserData[];
  #userColorStoreEventPort: UserColorStoreEventPort;

  constructor(userColorStoreEventPort: UserColorStoreEventPort) {
    this.#userDataList = [];
    this.#userColorStoreEventPort = userColorStoreEventPort;
  }

  getUserDataByIds(params: UserIds): UserData | undefined {
    const { configId, authId } = params;

    if (!authId && !configId) return undefined;

    const data = this.#userDataList.find((data) => {
      const matchesConfig = configId && data.configId === configId;
      const matchesAuth = authId && data.authId === authId;

      return matchesConfig || matchesAuth;
    });
    return data;
  }

  addUserColor(params: UserData): void {
    const { configId, authId, color } = params;
    const data = this.getUserDataByIds({ configId, authId });
    if (data) {
      if (!data.configId && configId) data.configId = configId;
      if (!data.authId && authId) data.authId = authId;
      data.color = color;
    } else this.#userDataList.push({ ...params });

    this.#userColorStoreEventPort.emit("UserColorStoreChanged");
  }

  removeUserColor(params: UserIds): boolean {
    const data = this.getUserDataByIds(params);
    if (data) {
      const index = this.#userDataList.indexOf(data);
      if (index >= 0) {
        this.#userDataList.splice(index, 1);
        this.#userColorStoreEventPort.emit("UserColorStoreChanged");
        return true;
      }
    }
    return false;
  }

  getUserColor(params: UserIds): string | undefined {
    const data = this.getUserDataByIds(params);
    if (data) {
      return data.color;
    }
    return undefined;
  }

  listUsers(): UserData[] {
    return this.#userDataList.map((data) => {
      return { ...data };
    });
  }
}
