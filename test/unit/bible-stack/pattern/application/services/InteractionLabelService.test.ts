import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { LabelInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/InteractionLabelService";
import type { BookInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookInteraction";
import type { ChapterInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterInteraction";
import type { SectionInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionInteraction";
import type { SectionShadowInteractionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionShadowInteraction";
import type { TestamentInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentInteraction";
import type { LabelDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelInteraction";

describe("pattern.bible-stack.application.services.InteractionLabelService", () => {
  let service: LabelInteractionService;
  let labelDataRepositoryPort: Mocked<LabelDataRepositoryPort>;
  let testamentInteractionServicePort: Mocked<TestamentInteractionServicePort>;
  let sectionInteractionServicePort: Mocked<SectionInteractionServicePort>;
  let sectionShadowInteractionPort: Mocked<SectionShadowInteractionPort>;
  let bookInteractionServicePort: Mocked<BookInteractionServicePort>;
  let chapterInteractionServicePort: Mocked<ChapterInteractionServicePort>;

  beforeEach(() => {
    labelDataRepositoryPort = {
      getDataByTransformerId: vi.fn(),
    };

    testamentInteractionServicePort = {
      handleTestamentSelection: vi.fn(),
      handleTestamentFocusBegin: vi.fn(),
      handleTestamentFocusEnd: vi.fn(),
    };

    sectionInteractionServicePort = {
      handleSectionSelection: vi.fn(),
      handleSectionFocusBegin: vi.fn(),
      handleSectionFocusEnd: vi.fn(),
    };

    sectionShadowInteractionPort = {
      handleSectionShadowSelected: vi.fn(),
    };

    bookInteractionServicePort = {
      handleBookSelection: vi.fn(),
      handleBookFocusBegin: vi.fn(),
      handleBookFocusEnd: vi.fn(),
    };

    chapterInteractionServicePort = {
      handleChapterSelection: vi.fn(),
      handleChapterFocusBegin: vi.fn(),
      handleChapterFocusEnd: vi.fn(),
    };

    service = new LabelInteractionService({
      labelDataRepositoryPort,
      testamentInteractionServicePort,
      sectionInteractionServicePort,
      sectionShadowInteractionPort,
      bookInteractionServicePort,
      chapterInteractionServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(LabelInteractionService);
  });
});
