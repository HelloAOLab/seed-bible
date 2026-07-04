import type { Point3D } from "bibleVizUtils.domain.models.commonTypes";
import type { PieceKey } from "tabernacle.domain.models.piece";
import type { PiecePositionProviderPort } from "tabernacle.application.ports.out.piecePosition";

const positions: Record<PieceKey, Point3D> = {
  "altar-of-sacrifice": { x: 8.26, y: 0, z: -1.695 },
  "ark-of-covenant": { x: -7.48, y: 0, z: -0.28 },
  bars: { x: -4.853, y: 0.15, z: -3.07 },
  "bronze-laver": { x: 3.3, y: 0, z: -0.2 },
  "brown-curtain": { x: -4.9, y: 0.249, z: -3.9 },
  fence: { x: 0, y: 0, z: -14.3 },
  "front-curtain": { x: -0.02, y: 0, z: 0 },
  "front-pillars": { x: 0.104, y: 0.15, z: 0 },
  "grey-curtain": { x: -4.9, y: 0.18, z: -3.96 },
  ground: { x: 0, y: 0, z: -15 },
  "incense-altar": { x: -5.1, y: 0, z: -0.1 },
  "inner-curtain": { x: -6.16, y: 0.16, z: 0 },
  "inner-pillars": { x: -6.036, y: 0.134, z: 0 },
  menorah: { x: -3.1, y: -0.85, z: 0 },
  "purple-curtain": { x: -4.66, y: 0.15, z: -3.59 },
  "red-curtain": { x: -4.7, y: 0.15, z: -3.85 },
  rings: { x: -4.88, y: 0.15, z: -3.05 },
  "table-of-showbread": { x: -3.05, y: 1.1, z: -0.4 },
  walls: { x: -4.75, y: 0.15, z: -3.23 },
};

export class PiecePositionConfigProvider implements PiecePositionProviderPort {
  getPiecePosition<K extends PieceKey>(key: K): Point3D {
    return positions[key];
  }
}
