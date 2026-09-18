import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BibleStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BibleStackUpdaterService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { TestamentStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentStackUpdater";
import type { BibleStackUpdaterAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleStackUpdater";

describe("pattern.bible-stack.application.services.BibleStackUpdaterService", () => {
  let service: BibleStackUpdaterService;
  let updaterAdapterPort: Mocked<BibleStackUpdaterAdapterPort>;
  let testamentUpdaterPort: Mocked<TestamentStackUpdaterPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    updaterAdapterPort = {
      update: vi.fn(),
    };

    testamentUpdaterPort = {
      prepareTestament: vi.fn(),
      finalizeTestament: vi.fn(),
      update: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new BibleStackUpdaterService({
      updaterAdapterPort,
      testamentUpdaterPort,
      loggerPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(BibleStackUpdaterService);
  });
});
