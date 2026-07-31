import type { Vector3 as Vector3Type } from "../../../../../typings/AuxLibraryDefinitions";

export function DirectionToPolar(vector: Vector3Type) {
  const phi = Math.acos(-vector.z);
  const theta = Math.atan2(-vector.x, vector.y);

  return { phi, theta };
}
