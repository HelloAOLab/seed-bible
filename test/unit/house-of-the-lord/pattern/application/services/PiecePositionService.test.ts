import { describe, expect, it, vi, type Mocked, beforeEach } from "vitest";
import { PiecePositionService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/PiecePositionService";
import type {
  PiecePositionProviderPort,
  PiecePositionUpdaterPort,
  PiecesProviderPort,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/piecePosition";
import type { Piece } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";
import {
  EXPERIENCE_KEYS,
  type ExperienceKeyMap,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import type { Point3D } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/commonTypes";

describe("application.services.PiecePositionService", () => {
  let piecesProviderPort: Mocked<PiecesProviderPort>;
  let piecePositionUpdaterPort: Mocked<PiecePositionUpdaterPort>;
  let piecePositionProviderPort: Mocked<PiecePositionProviderPort>;
  let service: PiecePositionService;

  const experience = EXPERIENCE_KEYS.TABERNACLE;
  const pieces: Piece<ExperienceKeyMap[typeof experience]>[] = [
    {
      key: "ark-of-covenant",
      id: "ark-id",
    },
    {
      key: "fence",
      id: "fende-id",
    },
    {
      key: "ground",
      id: "ground-id",
    },
  ];
  const piecesPosition: Partial<
    Record<ExperienceKeyMap[typeof experience], Point3D>
  > = {
    "ark-of-covenant": { x: 0, y: 1, z: 2 },
    fence: { x: 1, y: 2, z: 3 },
    ground: { x: 2, y: 3, z: 4 },
  };

  beforeEach(() => {
    piecesProviderPort = {
      getPieces: vi.fn(() => pieces),
    };
    piecePositionUpdaterPort = {
      setPosition: vi.fn(),
    };
    piecePositionProviderPort = {
      getPiecePosition: vi.fn((_, pieceKey) => piecesPosition[pieceKey]!),
    };
    service = new PiecePositionService({
      piecePositionProviderPort,
      piecePositionUpdaterPort,
      piecesProviderPort,
    });
  });

  it("gets pieces for the provided experience", () => {
    service.updatePositions(experience);
    expect(piecesProviderPort.getPieces).toHaveBeenCalledWith(experience);
  });

  it("gets position for all the provided pieces", () => {
    service.updatePositions(experience);
    for (const piece of pieces) {
      expect(piecePositionProviderPort.getPiecePosition).toHaveBeenCalledWith(
        experience,
        piece.key
      );
    }
  });

  it("updates each provided piece with its provided position", () => {
    service.updatePositions(experience);
    for (const piece of pieces) {
      expect(piecePositionUpdaterPort.setPosition).toHaveBeenCalledWith(
        piece,
        piecesPosition[piece.key]
      );
    }
  });

  it("does not call setPosition if no pieces provided", () => {
    piecesProviderPort.getPieces.mockImplementation(() => []);
    service.updatePositions(experience);
    expect(piecePositionUpdaterPort.setPosition).toHaveBeenCalledTimes(0);
  });
});
