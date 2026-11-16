import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { VersesBundleInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/VersesBundleInteractionService";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { VersesBundleSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/VersesBundleSelection";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import { VersesBundleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VersesBundleData";
import type { Piece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { PaintServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import { makeSequenceStateServiceDouble } from "../serviceDoubles";
import type { VersesBundlePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundle";
import type { VersesBundleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/VersesBundleDataRepository";
import { makeVersesBundleDataRepositoryDouble } from "../adapterDoubles";

const bundlePiece: Piece<"VersesBundle"> = {
  id: "bundle-piece",
  type: "VersesBundle",
};

const makeBundleData = ({
  isSelected = false,
  isBeingDragged = false,
}: {
  isSelected?: boolean;
  isBeingDragged?: boolean;
} = {}): VersesBundleData => {
  const bundleData = new VersesBundleData({
    id: "bundle-data",
    piece: bundlePiece,
    creationParams: {
      bookId: "book-id",
      chapter: 1,
      start: 1,
      count: 1,
    },
  });

  if (isSelected) {
    bundleData.select();
  }
  if (isBeingDragged) {
    bundleData.beginDrag();
  }

  return bundleData;
};

describe("pattern.bible-stack.application.services.VersesBundleInteractionService", () => {
  let service: VersesBundleInteractionService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let versesBundleDataRepositoryPort: Mocked<VersesBundleDataRepositoryPort>;
  let versesBundleSelectionServicePort: Mocked<VersesBundleSelectionServicePort>;
  let versesBundleAdapterPort: Mocked<VersesBundlePort>;
  let paintPort: Mocked<PaintServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    sequenceStateServicePort = makeSequenceStateServiceDouble({
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    });

    versesBundleDataRepositoryPort = makeVersesBundleDataRepositoryDouble();

    versesBundleSelectionServicePort = {
      selectBundle: vi.fn(async () => {}),
    };

    versesBundleAdapterPort = {
      highlight: vi.fn(),
      unhighlight: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: false,
    } as unknown as Mocked<PaintServicePort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new VersesBundleInteractionService({
      sequenceStateServicePort,
      versesBundleDataRepositoryPort,
      versesBundleSelectionServicePort,
      versesBundleAdapterPort,
      paintPort,
      loggerPort,
    });
  });

  describe("handleBundleSelection", () => {
    it("no-ops if there's an ongoing sequence", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData()
      );
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      paintPort.isActive = true;

      service.handleBundleSelection(bundlePiece);

      expect(
        versesBundleDataRepositoryPort.getBundleData
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        versesBundleSelectionServicePort.selectBundle
      ).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if no data found", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(undefined);

      service.handleBundleSelection(bundlePiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "VersesBundleInteractionService: bundleData not found at handleBundleSelection"
      );
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        versesBundleSelectionServicePort.selectBundle
      ).not.toHaveBeenCalled();
    });

    it("paints the bundle if the paint feature is active, even if it is selected", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData({ isSelected: true })
      );
      paintPort.isActive = true;

      service.handleBundleSelection(bundlePiece);

      expect(paintPort.paint).toHaveBeenCalledWith(bundlePiece);
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        versesBundleSelectionServicePort.selectBundle
      ).not.toHaveBeenCalled();
    });

    it("selects the bundle as a sequence if it is not selected and the paint feature is not active", () => {
      const bundleData = makeBundleData({ isSelected: false });
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(bundleData);

      service.handleBundleSelection(bundlePiece);

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(
        versesBundleSelectionServicePort.selectBundle
      ).toHaveBeenCalledWith(bundleData);
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("no-ops if the bundle is already selected and the paint feature is not active", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData({ isSelected: true })
      );

      service.handleBundleSelection(bundlePiece);

      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        versesBundleSelectionServicePort.selectBundle
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
    });
  });

  describe("handleBundleFocusBegin", () => {
    it("no-ops if there's an ongoing sequence", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData()
      );
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handleBundleFocusBegin(bundlePiece);

      expect(
        versesBundleDataRepositoryPort.getBundleData
      ).not.toHaveBeenCalled();
      expect(versesBundleAdapterPort.highlight).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if no data found", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(undefined);

      service.handleBundleFocusBegin(bundlePiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "VersesBundleInteractionService: bundleData not found at handleBundleFocusBegin"
      );
      expect(versesBundleAdapterPort.highlight).not.toHaveBeenCalled();
    });

    it("no-ops if the bundle is selected or being dragged", () => {
      const cases = [
        { isSelected: true, isBeingDragged: false },
        { isSelected: false, isBeingDragged: true },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
          makeBundleData(testCase)
        );

        service.handleBundleFocusBegin(bundlePiece);

        expect(versesBundleAdapterPort.highlight).not.toHaveBeenCalled();
      }
    });

    it("highlights the bundle if it is neither selected nor being dragged", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData()
      );

      service.handleBundleFocusBegin(bundlePiece);

      expect(versesBundleAdapterPort.highlight).toHaveBeenCalledWith(
        bundlePiece
      );
      expect(versesBundleAdapterPort.unhighlight).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("handleBundleFocusEnd", () => {
    it("no-ops if there's an ongoing sequence", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData()
      );
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);

      service.handleBundleFocusEnd(bundlePiece);

      expect(
        versesBundleDataRepositoryPort.getBundleData
      ).not.toHaveBeenCalled();
      expect(versesBundleAdapterPort.unhighlight).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if no data found", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(undefined);

      service.handleBundleFocusEnd(bundlePiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "VersesBundleInteractionService: bundleData not found at handleBundleFocusEnd"
      );
      expect(versesBundleAdapterPort.unhighlight).not.toHaveBeenCalled();
    });

    it("no-ops if the bundle is selected or being dragged", () => {
      const cases = [
        { isSelected: true, isBeingDragged: false },
        { isSelected: false, isBeingDragged: true },
      ] as const;

      for (const testCase of cases) {
        vi.clearAllMocks();

        versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
          makeBundleData(testCase)
        );

        service.handleBundleFocusEnd(bundlePiece);

        expect(versesBundleAdapterPort.unhighlight).not.toHaveBeenCalled();
      }
    });

    it("unhighlights the bundle if it is neither selected nor being dragged", () => {
      versesBundleDataRepositoryPort.getBundleData.mockReturnValue(
        makeBundleData()
      );

      service.handleBundleFocusEnd(bundlePiece);

      expect(versesBundleAdapterPort.unhighlight).toHaveBeenCalledWith(
        bundlePiece
      );
      expect(versesBundleAdapterPort.highlight).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
