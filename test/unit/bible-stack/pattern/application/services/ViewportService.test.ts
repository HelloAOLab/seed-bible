import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ViewportService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ViewportService";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ViewportService";

describe("pattern.bible-stack.application.services.ViewportService", () => {
  let service: ViewportService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;

  beforeEach(() => {
    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getStandaloneTestaments: vi.fn(),
      getStandaloneSections: vi.fn(),
      getStandaloneSectionBooks: vi.fn(),
      getStandaloneBooks: vi.fn(),
    };

    service = new ViewportService({
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ViewportService);
  });
});
