import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceLifecycleService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceLifecycleService";
import type { DomainEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/EventManager";
import type {
  PieceLifecycleConfigProviderPort,
  VerseDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceLifecycle";
import type {
  ArrangementServicePort,
  IdGeneratorPort,
  PieceDataRepositoryPort,
  PieceHighlightServicePort,
  PieceLabelServicePort,
  PieceLifecycleEventPort,
  ScriptureServicePort,
  StackPieceLifecycleAdapterPort,
  VersesBundleDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieceLifecycle";

describe("pattern.bible-stack.application.services.PieceLifecycleService", () => {
  let service: PieceLifecycleService;
  let stackPieceLifecycleAdapterPort: Mocked<StackPieceLifecycleAdapterPort>;
  let pieceLifecycleEventPort: Mocked<PieceLifecycleEventPort>;
  let arrangementServicePort: Mocked<ArrangementServicePort>;
  let idGenerator: Mocked<IdGeneratorPort>;
  let scriptureServicePort: Mocked<ScriptureServicePort>;
  let versesBundleDataRepositoryPort: Mocked<VersesBundleDataRepositoryPort>;
  let verseDataRepositoryPort: Mocked<VerseDataRepositoryPort>;
  let configProviderPort: Mocked<PieceLifecycleConfigProviderPort>;
  let eventManger: Mocked<DomainEventManager>;

  beforeEach(() => {
    stackPieceLifecycleAdapterPort = {
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

    pieceLifecycleEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<PieceLifecycleEventPort>;

    arrangementServicePort = {
      getTestamentByIndices: vi.fn(),
      getSectionByIndices: vi.fn(),
      getBookByIndices: vi.fn(),
    };

    idGenerator = {
      getId: vi.fn(),
    };

    scriptureServicePort = {
      getSectionChapterCount: vi.fn(),
    };

    versesBundleDataRepositoryPort = {
      addBundleData: vi.fn(),
      removeBundleData: vi.fn(),
    };

    verseDataRepositoryPort = {
      addVerseData: vi.fn(),
      removeVerseData: vi.fn(),
    };

    configProviderPort = {
      getVersesPerBundle: vi.fn(),
    };

    eventManger = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as Mocked<DomainEventManager>;

    service = new PieceLifecycleService({
      pieceDataRepositoryPort: {} as unknown as PieceDataRepositoryPort,
      pieceLabelServicePort: {} as unknown as PieceLabelServicePort,
      stackPieceLifecycleAdapterPort,
      pieceLifecycleEventPort,
      arrangementServicePort,
      idGenerator,
      scriptureServicePort,
      versesBundleDataRepositoryPort,
      verseDataRepositoryPort,
      configProviderPort,
      pieceHighlightServicePort: {} as unknown as PieceHighlightServicePort,
      eventManger,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceLifecycleService);
  });
});
