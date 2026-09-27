import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { VersesBundleSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/VersesBundleSelectionService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { VerseData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VerseData";
import { VersesBundleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VersesBundleData";
import type { Piece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Paint";
import type { StackPieceLifecyclePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackPieceLifecycle";
import type { VersesBundleSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundleSelection";
import {
  makePaintDouble,
  makeStackPieceLifecycleDouble,
} from "../adapterDoubles";

const VERSE_START = 4;

const bundlePiece: Piece<"VersesBundle"> = {
  id: "bundle-piece",
  type: "VersesBundle",
};

const bundleCreationParams = {
  bookId: "GEN",
  chapter: 1,
  start: VERSE_START,
  count: 3,
};

const makeVerseData = (index: number, paintColor?: string): VerseData => {
  const verseData = new VerseData({
    id: `verse-data-${index}`,
    creationParams: { ...bundleCreationParams, verseIndex: index },
  });
  if (paintColor) verseData.paint(paintColor);
  return verseData;
};

const makeBundleData = ({
  piece = bundlePiece,
  verses = [],
}: {
  piece?: Piece<"VersesBundle"> | null;
  verses?: VerseData[];
} = {}): VersesBundleData =>
  new VersesBundleData({
    id: "bundle-data",
    piece: piece ?? undefined,
    verses,
    creationParams: bundleCreationParams,
  });

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.VersesBundleSelectionService", () => {
  let service: VersesBundleSelectionService;
  let pieceLifecycleAdapterPort: Mocked<StackPieceLifecyclePort>;
  let paintAdapter: Mocked<PaintPort>;
  let selectionAdapterPort: Mocked<VersesBundleSelectionPort>;
  let loggerPort: Mocked<LoggerPort>;
  let spawnedPieces: Piece<"Verse">[];

  beforeEach(() => {
    spawnedPieces = [];

    pieceLifecycleAdapterPort = makeStackPieceLifecycleDouble({
      spawnVerseDomain: vi.fn(() => {
        const piece: Piece<"Verse"> = {
          id: `spawned-verse-piece-${spawnedPieces.length}`,
          type: "Verse",
        };
        spawnedPieces.push(piece);
        return piece;
      }),
    });

    paintAdapter = makePaintDouble();

    selectionAdapterPort = {
      select: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new VersesBundleSelectionService({
      pieceLifecycleAdapterPort,
      paintAdapter,
      selectionAdapterPort,
      loggerPort,
    });
  });

  describe("selectBundle", () => {
    it("logs an error and no-ops if the bundle has no piece attached", async () => {
      const verse = makeVerseData(0, "#ff0000");
      const data = makeBundleData({ piece: null, verses: [verse] });

      await expect(service.selectBundle(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "VersesBundleSelectionService: data.piece not defined at selectBundle"
      );
      expect(data.isSelected).toBe(false);
      expect(pieceLifecycleAdapterPort.spawnVerseDomain).not.toHaveBeenCalled();
      expect(verse.piece).toBeUndefined();
      expect(selectionAdapterPort.select).not.toHaveBeenCalled();
      expect(paintAdapter.paint).not.toHaveBeenCalled();
    });

    it("selects the bundle", async () => {
      const data = makeBundleData({ verses: [makeVerseData(0)] });
      const selectedAtSelection: boolean[] = [];
      selectionAdapterPort.select.mockImplementation(async () => {
        selectedAtSelection.push(data.isSelected);
      });

      expect(data.isSelected).toBe(false);

      await service.selectBundle(data);

      expect(selectedAtSelection).toEqual([true]);
      expect(data.isSelected).toBe(true);
    });

    it("spawns a piece and attaches it to every verse child", async () => {
      const verses = [makeVerseData(0), makeVerseData(1), makeVerseData(2)];
      const data = makeBundleData({ verses });

      await service.selectBundle(data);

      expect(pieceLifecycleAdapterPort.spawnVerseDomain).toHaveBeenCalledTimes(
        3
      );
      expect(verses.map((verse) => verse.piece)).toEqual(spawnedPieces);
    });

    it("awaits for the selection sequence, with the verse start from the creation params, and with every child verse piece", async () => {
      const verses = [
        makeVerseData(0, "#ff0000"),
        makeVerseData(1),
        makeVerseData(2),
      ];
      const data = makeBundleData({ verses });
      const selection = makeDeferred();
      selectionAdapterPort.select.mockReturnValue(selection.promise);

      const bundleSelection = service.selectBundle(data);
      await flush();

      expect(selectionAdapterPort.select).toHaveBeenCalledExactlyOnceWith({
        bundle: bundlePiece,
        verseStart: VERSE_START,
        verses: spawnedPieces,
      });
      expect(paintAdapter.paint).not.toHaveBeenCalled();

      selection.resolve();
      await bundleSelection;

      expect(paintAdapter.paint).toHaveBeenCalledOnce();
    });

    it("logs an error and omits the verse if no piece found during the construction of the verses property of the selection sequence", async () => {
      const verses = [makeVerseData(0), makeVerseData(1), makeVerseData(2)];
      const data = makeBundleData({ verses });
      pieceLifecycleAdapterPort.spawnVerseDomain
        .mockReturnValueOnce({ id: "verse-piece-0", type: "Verse" })
        .mockReturnValueOnce(undefined as unknown as Piece<"Verse">)
        .mockReturnValueOnce({ id: "verse-piece-2", type: "Verse" });

      await expect(service.selectBundle(data)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "VersesBundleSelectionService: verseData.piece not defined at selectBundle"
      );
      expect(selectionAdapterPort.select).toHaveBeenCalledExactlyOnceWith({
        bundle: bundlePiece,
        verseStart: VERSE_START,
        verses: [
          { id: "verse-piece-0", type: "Verse" },
          { id: "verse-piece-2", type: "Verse" },
        ],
      });
    });

    it("throws if the selection sequence rejects", async () => {
      const verse = makeVerseData(0, "#ff0000");
      const data = makeBundleData({ verses: [verse] });
      const error = new Error("selection rejected");
      selectionAdapterPort.select.mockRejectedValue(error);

      await expect(service.selectBundle(data)).rejects.toBe(error);

      expect(paintAdapter.paint).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("paints every verse child if the verse has a paint color with the paint color, after the selection sequence", async () => {
      const verses = [
        makeVerseData(0, "#ff0000"),
        makeVerseData(1),
        makeVerseData(2, "#00ff00"),
      ];
      const data = makeBundleData({ verses });

      await service.selectBundle(data);

      expect(paintAdapter.paint.mock.calls).toEqual([
        [verses[0]!.piece, "#ff0000"],
        [verses[2]!.piece, "#00ff00"],
      ]);
      expect(paintAdapter.paint.mock.invocationCallOrder[0]!).toBeGreaterThan(
        selectionAdapterPort.select.mock.invocationCallOrder[0]!
      );
    });

    it("omits painting any verse child that has no piece attached", async () => {
      const verses = [
        makeVerseData(0, "#ff0000"),
        makeVerseData(1, "#0000ff"),
        makeVerseData(2, "#00ff00"),
      ];
      const data = makeBundleData({ verses });
      pieceLifecycleAdapterPort.spawnVerseDomain
        .mockReturnValueOnce({ id: "verse-piece-0", type: "Verse" })
        .mockReturnValueOnce(undefined as unknown as Piece<"Verse">)
        .mockReturnValueOnce({ id: "verse-piece-2", type: "Verse" });

      await expect(service.selectBundle(data)).resolves.toBeUndefined();

      expect(paintAdapter.paint.mock.calls).toEqual([
        [{ id: "verse-piece-0", type: "Verse" }, "#ff0000"],
        [{ id: "verse-piece-2", type: "Verse" }, "#00ff00"],
      ]);
    });
  });
});
