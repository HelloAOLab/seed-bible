export type EventMap<E extends string = string> = Record<
  E,
  (...args: any[]) => void
>;

/**
 * Defines the shape of global hooks that can be emitted and listened to across the app.
 */
export interface GlobalHookEventSpec {
  setCanvasStylePositions: (positions: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius: string;
  }) => void;
}
