export const ScriptureMap2DModes = {
  Viewer: "Viewer",
  Checkbox: "Checkbox",
  Project: "Project",
} as const;

export type ScriptureMap2DModesType =
  (typeof ScriptureMap2DModes)[keyof typeof ScriptureMap2DModes];

export const ProjectChapterState = {
  None: "None",
  Assigned: "Assigned",
  InProgress: "InProgress",
  NeedsReview: "NeedsReview",
  Completed: "Completed",
} as const;

export type ProjectChapterStateType =
  (typeof ProjectChapterState)[keyof typeof ProjectChapterState];

export const TimelineRangeMethod = {
  Rolling: "Rolling",
  Calendar: "Calendar",
} as const;

export type TimelineRangeMethodType =
  (typeof TimelineRangeMethod)[keyof typeof TimelineRangeMethod];
