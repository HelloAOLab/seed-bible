export type EventCallback<TPayload> = (payload: TPayload) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventManagerPort<TEventMap extends Record<string, any>> {
  subscribe<K extends keyof TEventMap>(
    eventName: K,
    callback: EventCallback<TEventMap[K]>
  ): () => void;
  emit<K extends keyof TEventMap>(
    eventName: K,
    ...args: TEventMap[K] extends undefined | void
      ? [payload?: TEventMap[K]]
      : [payload: TEventMap[K]]
  ): void;
  removeAllListeners(): void;
}
