import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TourGuideService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TourGuideService";
import type { TourGuieAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/tourGuide";

describe("pattern.bible-stack.application.services.TourGuideService", () => {
  let service: TourGuideService;
  let tourGuieAdapterPort: Mocked<TourGuieAdapterPort>;

  beforeEach(() => {
    tourGuieAdapterPort = {
      startTourGuideSequence: vi.fn(),
      endTourGuideSequence: vi.fn(),
    };

    service = new TourGuideService({
      tourGuieAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(TourGuideService);
  });
});
