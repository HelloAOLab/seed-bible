export type EventManagerType = (payload?: any) => void;

export const Events = {
  UserColorStoreChanged: "UserColorStoreChanged",
  OnlineUsersChanged: "OnlineUsersChanged",
  OnEnterHistoryMode: "OnEnterHistoryMode",
  OnExitHistoryMode: "OnExitHistoryMode",
  OnUserPresenceUpdate: "OnUserPresenceUpdate",
  OnUserLoggedIn: "OnUserLoggedIn",
  OnCustomArrangementsChanged: "OnCustomArrangementsChanged",
  OnArrangementIndexChanged: "OnArrangementIndexChanged",
} as const;

export type EventsType = (typeof Events)[keyof typeof Events];

export class BibleVizUtilsEventManager {
  #listeners: Map<string, Set<EventManagerType>>;

  constructor() {
    this.#listeners = new Map();
  }

  subscribe(eventName: EventsType, callback: EventManagerType): () => void {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    const eventListeners = this.#listeners.get(eventName);
    if (eventListeners) {
      eventListeners.add(callback);
    }

    return () => {
      const currentListeners = this.#listeners.get(eventName);
      if (currentListeners) {
        currentListeners.delete(callback);
        if (currentListeners.size === 0) {
          this.#listeners.delete(eventName);
        }
      }
    };
  }

  emit(eventName: EventsType, payload?: any): void {
    const eventListeners = this.#listeners.get(eventName);

    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(
            `Error executing listener for event "${eventName}":`,
            error
          );
        }
      });
    }
  }
}
