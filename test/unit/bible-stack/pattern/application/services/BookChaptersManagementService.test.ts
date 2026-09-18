import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookChaptersManagementService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookChaptersManagementService";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLabel";
import type { ScripturePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Scripture";
import type { ScripturePiecesStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ScripturePiecesState";
import type {
  BookChaptersManagementAdapterPort,
  ChapterSpawnerPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookChaptersManagement";
import type { BibleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackUpdate";

describe("pattern.bible-stack.application.services.BookChaptersManagementService", () => {
  let service: BookChaptersManagementService;
  let biggerChapterProviderPort: Mocked<ScripturePort>;
  let chapterSpawnerPort: Mocked<ChapterSpawnerPort>;
  let chaptersManagementAdapterPort: Mocked<BookChaptersManagementAdapterPort>;
  let scripturePiecesStateServicePort: Mocked<ScripturePiecesStateServicePort>;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort<"StackChapter">>;

  beforeEach(() => {
    biggerChapterProviderPort = {
      mapSubsetToCompleteBook: vi.fn(),
      mapCompleteToSubsetBook: vi.fn(),
      getBiggerChapter: vi.fn(),
      getSectionChapterCount: vi.fn(),
      getBookChapterCount: vi.fn(),
    };

    chapterSpawnerPort = {
      spawnChapterDomain: vi.fn(),
      despawnChapter: vi.fn(),
    };

    chaptersManagementAdapterPort = {
      setUpChapter: vi.fn(),
      updateChaptersPosition: vi.fn(),
    };

    scripturePiecesStateServicePort = {
      arePiecesDraggable:
        undefined as unknown as ScripturePiecesStateServicePort["arePiecesDraggable"],
      shouldShowLabelDates:
        undefined as unknown as ScripturePiecesStateServicePort["shouldShowLabelDates"],
      resetToDefault: vi.fn(),
      makePiecesDraggable: vi.fn(),
      makePiecesNotDraggable: vi.fn(),
      enableLabelDates: vi.fn(),
      disableLabelDates: vi.fn(),
    };

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
      getBibleDataById: vi.fn(),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
      updateLabelPosition: vi.fn(),
      getPieceLabel: vi.fn(),
    };

    service = new BookChaptersManagementService({
      biggerChapterProviderPort,
      chapterSpawnerPort,
      chaptersManagementAdapterPort,
      scripturePiecesStateServicePort,
      bibleDataRepositoryPort,
      pieceLabelServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(BookChaptersManagementService);
  });
});
