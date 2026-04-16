export interface ScriptureMap2DEvents {
  UserLoggedIn: void;
  SubscriptionsChanged: void;
}

export type ScriptureMap2DEvent = keyof ScriptureMap2DEvents;
