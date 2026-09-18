import { describe, it, expect, beforeEach } from "vitest";
import { PieceHierarchyService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceHierarchyService";
import type {
  PieceHierarchyPieceDataRepositoryPort,
  PieceHierarchyStackDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";

describe("pattern.bible-stack.application.services.PieceHierarchyService", () => {
  let service: PieceHierarchyService;

  beforeEach(() => {
    service = new PieceHierarchyService({
      pieceDataRepositoryPort:
        {} as unknown as PieceHierarchyPieceDataRepositoryPort,
      bibleDataRepositoryPort:
        {} as unknown as PieceHierarchyStackDataRepositoryPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceHierarchyService);
  });
});
