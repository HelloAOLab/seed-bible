import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PaintService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PaintService";
import type {
  PaintAdapterPort,
  StackDataRepository,
  VerseDataRepository,
  VersesBundleDataRepository,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Paint";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { VerseData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VerseData";
import { VersesBundleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VersesBundleData";
import type {
  BiblePiece,
  Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { PaintablePieceData } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";

describe("pattern.bible-stack.application.services.PaintService", () => {
  let service: PaintService;
  let stackDataRepository: Mocked<StackDataRepository>;
  let verseDataRepository: Mocked<VerseDataRepository>;
  let versesBundleDataRepository: Mocked<VersesBundleDataRepository>;
  let paintAdapterPort: Mocked<PaintAdapterPort>;
  let loggerPort: Mocked<LoggerPort>;

  const DEFAULT_COLOR = "#efe5c9";

  type PaintTarget =
    | NonNullable<PaintablePieceData["piece"]>
    | PaintablePieceData;

  interface Scenario {
    data: PaintablePieceData;
    target: PaintTarget;
    arrange: () => void;
  }

  const makePiece = <T extends BiblePiece>(type: T, id: string): Piece<T> => ({
    id,
    type,
  });

  const makeVerse = (paintColor?: string) => {
    const piece = makePiece("Verse", "verse-piece-id");
    const data = new VerseData({
      id: "verse-data-id",
      piece,
      creationParams: {
        bookId: "book-id",
        chapter: 1,
        start: 1,
        count: 1,
        verseIndex: 0,
      },
    });
    if (paintColor) data.paint(paintColor);
    return { data, piece };
  };

  const makeBundle = (paintColor?: string) => {
    const piece = makePiece("VersesBundle", "bundle-piece-id");
    const data = new VersesBundleData({
      id: "bundle-data-id",
      piece,
      creationParams: {
        bookId: "book-id",
        chapter: 1,
        start: 1,
        count: 1,
      },
    });
    if (paintColor) data.paint(paintColor);
    return { data, piece };
  };

  const makeChapter = (paintColor?: string) => {
    const piece = makePiece("StackChapter", "chapter-piece-id");
    const data = new StackChapterData({
      id: "chapter-data-id",
      piece,
      pieceInfo: { amountOfVerses: 10, number: 1 },
      parentDataIds: { stackBookId: "book-data-id" },
      isInsideBible: true,
      creationParams: { bookId: "book-id" },
    });
    if (paintColor) data.paint(paintColor);
    return { data, piece };
  };

  const makePiecelessVerse = (paintColor?: string) => {
    const data = new VerseData({
      id: "pieceless-verse-data-id",
      creationParams: {
        bookId: "book-id",
        chapter: 1,
        start: 1,
        count: 1,
        verseIndex: 0,
      },
    });
    if (paintColor) data.paint(paintColor);
    return data;
  };

  const makeScenarios = (paintColor?: string): Scenario[] => {
    const verse = makeVerse(paintColor);
    const bundle = makeBundle(paintColor);
    const chapter = makeChapter(paintColor);
    const direct = makeVerse(paintColor);

    return [
      {
        data: verse.data,
        target: verse.piece,
        arrange: () =>
          verseDataRepository.getVerseData.mockReturnValue(verse.data),
      },
      {
        data: bundle.data,
        target: bundle.piece,
        arrange: () =>
          versesBundleDataRepository.getBundleData.mockReturnValue(bundle.data),
      },
      {
        data: chapter.data,
        target: chapter.piece,
        arrange: () =>
          stackDataRepository.getPieceData.mockReturnValue(chapter.data),
      },
      {
        data: direct.data,
        target: direct.data,
        arrange: () => undefined,
      },
    ];
  };

  const paint = (target: PaintTarget) =>
    "paint" in target ? service.paint(target) : service.paint(target);

  const unpaint = (target: PaintTarget) =>
    "paint" in target ? service.unpaint(target) : service.unpaint(target);

  beforeEach(() => {
    stackDataRepository = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<StackDataRepository>;

    verseDataRepository = {
      getVerseData: vi.fn(),
    };

    versesBundleDataRepository = {
      getBundleData: vi.fn(),
    };

    paintAdapterPort = {
      paint: vi.fn(),
      unpaint: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new PaintService({
      stackDataRepository,
      verseDataRepository,
      versesBundleDataRepository,
      paintAdapterPort,
      loggerPort,
    });
  });

  describe("activate", () => {
    it("correctly activates the feature", () => {
      expect(service.isActive).toBe(false);

      service.activate();

      expect(service.isActive).toBe(true);
    });

    it("no-ops if the feature is already active", () => {
      service.activate();

      service.activate();

      expect(service.isActive).toBe(true);
      expect(paintAdapterPort.paint).not.toHaveBeenCalled();
      expect(paintAdapterPort.unpaint).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("correctly deactivates the feature", () => {
      service.activate();
      expect(service.isActive).toBe(true);

      service.deactivate();

      expect(service.isActive).toBe(false);
    });

    it("no-ops if the feature is already not active", () => {
      expect(service.isActive).toBe(false);

      service.deactivate();

      expect(service.isActive).toBe(false);
      expect(paintAdapterPort.paint).not.toHaveBeenCalled();
      expect(paintAdapterPort.unpaint).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("changeColor", () => {
    it("no-ops on invalid colors", () => {
      const validColor = "#123456";
      service.changeColor(validColor);

      for (const invalidColor of [
        "",
        "   ",
        "not-a-color",
        "#12",
        "#12345",
        "#GGGGGG",
        "#1234567",
      ]) {
        service.changeColor(invalidColor);

        const { data, piece } = makeVerse();
        verseDataRepository.getVerseData.mockReturnValue(data);
        paint(piece);

        expect(data.paintColor).toBe(validColor);
      }
    });

    it("successfully changes the color", () => {
      service.changeColor("#123456");

      const { data, piece } = makeVerse();
      verseDataRepository.getVerseData.mockReturnValue(data);
      paint(piece);

      expect(data.paintColor).toBe("#123456");
      expect(paintAdapterPort.paint).toHaveBeenCalledExactlyOnceWith(
        piece,
        "#123456"
      );
    });

    it("works with consecutive calls", () => {
      const colors = [
        { color: "#123456", expected: "#123456" },
        { color: "abc", expected: "abc" },
        { color: "broken", expected: "abc" },
        { color: "rgb(1, 2, 3)", expected: "rgb(1, 2, 3)" },
        { color: "#ff00ff", expected: "#ff00ff" },
      ];

      for (const { color, expected } of colors) {
        service.changeColor(color);

        const { data, piece } = makeVerse();
        verseDataRepository.getVerseData.mockReturnValue(data);
        paint(piece);

        expect(data.paintColor).toBe(expected);
      }
    });
  });

  describe("paint", () => {
    it("no-ops and logs an error if no data found", () => {
      const routes = [
        {
          piece: makePiece("Verse", "verse-piece-id"),
          repository: () => verseDataRepository.getVerseData,
        },
        {
          piece: makePiece("VersesBundle", "bundle-piece-id"),
          repository: () => versesBundleDataRepository.getBundleData,
        },
        {
          piece: makePiece("StackChapter", "chapter-piece-id"),
          repository: () => stackDataRepository.getPieceData,
        },
      ];

      for (const { piece, repository } of routes) {
        vi.clearAllMocks();

        paint(piece);

        expect(repository()).toHaveBeenCalledExactlyOnceWith(piece);
        expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
          "PaintService: data not found at paint"
        );
        expect(paintAdapterPort.paint).not.toHaveBeenCalled();
      }
    });

    it("no-ops if piece's current color is equal to the paint color", () => {
      service.changeColor("#123456");

      for (const { data, target, arrange } of makeScenarios("#123456")) {
        vi.clearAllMocks();
        arrange();

        paint(target);

        expect(data.paintColor).toBe("#123456");
        expect(paintAdapterPort.paint).not.toHaveBeenCalled();
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("no-ops and logs an error if piece is not defined", () => {
      const data = makePiecelessVerse();

      paint(data);

      expect(data.paintColor).toBeUndefined();
      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "PaintService: piece not found at paint"
      );
      expect(paintAdapterPort.paint).not.toHaveBeenCalled();
    });

    it("successfully paints the piece with the saved color", () => {
      for (const { data, target, arrange } of makeScenarios()) {
        arrange();

        paint(target);

        expect(data.paintColor).toBe(DEFAULT_COLOR);
      }

      service.changeColor("#123456");

      for (const { data, target, arrange } of makeScenarios()) {
        arrange();

        paint(target);

        expect(data.paintColor).toBe("#123456");
      }
    });

    it("successfully performs the paint sequence", () => {
      for (const { data, target, arrange } of makeScenarios()) {
        vi.clearAllMocks();
        arrange();

        paint(target);

        expect(paintAdapterPort.paint).toHaveBeenCalledExactlyOnceWith(
          data.piece,
          DEFAULT_COLOR
        );
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });
  });

  describe("unpaint", () => {
    it("no-ops and logs an error if no data found", () => {
      const routes = [
        {
          piece: makePiece("Verse", "verse-piece-id"),
          repository: () => verseDataRepository.getVerseData,
        },
        {
          piece: makePiece("VersesBundle", "bundle-piece-id"),
          repository: () => versesBundleDataRepository.getBundleData,
        },
        {
          piece: makePiece("StackChapter", "chapter-piece-id"),
          repository: () => stackDataRepository.getPieceData,
        },
      ];

      for (const { piece, repository } of routes) {
        vi.clearAllMocks();

        unpaint(piece);

        expect(repository()).toHaveBeenCalledExactlyOnceWith(piece);
        expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
          "PaintService: data not found at unpaint"
        );
        expect(paintAdapterPort.unpaint).not.toHaveBeenCalled();
      }
    });

    it("no-ops if the piece is not painted", () => {
      for (const { data, target, arrange } of makeScenarios()) {
        vi.clearAllMocks();
        arrange();

        unpaint(target);

        expect(data.paintColor).toBeUndefined();
        expect(paintAdapterPort.unpaint).not.toHaveBeenCalled();
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("no-ops and logs an error if piece is not defined", () => {
      const data = makePiecelessVerse("#123456");

      unpaint(data);

      expect(data.paintColor).toBe("#123456");
      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "PaintService: piece not found at unpaint"
      );
      expect(paintAdapterPort.unpaint).not.toHaveBeenCalled();
    });

    it("successfully unpaints the piece", () => {
      for (const { data, target, arrange } of makeScenarios("#123456")) {
        arrange();

        unpaint(target);

        expect(data.paintColor).toBeUndefined();
      }
    });

    it("successfully performs the unpaint sequence", () => {
      for (const { data, target, arrange } of makeScenarios("#123456")) {
        vi.clearAllMocks();
        arrange();

        unpaint(target);

        expect(paintAdapterPort.unpaint).toHaveBeenCalledExactlyOnceWith(
          data.piece
        );
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });
  });

  describe("paint <-> unpaint", () => {
    it("leaves an initially unpainted piece unpainted if it goes through paint, then unpaint", () => {
      for (const { data, target, arrange } of makeScenarios()) {
        vi.clearAllMocks();
        arrange();
        expect(data.paintColor).toBeUndefined();

        paint(target);
        unpaint(target);

        expect(data.paintColor).toBeUndefined();
        expect(paintAdapterPort.paint).toHaveBeenCalledExactlyOnceWith(
          data.piece,
          DEFAULT_COLOR
        );
        expect(paintAdapterPort.unpaint).toHaveBeenCalledExactlyOnceWith(
          data.piece
        );
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });

    it("leaves an initially painted piece painted if it goes through unpaint, then paint", () => {
      service.changeColor("#123456");

      for (const { data, target, arrange } of makeScenarios("#123456")) {
        vi.clearAllMocks();
        arrange();
        expect(data.paintColor).toBe("#123456");

        unpaint(target);
        paint(target);

        expect(data.paintColor).toBe("#123456");
        expect(paintAdapterPort.unpaint).toHaveBeenCalledExactlyOnceWith(
          data.piece
        );
        expect(paintAdapterPort.paint).toHaveBeenCalledExactlyOnceWith(
          data.piece,
          "#123456"
        );
        expect(loggerPort.error).not.toHaveBeenCalled();
      }
    });
  });

  describe("paint -> changeColor -> paint", () => {
    it("successfully registers the new color if it is changed in-between paints", () => {
      for (const { data, target, arrange } of makeScenarios()) {
        vi.clearAllMocks();
        arrange();

        paint(target);
        service.changeColor("#123456");
        paint(target);

        expect(data.paintColor).toBe("#123456");
        expect(paintAdapterPort.paint.mock.calls).toEqual([
          [data.piece, DEFAULT_COLOR],
          [data.piece, "#123456"],
        ]);

        service.changeColor(DEFAULT_COLOR);
      }
    });
  });
});
