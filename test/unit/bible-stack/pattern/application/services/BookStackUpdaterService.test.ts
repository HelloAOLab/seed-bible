import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookStackUpdaterService";
import type { BookChaptersManagementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/bibleLifecycle";
import type {
  BookStackUpdaterPort as UpdaterAdapterPort,
  LoggerPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackBookUpdater";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieceLifecycle";

describe("pattern.bible-stack.application.services.BookStackUpdaterService", () => {
  let service: BookStackUpdaterService;
  let updaterAdapterPort: Mocked<UpdaterAdapterPort>;
  let bookChaptersManagementServicePort: Mocked<BookChaptersManagementServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    updaterAdapterPort = {
      update: vi.fn(),
    };

    bookChaptersManagementServicePort = {
      showChapters: vi.fn(),
      hideChapters: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BookStackUpdaterService({
      updaterAdapterPort,
      bookChaptersManagementServicePort,
      pieceLabelServicePort: {} as unknown as PieceLabelServicePort,
      loggerPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(BookStackUpdaterService);
  });
});
