export type EventHandler = (payload?: any) => void;

export const Events = {
  UserLoggedIn: "UserLoggedIn",
  SubscriptionsChanged: "SubscriptionsChanged",
} as const;

export type EventsType = (typeof Events)[keyof typeof Events];

class ScriptureMapEventManager {
  #listeners: Map<string, Set<EventHandler>>;

  static #instance: ScriptureMapEventManager | null = null;

  constructor() {
    this.#listeners = new Map();
  }

  static getInstance(): ScriptureMapEventManager {
    if (!ScriptureMapEventManager.#instance) {
      ScriptureMapEventManager.#instance = new ScriptureMapEventManager();
    }
    return ScriptureMapEventManager.#instance;
  }

  subscribe(eventName: EventsType, callback: EventHandler): () => void {
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

  emit(eventName: EventsType, payload?: void): void {
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

export const scriptureMapEventManager = ScriptureMapEventManager.getInstance();
