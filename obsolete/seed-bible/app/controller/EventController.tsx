export class EventController<
  T extends { [K in keyof T]: (...args: any[]) => void },
> {
  private eventListeners: Record<keyof T, Function[]> = {} as Record<
    keyof T,
    Function[]
  >;

  constructor() {}

  on<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(
      (l) => l !== listener
    );
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((listener) => listener(...args));
  }
}
