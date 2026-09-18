import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { LabelDateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/LabelDateService";
import type { LabelDateEventPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelDate";

describe("pattern.bible-stack.application.services.LabelDateService", () => {
  let service: LabelDateService;
  let eventPort: Mocked<LabelDateEventPort>;

  beforeEach(() => {
    eventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<LabelDateEventPort>;

    service = new LabelDateService({
      dateFormat: "Absolute",
      eventPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(LabelDateService);
  });
});
