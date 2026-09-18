import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { VersesBundleSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/VersesBundleSelectionService";
import type {
  PaintAdapterPort,
  PieceLifecycleAdapterPort,
  VersesBundleSelectionAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundleSelection";

describe("pattern.bible-stack.application.services.VersesBundleSelectionService", () => {
  let service: VersesBundleSelectionService;
  let pieceLifecycleAdapterPort: Mocked<PieceLifecycleAdapterPort>;
  let paintAdapter: Mocked<PaintAdapterPort>;
  let selectionAdapterPort: Mocked<VersesBundleSelectionAdapterPort>;

  beforeEach(() => {
    pieceLifecycleAdapterPort = {
      spawnVerseDomain: vi.fn(),
    };

    paintAdapter = {
      paint: vi.fn(),
    };

    selectionAdapterPort = {
      select: vi.fn(),
    };

    service = new VersesBundleSelectionService({
      pieceLifecycleAdapterPort,
      paintAdapter,
      selectionAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(VersesBundleSelectionService);
  });
});
