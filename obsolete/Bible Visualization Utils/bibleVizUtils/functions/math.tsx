type RoundToStepType = (value: number, step?: number) => number;
type IsValueBetweenType = (params: {
  value: number;
  min: number;
  max: number;
}) => boolean;

export const RoundToStep: RoundToStepType = (value, step = 0.25) => {
  return Math.round(value / step) * step;
};

export const IsValueBetween: IsValueBetweenType = ({ value, min, max }) => {
  return value >= min && value <= max;
};
