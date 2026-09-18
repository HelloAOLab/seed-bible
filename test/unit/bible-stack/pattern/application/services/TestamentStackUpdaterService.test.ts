import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TestamentStackUpdaterService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TestamentStackUpdaterService";
import type { BookStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookStackUpdates";
import type { SectionStackUpdaterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionStackUpdates";
import type { TestamentStackUpdaterPort as UpdaterAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackTestamentUpdater";

describe("pattern.bible-stack.application.services.TestamentStackUpdaterService", () => {
  let service: TestamentStackUpdaterService;
  let updaterAdapterPort: Mocked<UpdaterAdapterPort>;
  let sectionUpdaterPort: Mocked<SectionStackUpdaterPort>;
  let bookStackUpdaterPort: Mocked<BookStackUpdaterPort>;

  beforeEach(() => {
    updaterAdapterPort = {
      update: vi.fn(),
    };

    sectionUpdaterPort = {
      prepareSection: vi.fn(),
      finalizeSection: vi.fn(),
      update: vi.fn(),
    };

    bookStackUpdaterPort = {
      prepareBook: vi.fn(),
      finalizeBook: vi.fn(),
      update: vi.fn(),
    };

    service = new TestamentStackUpdaterService({
      updaterAdapterPort,
      sectionUpdaterPort,
      bookStackUpdaterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(TestamentStackUpdaterService);
  });
});
