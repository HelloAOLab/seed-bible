import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { VersesInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/VersesInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/verses";
import type { Piece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";

const versePiece: Piece<"Verse"> = { id: "verse-piece", type: "Verse" };

describe("pattern.bible-stack.application.services.VersesInteractionService", () => {
  let service: VersesInteractionService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(() => false),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: false,
    } as unknown as Mocked<PaintPort>;

    service = new VersesInteractionService({
      sequenceStateServicePort,
      paintPort,
    });
  });

  describe("handleVerseSelection", () => {
    it("no-ops if there's an ongoing sequence, even if the paint feature is active", () => {
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      paintPort.isActive = true;

      service.handleVerseSelection(versePiece);

      expect(paintPort.paint).not.toHaveBeenCalled();
    });

    it("paints the verse if the paint feature is active", () => {
      paintPort.isActive = true;

      service.handleVerseSelection(versePiece);

      expect(paintPort.paint).toHaveBeenCalledWith(versePiece);
    });

    it("does not paint the verse if the paint feature is not active", () => {
      paintPort.isActive = false;

      service.handleVerseSelection(versePiece);

      expect(paintPort.paint).not.toHaveBeenCalled();
    });
  });
});
