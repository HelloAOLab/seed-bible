export interface ScriptureMapEvents {
  UserLoggedIn: void;
  SubscriptionsChanged: void;
}

export type ScriptureMapEvent = keyof ScriptureMapEvents;
