import type { Vector3 as Vector3Type } from "../../../../../typings/AuxLibraryDefinitions";

export type RoundToStepType = (value: number, step?: number) => number;
export type IsValueBetweenType = (params: {
  value: number;
  min: number;
  max: number;
}) => boolean;
type ClosestNumberType = (params: { arr: number[]; input: number }) => number;
type GetCamRotationFocusPointType = (params: {
  theta: number;
  phi: number;
  botPosition: Vector3Type;
}) => Vector3Type;

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

export const GetCamRotationFocusPoint: GetCamRotationFocusPointType = ({
  theta,
  phi,
  botPosition,
}) => {
  const x = Math.sin(phi) * Math.cos(theta + math.degreesToRadians(270));
  const y = Math.sin(phi) * Math.sin(theta + math.degreesToRadians(270));
  const z = Math.cos(phi);
  const camDesiredForwardDirection = new Vector3(x, y, z).negate().normalize();
  const camDesiredForwardDirectionXY = new Vector3(
    camDesiredForwardDirection.x,
    camDesiredForwardDirection.y,
    0
  ).normalize();
  const vectorZ = new Vector3(0, 0, camDesiredForwardDirection.z > 0 ? 1 : -1);
  const angleBetween =
    math.degreesToRadians(90) -
    Vector3.angleBetween(camDesiredForwardDirection, vectorZ);
  const vectorMagnitude = botPosition.z / Math.tan(angleBetween);
  const desiredFocusOnPosition = new Vector3(
    botPosition.x,
    botPosition.y,
    0
  ).add(camDesiredForwardDirectionXY.multiplyScalar(vectorMagnitude));
  return desiredFocusOnPosition;
};
