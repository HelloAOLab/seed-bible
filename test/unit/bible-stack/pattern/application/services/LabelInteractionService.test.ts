import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { LabelInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/LabelInteractionService";
import type { BookInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookInteraction";
import type { ChapterInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterInteraction";
import type { SectionInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionInteraction";
import type { SectionShadowInteractionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionShadowInteraction";
import type { TestamentInteractionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TestamentInteraction";
import type { LabelDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/LabelInteraction";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { InfoLabelData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/InfoLabelData";
import {
  SelectionModalities,
  type BiblePiece,
  type Piece,
  type SectionShadow,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { LabelPositions } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";
import type { StackLabelableBiblePiece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieceLifecycle";

describe("pattern.bible-stack.application.services.LabelInteractionService", () => {
  let service: LabelInteractionService;
  let labelDataRepositoryPort: Mocked<LabelDataRepositoryPort>;
  let testamentInteractionServicePort: Mocked<TestamentInteractionServicePort>;
  let sectionInteractionServicePort: Mocked<SectionInteractionServicePort>;
  let sectionShadowInteractionPort: Mocked<SectionShadowInteractionPort>;
  let bookInteractionServicePort: Mocked<BookInteractionServicePort>;
  let chapterInteractionServicePort: Mocked<ChapterInteractionServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  const makePiece = <T extends BiblePiece>(
    type: T,
    id = `${type}-id`
  ): Piece<T> => ({
    id,
    type,
  });

  const makeSectionShadow = (): SectionShadow => ({
    id: "section-shadow-id",
    type: "StackSectionShadow",
    sectionDataId: "section-data-id",
  });

  const makeLabelData = (
    owner: Piece<StackLabelableBiblePiece> | SectionShadow
  ): InfoLabelData =>
    new InfoLabelData({
      id: "label-id",
      transformer: makePiece("InfoLabelTransformer"),
      tail: makePiece("InfoLabelTail"),
      label: makePiece("InfoLabelText"),
      owner,
      positioning: LabelPositions.Top,
    });

  const selectionHandlers = () => [
    testamentInteractionServicePort.handleTestamentSelection,
    sectionInteractionServicePort.handleSectionSelection,
    sectionShadowInteractionPort.handleSectionShadowSelected,
    bookInteractionServicePort.handleBookSelection,
    chapterInteractionServicePort.handleChapterSelection,
  ];

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

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new LabelInteractionService({
      labelDataRepositoryPort,
      testamentInteractionServicePort,
      sectionInteractionServicePort,
      sectionShadowInteractionPort,
      bookInteractionServicePort,
      chapterInteractionServicePort,
      loggerPort,
    });
  });

  describe("handleLabelSelected", () => {
    it("no-ops and logs an error if no data found", () => {
      labelDataRepositoryPort.getDataByTransformerId.mockReturnValue(undefined);
      const transformer = makePiece("InfoLabelTransformer");

      service.handleLabelSelected(transformer);

      expect(
        labelDataRepositoryPort.getDataByTransformerId
      ).toHaveBeenCalledExactlyOnceWith(transformer.id);
      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "LabelInteractionService: data not found at handleLabelSelected."
      );
      for (const handler of selectionHandlers()) {
        expect(handler).not.toHaveBeenCalled();
      }
    });

    it("calls the correct handler based on the owner's type", () => {
      const testament = makePiece("StackTestament");
      const section = makePiece("StackSection");
      const sectionShadow = makeSectionShadow();
      const book = makePiece("StackBook");
      const sectionBook = makePiece("StackSectionBook");
      const chapter = makePiece("StackChapter");

      const scenarios = [
        {
          owner: testament,
          handler: testamentInteractionServicePort.handleTestamentSelection,
          args: [
            { testament, interaction: SelectionModalities.Coarse },
          ] as unknown[],
        },
        {
          owner: section,
          handler: sectionInteractionServicePort.handleSectionSelection,
          args: [
            { section, interaction: SelectionModalities.Coarse },
          ] as unknown[],
        },
        {
          owner: sectionShadow,
          handler: sectionShadowInteractionPort.handleSectionShadowSelected,
          args: [sectionShadow] as unknown[],
        },
        {
          owner: book,
          handler: bookInteractionServicePort.handleBookSelection,
          args: [
            { book, interaction: SelectionModalities.Coarse },
          ] as unknown[],
        },
        {
          owner: sectionBook,
          handler: bookInteractionServicePort.handleBookSelection,
          args: [
            {
              book: sectionBook,
              interaction: SelectionModalities.Coarse,
            },
          ] as unknown[],
        },
        {
          owner: chapter,
          handler: chapterInteractionServicePort.handleChapterSelection,
          args: [{ chapter }] as unknown[],
        },
      ];

      for (const { owner, handler, args } of scenarios) {
        vi.clearAllMocks();
        const transformer = makePiece("InfoLabelTransformer");
        labelDataRepositoryPort.getDataByTransformerId.mockReturnValue(
          makeLabelData(owner)
        );

        service.handleLabelSelected(transformer);

        expect(
          labelDataRepositoryPort.getDataByTransformerId
        ).toHaveBeenCalledExactlyOnceWith(transformer.id);
        expect(handler).toHaveBeenCalledExactlyOnceWith(...args);
        for (const otherHandler of selectionHandlers().filter(
          (candidate) => candidate !== handler
        )) {
          expect(otherHandler).not.toHaveBeenCalled();
        }
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("works with consecutive calls", () => {
      const testament = makePiece("StackTestament");
      const chapter = makePiece("StackChapter");
      const sectionShadow = makeSectionShadow();
      const section = makePiece("StackSection");

      const calls = [testament, undefined, chapter, sectionShadow, section].map(
        (owner, index) => ({
          owner,
          transformer: makePiece(
            "InfoLabelTransformer",
            `transformer-${index}`
          ),
        })
      );

      for (const { owner, transformer } of calls) {
        labelDataRepositoryPort.getDataByTransformerId.mockReturnValueOnce(
          owner ? makeLabelData(owner) : undefined
        );

        service.handleLabelSelected(transformer);
      }

      expect(labelDataRepositoryPort.getDataByTransformerId.mock.calls).toEqual(
        calls.map(({ transformer }) => [transformer.id])
      );
      expect(
        testamentInteractionServicePort.handleTestamentSelection.mock.calls
      ).toEqual([[{ testament, interaction: SelectionModalities.Coarse }]]);
      expect(
        chapterInteractionServicePort.handleChapterSelection.mock.calls
      ).toEqual([[{ chapter }]]);
      expect(
        sectionShadowInteractionPort.handleSectionShadowSelected.mock.calls
      ).toEqual([[sectionShadow]]);
      expect(
        sectionInteractionServicePort.handleSectionSelection.mock.calls
      ).toEqual([[{ section, interaction: SelectionModalities.Coarse }]]);
      expect(
        bookInteractionServicePort.handleBookSelection
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "LabelInteractionService: data not found at handleLabelSelected."
      );
    });
  });
});
