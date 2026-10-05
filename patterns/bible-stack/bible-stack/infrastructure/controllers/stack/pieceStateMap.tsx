import type { PieceState } from "../../../domain/models/canvas";

/**
 * Translation table from CasualOS transform tags to domain `PieceState`
 * properties. Position tags are dimension-prefixed (e.g. `homeX`), so the map
 * is built against the current dimension. Tags with no domain counterpart
 * return `undefined` on lookup (callers guard for that).
 */
export const createPieceStateMap = (
  dimension: string
): Partial<Record<string, keyof PieceState>> => ({
  [dimension + "X"]: "positionX",
  [dimension + "Y"]: "positionY",
  [dimension + "Z"]: "positionZ",
  scaleX: "sizeX",
  scaleY: "sizeY",
  scaleZ: "sizeZ",
});
