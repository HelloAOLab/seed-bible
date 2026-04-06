export const ScriptureMap2DModes = {
  Viewer: "Viewer",
  Checkbox: "Checkbox",
  Project: "Project",
} as const;

export type ScriptureMap2DModesType =
  (typeof ScriptureMap2DModes)[keyof typeof ScriptureMap2DModes];
