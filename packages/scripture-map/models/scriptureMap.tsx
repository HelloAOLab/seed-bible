export const ScriptureMapModes = {
  Viewer: "Viewer",
  Checkbox: "Checkbox",
  Project: "Project",
} as const;

export type ScriptureMapModesType =
  (typeof ScriptureMapModes)[keyof typeof ScriptureMapModes];
