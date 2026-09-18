import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionStackUpdaterService";
import type { BookStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookStackUpdates";
import type {
  LoggerPort,
  SectionStackUpdaterPort as UpdaterAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackSectionUpdater";
import type {
  PieceLabelServicePort,
  StackPieceLifecycleAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieceLifecycle";

describe("pattern.bible-stack.application.services.SectionStackUpdaterService", () => {
  let service: SectionStackUpdaterService;
  let updaterAdapterPort: Mocked<UpdaterAdapterPort>;
  let bookStackUpdaterPort: Mocked<BookStackUpdaterPort>;
  let pieceLifecyclePort: Mocked<StackPieceLifecycleAdapterPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    updaterAdapterPort = {
      update: vi.fn(),
    };

    bookStackUpdaterPort = {
      prepareBook: vi.fn(),
      finalizeBook: vi.fn(),
      update: vi.fn(),
    };

    pieceLifecyclePort = {
      spawnTestament: vi.fn(),
      despawnTestament: vi.fn(),
      spawnSection: vi.fn(),
      despawnSection: vi.fn(),
      spawnBook: vi.fn(),
      despawnBook: vi.fn(),
      spawnChapter: vi.fn(),
      despawnChapter: vi.fn(),
      spawnSectionShadow: vi.fn(),
      spawnSectionShadowDomain: vi.fn(),
      despawnSectionShadow: vi.fn(),
      despawnSectionBook: vi.fn(),
      spawnVersesBundle: vi.fn(),
      despawnVersesBundle: vi.fn(),
      spawnVerse: vi.fn(),
      despawnVerse: vi.fn(),
      despawn: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new SectionStackUpdaterService({
      updaterAdapterPort,
      bookStackUpdaterPort,
      pieceLifecyclePort,
      pieceLabelServicePort: {} as unknown as PieceLabelServicePort,
      loggerPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(SectionStackUpdaterService);
  });
});
