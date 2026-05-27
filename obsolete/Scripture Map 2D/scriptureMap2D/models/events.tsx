export const ScriptureMap2DEvents = {
  UserLoggedIn: "UserLoggedIn",
  SubscriptionsChanged: "SubscriptionsChanged",
} as const;

export type ScriptureMap2DEvent =
  (typeof ScriptureMap2DEvents)[keyof typeof ScriptureMap2DEvents];
