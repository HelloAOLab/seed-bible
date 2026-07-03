export const ProjectChapterState = {
  None: "None",
  Assigned: "Assigned",
  InProgress: "InProgress",
  NeedsReview: "NeedsReview",
  Completed: "Completed",
} as const;

export type ProjectChapterStateType =
  (typeof ProjectChapterState)[keyof typeof ProjectChapterState];

export type ProjectStateStyle = Record<
  ProjectChapterStateType,
  React.CSSProperties
>;

export type ProjectFilters = Map<ProjectChapterStateType, boolean>;
