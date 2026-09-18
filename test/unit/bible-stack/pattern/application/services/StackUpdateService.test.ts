import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { StackUpdateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackUpdateService";
import type { BibleStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BibleStackUpdater";
import type { BookStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookStackUpdates";
import type {
  InteractabilityBlockerPort,
  InteractabilityUnlockerPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceInteractability";
import type { SectionStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionStackUpdates";
import type { TestamentStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentStackUpdater";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackUpdate";

describe("pattern.bible-stack.application.services.StackUpdateService", () => {
  let service: StackUpdateService;
  let pieceInteractabilityPort: Mocked<
    InteractabilityBlockerPort & InteractabilityUnlockerPort
  >;
  let bibleStackUpdaterPort: Mocked<BibleStackUpdaterPort>;
  let testamentStackUpdaterPort: Mocked<TestamentStackUpdaterPort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let sectiontackUpdaterPort: Mocked<SectionStackUpdaterPort>;
  let bookStackUpdaterPort: Mocked<BookStackUpdaterPort>;

  beforeEach(() => {
    pieceInteractabilityPort = {
      blockAll: vi.fn(),
      unlockAll: vi.fn(),
    };

    bibleStackUpdaterPort = {
      update: vi.fn(),
    };

    testamentStackUpdaterPort = {
      prepareTestament: vi.fn(),
      finalizeTestament: vi.fn(),
      update: vi.fn(),
    };

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
      getBibleDataById: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getStandaloneTestaments: vi.fn(),
      getStandaloneSections: vi.fn(),
      getStandaloneSectionBooks: vi.fn(),
      getStandaloneBooks: vi.fn(),
      getDataById: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    sectiontackUpdaterPort = {
      prepareSection: vi.fn(),
      finalizeSection: vi.fn(),
      update: vi.fn(),
    };

    bookStackUpdaterPort = {
      prepareBook: vi.fn(),
      finalizeBook: vi.fn(),
      update: vi.fn(),
    };

    service = new StackUpdateService({
      pieceInteractabilityPort,
      bibleStackUpdaterPort,
      testamentStackUpdaterPort,
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
      sectiontackUpdaterPort,
      bookStackUpdaterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(StackUpdateService);
  });
});
