import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { LabelDateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/LabelDateService";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";

describe("pattern.bible-stack.application.services.LabelDateService", () => {
  let service: LabelDateService;
  let eventManagerPort: Mocked<EventManagerPort<BibleStackEvents>>;

  beforeEach(() => {
    eventManagerPort = {
      emit: vi.fn(),
    } as unknown as Mocked<EventManagerPort<BibleStackEvents>>;

    service = new LabelDateService({
      dateFormat: "Absolute",
      eventManagerPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(LabelDateService);
  });
});
