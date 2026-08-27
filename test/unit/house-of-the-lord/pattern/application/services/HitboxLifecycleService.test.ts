import { describe, expect, it, vi, type Mocked, beforeEach } from "vitest";
import { HitboxLifecycleService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/HitboxLifecycleService";
import type {
  HitboxProviderPort,
  PiecesProviderPort,
  HitboxSpawnerPort,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/hitboxLifecycle";
import {
  EXPERIENCE_KEYS,
  type ExperienceKeyMap,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import type { Piece } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";
import type {
  Hitbox,
  HitboxData,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/hitbox";

describe("application.service.HitboxLifecycleService", () => {
  let service: HitboxLifecycleService;
  let piecesProviderPort: Mocked<PiecesProviderPort>;
  let hitboxProviderPort: Mocked<HitboxProviderPort>;
  let hitboxSpawnerPort: Mocked<HitboxSpawnerPort>;
  const key = EXPERIENCE_KEYS.TABERNACLE;
  const pieces = [
    {
      key: "altar-of-sacrifice",
      id: "altar-id",
    },
    {
      key: "bronze-laver",
      id: "laver-id",
    },
    {
      key: "front-curtain",
      id: "curtain-id",
    },
  ] satisfies Piece<ExperienceKeyMap[typeof key]>[];

  beforeEach(() => {
    piecesProviderPort = {
      getPieces: vi.fn(),
    };
    hitboxProviderPort = {
      getHitboxData: vi.fn(),
      getAnchorPoint: vi.fn(),
      isDraggable: vi.fn(),
      getColor: vi.fn(),
      isPointable: vi.fn(),
    };
    hitboxSpawnerPort = {
      spawn: vi.fn(),
    };
    service = new HitboxLifecycleService({
      piecesProviderPort,
      hitboxProviderPort,
      hitboxSpawnerPort,
    });
  });

  it("returns an empty array if no pieces found", () => {
    piecesProviderPort.getPieces.mockImplementation(() => {
      return [];
    });
    const hitboxes = service.spawnPiecesHitbox(EXPERIENCE_KEYS.TABERNACLE);

    expect(hitboxes).toHaveLength(0);
  });

  it("skips pieces without hitbox data", () => {
    piecesProviderPort.getPieces.mockImplementation(() => pieces);
    hitboxProviderPort.getHitboxData.mockImplementation(
      (experience, pieceKey) => {
        if (pieceKey === "bronze-laver") {
          return null;
        }
        return {} as HitboxData;
      }
    );
    hitboxSpawnerPort.spawn.mockImplementation(() => {
      return {} as Hitbox;
    });

    const result = service.spawnPiecesHitbox(key);

    expect(result).toHaveLength(2);
    expect(hitboxSpawnerPort.spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        piece: expect.objectContaining({
          key: "altar-of-sacrifice",
        }),
      })
    );
    expect(hitboxSpawnerPort.spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        piece: expect.objectContaining({
          key: "front-curtain",
        }),
      })
    );
    expect(hitboxSpawnerPort.spawn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        piece: expect.objectContaining({
          key: "bronze-laver",
        }),
      })
    );
  });

  it("spawns a hitbox per piece with data, forwarding the right values", () => {
    const dataList: Partial<Record<ExperienceKeyMap[typeof key], HitboxData>> =
      {
        "altar-of-sacrifice": {
          scaleX: 1,
          scaleY: 2,
          scaleZ: 3,
          position: { x: 1, y: 2, z: 3 },
        },
        "bronze-laver": {
          scaleX: 2,
          scaleY: 3,
          scaleZ: 4,
          position: { x: 2, y: 3, z: 4 },
        },
        "front-curtain": {
          scaleX: 3,
          scaleY: 4,
          scaleZ: 5,
          position: { x: 3, y: 4, z: 5 },
        },
      };

    piecesProviderPort.getPieces.mockImplementation(() => pieces);
    hitboxProviderPort.getHitboxData.mockImplementation((_, pieceKey) => {
      return dataList[pieceKey] ?? null;
    });
    hitboxSpawnerPort.spawn.mockImplementation(() => ({}) as Hitbox);

    service.spawnPiecesHitbox(key);

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]!;
      const hitboxDataCall = hitboxProviderPort.getHitboxData.mock.calls[i]!;
      expect(hitboxDataCall).toEqual([key, piece?.key]);
      const spawnCall = hitboxSpawnerPort.spawn.mock.calls[i]!;
      expect(spawnCall).toEqual([
        {
          data: dataList[piece.key!],
          piece,
        },
      ]);
    }
  });
});
