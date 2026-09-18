import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PaintService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PaintService";
import type {
  PaintAdapterPort,
  StackDataRepository,
  VerseDataRepository,
  VersesBundleDataRepository,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Paint";

describe("pattern.bible-stack.application.services.PaintService", () => {
  let service: PaintService;
  let stackDataRepository: Mocked<StackDataRepository>;
  let verseDataRepository: Mocked<VerseDataRepository>;
  let versesBundleDataRepository: Mocked<VersesBundleDataRepository>;
  let paintAdapterPort: Mocked<PaintAdapterPort>;

  beforeEach(() => {
    stackDataRepository = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<StackDataRepository>;

    verseDataRepository = {
      getVerseData: vi.fn(),
    };

    versesBundleDataRepository = {
      getBundleData: vi.fn(),
    };

    paintAdapterPort = {
      paint: vi.fn(),
      unpaint: vi.fn(),
    };

    service = new PaintService({
      stackDataRepository,
      verseDataRepository,
      versesBundleDataRepository,
      paintAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PaintService);
  });
});
