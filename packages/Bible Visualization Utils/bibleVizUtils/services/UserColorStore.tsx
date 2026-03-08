import type { HexString } from "bibleVizUtils.functions.index";

export interface UserIds {
  configId?: string;
  authId?: string;
}

export interface UserData extends UserIds {
  color: HexString;
}

interface EventManager {
  emit(eventName: "UserColorStoreChanged"): void;
}

export class UserColorStore {
  #UserDataList: UserData[];
  #eventManager: EventManager;

  constructor(eventManager: EventManager) {
    this.#UserDataList = [];
    this.#eventManager = eventManager;
  }

  getUserDataByIds(params: UserIds): UserData | undefined {
    const { configId, authId } = params;

    if (!authId && !configId) return undefined;

    const data = this.#UserDataList.find((data) => {
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
    } else this.#UserDataList.push({ ...params });

    this.#eventManager.emit("UserColorStoreChanged");
  }

  removeUserColor(params: UserIds): boolean {
    const data = this.getUserDataByIds(params);
    if (data) {
      const index = this.#UserDataList.indexOf(data);
      if (index >= 0) {
        this.#UserDataList.splice(index, 1);
        this.#eventManager.emit("UserColorStoreChanged");
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
    return this.#UserDataList.map((data) => {
      return { ...data };
    });
  }
}
