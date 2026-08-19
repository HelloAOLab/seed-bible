export type RoundToStepType = (value: number, step?: number) => number;

export const RoundToStep: RoundToStepType = (value, step = 0.25) => {
  return Math.round(value / step) * step;
};
