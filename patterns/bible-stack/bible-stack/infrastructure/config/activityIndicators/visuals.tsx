export const ActivityIndicatorVisualConfigs = {
  ChapterOffset: {
    x: 0.075,
    y: 0.075,
    z: 0,
  },
  ChapterStep: {
    x: 0.275,
    y: 0,
    z: 0,
  },
  GroundedForm: "sphere",
  GroundedScales: {
    x: 0.25,
    y: 0.25,
    z: 0.125,
  },
  GroundedExtraUsersBackgroundScales: {
    x: 0.25,
    y: 0.25,
    z: 0.03,
  },
  GroundedExtraUsersContentScales: {
    x: 0.2,
    y: 0.2,
    z: 0.125,
  },
  LabelForm: "circle",
  LabelOffset: {
    x: 0.25,
    y: 0,
    z: 0.1,
  },
  LabelScales: {
    x: 0.5,
    y: 0.5,
    z: 0,
  },
  LabelStep: {
    x: 0.3,
    y: 0,
    z: 0.02,
  },
  LabelExtraUsersBackgroundScales: {
    x: 0.5,
    y: 0.5,
    z: 0,
  },
  LabelExtraUsersContentScales: {
    x: 0.4,
    y: 0.4,
    z: 0,
  },
  ScriptureMapBookOffset: {
    x: 0.1,
    y: 0.1,
    z: 0,
  },
  ScriptureMapBookStep: {
    x: 0.3,
    y: 0,
    z: 0,
  },
} as const;

export type ActivityIndicatorVisualConfig =
  typeof ActivityIndicatorVisualConfigs;
