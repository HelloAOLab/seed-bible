import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SequenceStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SequenceStateService";
import type { SequenceEventPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/sequence";

describe("pattern.bible-stack.application.services.SequenceStateService", () => {
  let service: SequenceStateService;
  let sequenceEventPort: Mocked<SequenceEventPort>;

  beforeEach(() => {
    sequenceEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<SequenceEventPort>;

    service = new SequenceStateService({
      sequenceEventPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(SequenceStateService);
  });
});
