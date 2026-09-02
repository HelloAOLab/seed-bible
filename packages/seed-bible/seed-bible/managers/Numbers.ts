export type RoundToStepType = (value: number, step?: number) => number;
export type IsValueBetweenType = (params: {
  value: number;
  min: number;
  max: number;
}) => boolean;
type ClosestNumberType = (params: { arr: number[]; input: number }) => number;

export const RoundToStep: RoundToStepType = (value, step = 0.25) => {
  return Math.round(value / step) * step;
};

export const IsValueBetween: IsValueBetweenType = ({ value, min, max }) => {
  return value >= min && value <= max;
};

export const ClosestNumber: ClosestNumberType = ({ arr, input }) => {
  if (arr.length < 2) {
    console.error("You must provide a valid array at ClosestNumber");
    return input;
  }

  let closest = arr[0] as number;
  let closestDifference = Math.abs(input - closest);

  for (let i = 1; i < arr.length; i++) {
    const value = arr[i] as number;
    const difference = Math.abs(input - value);

    if (difference < closestDifference) {
      closest = value;
      closestDifference = difference;
    }
  }

  return closest;
};
