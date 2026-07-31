import type { PieceKey } from "tabernacle.domain.models.piece";
import type { HitboxData } from "tabernacle.domain.models.hitbox";
import type { HitboxProviderPort } from "tabernacle.application.ports.out.hitboxLifecycle";

const hitboxes: Partial<Record<PieceKey, HitboxData>> = {
  "altar-of-sacrifice": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 1,
    scaleY: 0.65,
    scaleZ: 0.25,
  },
  "ark-of-covenant": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 0.65,
    scaleY: 0.4,
    scaleZ: 0.57,
  },
  bars: {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 1,
    scaleY: 0.3,
    scaleZ: 0.2,
  },
  "bronze-laver": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 0.9,
    scaleY: 0.9,
    scaleZ: 0.57,
    form: "hex",
  },
  "brown-curtain": {
    position: { x: 0, y: 0, z: -0.49 },
    scaleX: 1,
    scaleY: 0.35,
    scaleZ: 0.26,
  },
  "front-curtain": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 0.05,
    scaleY: 0.85,
    scaleZ: 1,
  },
  "front-pillars": {
    position: { x: -0.005, y: 0, z: -0.5 },
    scaleX: 0.07,
    scaleY: 0.94,
    scaleZ: 1,
  },
  "grey-curtain": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 1,
    scaleY: 0.6,
    scaleZ: 0.25,
  },
  "incense-altar": {
    position: { x: 0, y: 0, z: -0.52 },
    scaleX: 0.45,
    scaleY: 0.45,
    scaleZ: 0.73,
  },
  "inner-curtain": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 0.04,
    scaleY: 0.79,
    scaleZ: 1,
  },
  "inner-pillars": {
    position: { x: -0.005, y: 0, z: -0.5 },
    scaleX: 0.07,
    scaleY: 0.89,
    scaleZ: 1,
  },
  menorah: {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 0.7,
    scaleY: 0.3,
    scaleZ: 1,
  },
  "purple-curtain": {
    position: { x: 0.015, y: 0, z: -0.5 },
    scaleX: 0.97,
    scaleY: 0.29,
    scaleZ: 0.25,
  },
  "red-curtain": {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 0.97,
    scaleY: 0.6,
    scaleZ: 0.3,
  },
  rings: {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 1,
    scaleY: 0.31,
    scaleZ: 0.22,
  },
  "table-of-showbread": {
    position: { x: 0, y: 0, z: -0.51 },
    scaleX: 0.59,
    scaleY: 0.3,
    scaleZ: 0.45,
  },
  walls: {
    position: { x: 0, y: 0, z: -0.5 },
    scaleX: 1,
    scaleY: 0.3,
    scaleZ: 0.32,
  },
};

export class HitboxConfigProvider implements HitboxProviderPort {
  getAnchorPoint(): string {
    return "center";
  }
  isDraggable(): boolean {
    return false;
  }
  getColor(): string {
    return "clear";
  }
  isPointable(): boolean {
    return true;
  }

  getHitboxData(key: PieceKey): HitboxData | null {
    return hitboxes[key] ?? null;
  }
}
