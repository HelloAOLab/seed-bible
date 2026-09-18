import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { VersesInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/VersesInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/verses";

describe("pattern.bible-stack.application.services.VersesInteractionService", () => {
  let service: VersesInteractionService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: undefined as unknown as PaintPort["isActive"],
    } as unknown as Mocked<PaintPort>;

    service = new VersesInteractionService({
      sequenceStateServicePort,
      paintPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(VersesInteractionService);
  });
});
