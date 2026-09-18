import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { StackManagementService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackManagementService";
import type {
  BibleDataRepositoryPort,
  BibleLifecycleServicePort,
  PieceDataRepositoryPort,
  PieceLifecycleServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/stackManagement";

describe("pattern.bible-stack.application.services.StackManagementService", () => {
  let service: StackManagementService;
  let bibleLifecycleServicePort: Mocked<BibleLifecycleServicePort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;

  beforeEach(() => {
    bibleLifecycleServicePort = {
      deleteBibles: vi.fn(),
    };

    pieceLifecycleServicePort = {
      deleteTestaments: vi.fn(),
      deleteSections: vi.fn(),
      deleteSectionBooks: vi.fn(),
      deleteBooks: vi.fn(),
      deleteChapters: vi.fn(),
    };

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getAllTestaments: vi.fn(),
      getAllSections: vi.fn(),
      getAllBooks: vi.fn(),
      getAllChapters: vi.fn(),
      getAllSectionBooks: vi.fn(),
    };

    service = new StackManagementService({
      bibleLifecycleServicePort,
      pieceLifecycleServicePort,
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(StackManagementService);
  });
});
