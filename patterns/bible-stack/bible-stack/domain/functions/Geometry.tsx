import type { Point3D } from "../models/commonTypes";

export function DirectionToPolar(vector: Point3D) {
  const phi = Math.acos(-vector.z);
  const theta = Math.atan2(-vector.x, vector.y);

  return { phi, theta };
}
