import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookSelectionService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type {
  BookSelectionEventPort,
  PieceAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookSelection";

describe("pattern.bible-stack.application.services.BookSelectionService", () => {
  let service: BookSelectionService;
  let bookSelectionEventPort: Mocked<BookSelectionEventPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let pieceHighlighterPort: Mocked<PieceHighlighterPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    bookSelectionEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<BookSelectionEventPort>;

    pieceAdapterPort = {
      makeInteractable: vi.fn(),
      makeNonInteractable: vi.fn(),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
    };

    pieceHighlighterPort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BookSelectionService({
      bookSelectionEventPort,
      pieceAdapterPort,
      stackUpdateServicePort,
      pieceHighlighterPort,
      loggerPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(BookSelectionService);
  });
});
