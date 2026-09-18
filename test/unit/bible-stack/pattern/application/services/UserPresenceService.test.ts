import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { UserPresenceService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/UserPresenceService";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";

describe("pattern.bible-stack.application.services.UserPresenceService", () => {
  let service: UserPresenceService;
  let eventMangerPort: Mocked<EventManagerPort>;

  beforeEach(() => {
    eventMangerPort = {
      emit: vi.fn(),
    } as unknown as Mocked<EventManagerPort>;

    service = new UserPresenceService({
      eventMangerPort,
      userId: "",
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(UserPresenceService);
  });
});
