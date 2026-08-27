import { describe, expect, it, vi, type Mocked } from "vitest";
import { PiecesSetUpService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/PiecesSetUpService";
import type { UpdatePiecesPositionPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/piecePosition";
import type { HitboxSpawnerPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/hitboxLifecycle";
import type { PiecesRenderOrderPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/piecesSetUp";
import { EXPERIENCE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";

describe("application.services.PiecesSetUpService", () => {
  it("orchestrates the setup with the correct experience key", () => {
    const updatePiecesPositionPort: Mocked<UpdatePiecesPositionPort> = {
      updatePositions: vi.fn(),
    };
    const hitboxSpawnerPort: Mocked<HitboxSpawnerPort> = {
      spawnPiecesHitbox: vi.fn(),
    };
    const piecesRenderOrderPort: Mocked<PiecesRenderOrderPort> = {
      setOrder: vi.fn(),
    };
    const service = new PiecesSetUpService({
      updatePiecesPositionPort,
      hitboxSpawnerPort,
      piecesRenderOrderPort,
    });
    const experience = EXPERIENCE_KEYS.TABERNACLE;

    service.setUpPieces(experience);

    expect(
      updatePiecesPositionPort.updatePositions
    ).toHaveBeenCalledExactlyOnceWith(experience);
    expect(hitboxSpawnerPort.spawnPiecesHitbox).toHaveBeenCalledExactlyOnceWith(
      experience
    );
    expect(piecesRenderOrderPort.setOrder).toHaveBeenCalledExactlyOnceWith(
      experience
    );
  });
});
