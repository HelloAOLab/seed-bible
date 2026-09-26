import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import {
  PieceLabelService,
  type LabelPropertiesStrategies,
} from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceLabelService";
import type {
  ActivityIndicatorsAdapterPort,
  IdGeneratorPort,
  IndicatorsUpdaterPort,
  LabelAdapterPort,
  LabelDataStorePort,
  LabelFeedbackAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceLabel";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { StackLabelableBiblePiece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieceLifecycle";
import type { Piece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  LabelPositions,
  type LabelPosition,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";
import { InfoLabelData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/InfoLabelData";
import { ActivityIndicatorData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/ActivityIndicatorData";

type T = StackLabelableBiblePiece;

const bookPiece: Piece<"StackBook"> = { id: "book-piece", type: "StackBook" };
const otherBookPiece: Piece<"StackBook"> = {
  id: "other-book-piece",
  type: "StackBook",
};
const chapterPiece: Piece<"StackChapter"> = {
  id: "chapter-piece",
  type: "StackChapter",
};

const spawnedPieces = {
  transformer: {
    id: "spawned-transformer",
    type: "InfoLabelTransformer" as const,
  },
  tail: { id: "spawned-tail", type: "InfoLabelTail" as const },
  label: { id: "spawned-text", type: "InfoLabelText" as const },
  date: { id: "spawned-date", type: "InfoLabelDate" as const },
};

const makeStrategy = () => ({
  getLabel: vi.fn((piece: Piece<"StackBook">) => `label-${piece.id}`),
  getDate: vi.fn((piece: Piece<"StackBook">) => `date-${piece.id}`),
  getColor: vi.fn((_piece: Piece<"StackBook">) => "#112233"),
  getLabelColor: vi.fn((_piece: Piece<"StackBook">) => "#445566"),
  getLabelPositioning: vi.fn(
    (_piece: Piece<"StackBook">): LabelPosition => LabelPositions.RightSided
  ),
  isInteractable: vi.fn((_piece: Piece<"StackBook">) => true),
  makesAttentionFeedback: vi.fn((_piece: Piece<"StackBook">) => false),
});

const makeIndicator = (id: string): ActivityIndicatorData =>
  new ActivityIndicatorData({
    id,
    index: 0,
    indicatorType: "regular",
    piece: { id: `${id}-piece`, type: "ActivityIndicator", dataId: id },
    containerPieceId: "label-data-transformer",
    containerDataId: "label-data",
    containerType: "InfoLabelTransformer",
  });

const makeLabelData = ({
  id = "label-data",
  owner = bookPiece,
  activityIndicators = [],
}: {
  id?: string;
  owner?: Piece<"StackBook">;
  activityIndicators?: ActivityIndicatorData[];
} = {}): InfoLabelData =>
  new InfoLabelData({
    id,
    transformer: { id: `${id}-transformer`, type: "InfoLabelTransformer" },
    tail: { id: `${id}-tail`, type: "InfoLabelTail" },
    label: { id: `${id}-text`, type: "InfoLabelText" },
    owner,
    positioning: LabelPositions.Top,
    activityIndicators,
  });

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const trackSettlement = (promise: Promise<unknown>) => {
  const state = { settled: false };
  void promise.finally(() => {
    state.settled = true;
  });
  return state;
};

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("pattern.bible-stack.application.services.PieceLabelService", () => {
  let service: PieceLabelService<T>;
  let labelAdapterPort: Mocked<LabelAdapterPort>;
  let labelDataStorePort: Mocked<LabelDataStorePort>;
  let indicatorsUpdaterPort: Mocked<IndicatorsUpdaterPort>;
  let idGeneratorPort: Mocked<IdGeneratorPort>;
  let activityIndicatorsAdapterPort: Mocked<ActivityIndicatorsAdapterPort>;
  let labelAnimationAdapterPort: Mocked<LabelFeedbackAdapterPort>;
  let loggerPort: Mocked<LoggerPort>;
  let bookStrategy: ReturnType<typeof makeStrategy>;
  let labelsByOwnerId: Map<string, InfoLabelData>;

  const storeLabel = (data: InfoLabelData) => {
    labelsByOwnerId.set(data.owner.id, data);
    return data;
  };

  beforeEach(() => {
    labelsByOwnerId = new Map();
    bookStrategy = makeStrategy();

    labelAdapterPort = {
      spawnLabel: vi.fn(() => spawnedPieces),
      despawnLabel: vi.fn(),
      locateLabel: vi.fn(),
    };

    labelDataStorePort = {
      getDataByTransformerId: vi.fn(),
      getDataByTailId: vi.fn(),
      getDataByTextId: vi.fn(),
      addLabelData: vi.fn((data: InfoLabelData) => {
        labelsByOwnerId.set(data.owner.id, data);
      }),
      removeLabelData: vi.fn((data: InfoLabelData) => {
        labelsByOwnerId.delete(data.owner.id);
      }),
      getAllLabelsData: vi.fn(() => [...labelsByOwnerId.values()]),
      getDataByOwnerId: vi.fn((id: string) => labelsByOwnerId.get(id)),
    };

    indicatorsUpdaterPort = {
      updateIndicators: vi.fn(() => []),
    };

    idGeneratorPort = {
      getId: vi.fn(() => "generated-id"),
    };

    activityIndicatorsAdapterPort = {
      showIndicators: vi.fn(),
      hideIndicators: vi.fn(),
      hideIndicator: vi.fn(),
      updateIndicatorsPosition: vi.fn(),
    };

    labelAnimationAdapterPort = {
      displayAttentionFeedback: vi.fn(),
      stopAttentionFeedback: vi.fn(),
      displayShowFeedback: vi.fn().mockResolvedValue(undefined),
      displayHideFeedback: vi.fn().mockResolvedValue(undefined),
      displayChangedIntensityFeedback: vi.fn().mockResolvedValue(undefined),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new PieceLabelService<T>({
      labelAdapterPort,
      labelDataStorePort,
      indicatorsUpdaterPort,
      labelPropertiesStrategies: {
        StackBook: bookStrategy,
      } as unknown as LabelPropertiesStrategies<T>,
      dateFormatGetterPort: {
        dateFormat: "Absolute",
      },
      idGeneratorPort,
      activityIndicatorsAdapterPort,
      labelAnimationAdapterPort,
      loggerPort,
    });
  });

  describe("showLabel", () => {
    it("reuses an existing label, ending its hidding and awaiting for the show feedback with the provided pacing, skipping the rest", async () => {
      const existing = storeLabel(makeLabelData());
      existing.beginHiding();
      const feedback = makeDeferred();
      labelAnimationAdapterPort.displayShowFeedback.mockReturnValue(
        feedback.promise
      );

      const showing = service.showLabel({
        piece: bookPiece,
        translucencyMode: "Solid",
        pacing: "Fast",
      });
      const state = trackSettlement(showing);
      await flushMicrotasks();

      expect(existing.isHiding).toBe(false);
      expect(
        labelAnimationAdapterPort.displayShowFeedback
      ).toHaveBeenCalledExactlyOnceWith({ data: existing, pacing: "Fast" });
      expect(state.settled).toBe(false);

      feedback.resolve();
      await showing;

      expect(state.settled).toBe(true);
      expect(labelAdapterPort.spawnLabel).not.toHaveBeenCalled();
      expect(indicatorsUpdaterPort.updateIndicators).not.toHaveBeenCalled();
      expect(labelDataStorePort.addLabelData).not.toHaveBeenCalled();
      expect(
        labelAnimationAdapterPort.displayAttentionFeedback
      ).not.toHaveBeenCalled();
      expect(labelsByOwnerId.get(bookPiece.id)).toBe(existing);
    });

    it("catches and logs the error if the show feedback for the existing label data rejects", async () => {
      const existing = storeLabel(makeLabelData());
      const error = new Error("show failed");
      labelAnimationAdapterPort.displayShowFeedback.mockRejectedValue(error);

      await expect(
        service.showLabel({ piece: bookPiece, translucencyMode: "Solid" })
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "PieceLabelService: displayShowFeedback failed for existing label at showLabel.",
        error
      );
      expect(labelsByOwnerId.get(bookPiece.id)).toBe(existing);
      expect(labelAdapterPort.spawnLabel).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if no strategy found for the provided piece if no existing label found", async () => {
      await service.showLabel({
        piece: chapterPiece,
        translucencyMode: "Solid",
      });

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "PieceLabelService: strategy not found at showLabel"
      );
      expect(labelAdapterPort.spawnLabel).not.toHaveBeenCalled();
      expect(labelsByOwnerId.has(chapterPiece.id)).toBe(false);
      expect(
        labelAnimationAdapterPort.displayShowFeedback
      ).not.toHaveBeenCalled();
    });

    it("spawns the label with the correct arguments if no existing label found", async () => {
      bookStrategy.makesAttentionFeedback.mockReturnValue(true);

      await service.showLabel({ piece: bookPiece, translucencyMode: "Faded" });

      expect(labelAdapterPort.spawnLabel).toHaveBeenCalledExactlyOnceWith({
        piece: bookPiece,
        label: "label-book-piece",
        date: "date-book-piece",
        color: "#112233",
        labelColor: "#445566",
        labelPositioning: LabelPositions.RightSided,
        isInteractable: true,
        dateFormat: "Absolute",
        translucencyMode: "Faded",
        makesAttentionFeedback: true,
      });
    });

    it("builds an InfoLabelData with the spawned pieces", async () => {
      await service.showLabel({ piece: bookPiece, translucencyMode: "Solid" });

      const labelData = labelsByOwnerId.get(bookPiece.id);
      expect(labelData).toBeInstanceOf(InfoLabelData);
      expect(labelData?.id).toBe("generated-id");
      expect(labelData?.transformer).toBe(spawnedPieces.transformer);
      expect(labelData?.tail).toBe(spawnedPieces.tail);
      expect(labelData?.label).toBe(spawnedPieces.label);
      expect(labelData?.date).toBe(spawnedPieces.date);
      expect(labelData?.owner).toBe(bookPiece);
      expect(labelData?.positioning).toBe(LabelPositions.RightSided);
      expect(labelData?.isHiding).toBe(false);
    });

    it("updates the indicators of the new label data, before displaying the show feedback", async () => {
      await service.showLabel({ piece: bookPiece, translucencyMode: "Solid" });

      const labelData = labelsByOwnerId.get(bookPiece.id);
      expect(
        indicatorsUpdaterPort.updateIndicators
      ).toHaveBeenCalledExactlyOnceWith(labelData);
      expect(
        indicatorsUpdaterPort.updateIndicators.mock.invocationCallOrder[0]!
      ).toBeLessThan(
        labelAnimationAdapterPort.displayShowFeedback.mock
          .invocationCallOrder[0]!
      );
    });

    it("adds the new label data to the repository, before displaying the show feedback", async () => {
      let storedWhenShowing: InfoLabelData | undefined;
      labelAnimationAdapterPort.displayShowFeedback.mockImplementation(
        async () => {
          storedWhenShowing = labelsByOwnerId.get(bookPiece.id);
        }
      );

      await service.showLabel({ piece: bookPiece, translucencyMode: "Solid" });

      const labelData = labelsByOwnerId.get(bookPiece.id);
      expect(labelData).toBeInstanceOf(InfoLabelData);
      expect(storedWhenShowing).toBe(labelData);
    });

    it("displays the attention feedback for the new label data if requested, before displaying the show feedback", async () => {
      bookStrategy.makesAttentionFeedback.mockImplementation(
        (piece) => piece.id === bookPiece.id
      );

      await service.showLabel({ piece: bookPiece, translucencyMode: "Solid" });
      await service.showLabel({
        piece: otherBookPiece,
        translucencyMode: "Solid",
      });

      const labelData = labelsByOwnerId.get(bookPiece.id);
      expect(
        labelAnimationAdapterPort.displayAttentionFeedback
      ).toHaveBeenCalledExactlyOnceWith(labelData);
      expect(
        labelAnimationAdapterPort.displayAttentionFeedback.mock
          .invocationCallOrder[0]!
      ).toBeLessThan(
        labelAnimationAdapterPort.displayShowFeedback.mock
          .invocationCallOrder[0]!
      );
    });

    it("awaits for the show feedback sequence", async () => {
      const feedback = makeDeferred();
      labelAnimationAdapterPort.displayShowFeedback.mockReturnValue(
        feedback.promise
      );

      const showing = service.showLabel({
        piece: bookPiece,
        translucencyMode: "Solid",
      });
      const state = trackSettlement(showing);
      await flushMicrotasks();

      expect(
        labelAnimationAdapterPort.displayShowFeedback
      ).toHaveBeenCalledExactlyOnceWith({
        data: labelsByOwnerId.get(bookPiece.id),
        pacing: "Regular",
      });
      expect(state.settled).toBe(false);

      feedback.resolve();
      await flushMicrotasks();

      expect(state.settled).toBe(true);
    });

    it("catches and logs the error if the show feedback for the new label data rejects", async () => {
      const error = new Error("show failed");
      labelAnimationAdapterPort.displayShowFeedback.mockRejectedValue(error);

      await expect(
        service.showLabel({ piece: bookPiece, translucencyMode: "Solid" })
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "PieceLabelService: displayShowFeedback failed for new label at showLabel.",
        error
      );
      expect(labelsByOwnerId.get(bookPiece.id)).toBeInstanceOf(InfoLabelData);
    });
  });

  describe("changeIntensity", () => {
    it("no-ops if no label found for the provided piece", async () => {
      await service.changeIntensity(bookPiece, "Solid");

      expect(
        labelAnimationAdapterPort.displayAttentionFeedback
      ).not.toHaveBeenCalled();
      expect(
        labelAnimationAdapterPort.stopAttentionFeedback
      ).not.toHaveBeenCalled();
      expect(
        labelAnimationAdapterPort.displayChangedIntensityFeedback
      ).not.toHaveBeenCalled();
    });

    it("displays the attention feedback only if the target intensity is Solid", async () => {
      const labelData = storeLabel(makeLabelData());

      await service.changeIntensity(bookPiece, "Solid");

      expect(
        labelAnimationAdapterPort.displayAttentionFeedback
      ).toHaveBeenCalledExactlyOnceWith(labelData);
      expect(
        labelAnimationAdapterPort.stopAttentionFeedback
      ).not.toHaveBeenCalled();
    });

    it("stops the attention feedback only if the target intensity is Faded", async () => {
      const labelData = storeLabel(makeLabelData());

      await service.changeIntensity(bookPiece, "Faded");

      expect(
        labelAnimationAdapterPort.stopAttentionFeedback
      ).toHaveBeenCalledExactlyOnceWith(labelData);
      expect(
        labelAnimationAdapterPort.displayAttentionFeedback
      ).not.toHaveBeenCalled();
    });

    it("awaits for the change intensity feedback with the correct arguments", async () => {
      const labelData = storeLabel(makeLabelData());
      const feedback = makeDeferred();
      labelAnimationAdapterPort.displayChangedIntensityFeedback.mockReturnValue(
        feedback.promise
      );

      const changing = service.changeIntensity(bookPiece, "Faded", "Fast");
      const state = trackSettlement(changing);
      await flushMicrotasks();

      expect(
        labelAnimationAdapterPort.displayChangedIntensityFeedback
      ).toHaveBeenCalledExactlyOnceWith({
        data: labelData,
        translucencyMode: "Faded",
        pacing: "Fast",
      });
      expect(state.settled).toBe(false);

      feedback.resolve();
      await flushMicrotasks();

      expect(state.settled).toBe(true);
    });
  });

  describe("hideLabel", () => {
    it("no-ops if no label found for the provided piece", async () => {
      await service.hideLabel(bookPiece);

      expect(
        labelAnimationAdapterPort.displayHideFeedback
      ).not.toHaveBeenCalled();
      expect(labelAdapterPort.despawnLabel).not.toHaveBeenCalled();
      expect(labelDataStorePort.removeLabelData).not.toHaveBeenCalled();
    });

    it("makes the label hidding if found", async () => {
      const labelData = storeLabel(makeLabelData());
      const feedback = makeDeferred();
      labelAnimationAdapterPort.displayHideFeedback.mockReturnValue(
        feedback.promise
      );

      const hiding = service.hideLabel(bookPiece);
      await flushMicrotasks();

      expect(labelData.isHiding).toBe(true);

      feedback.resolve();
      await hiding;
    });

    it("awaits for the hide feedback with the correct arguments", async () => {
      const labelData = storeLabel(makeLabelData());
      const feedback = makeDeferred();
      labelAnimationAdapterPort.displayHideFeedback.mockReturnValue(
        feedback.promise
      );

      const hiding = service.hideLabel(bookPiece, "Slow");
      const state = trackSettlement(hiding);
      await flushMicrotasks();

      expect(
        labelAnimationAdapterPort.displayHideFeedback
      ).toHaveBeenCalledExactlyOnceWith({ data: labelData, pacing: "Slow" });
      expect(state.settled).toBe(false);
      expect(labelAdapterPort.despawnLabel).not.toHaveBeenCalled();

      feedback.resolve();
      await flushMicrotasks();

      expect(state.settled).toBe(true);
    });

    it("returns if the label is not hidding anymore after the hide sequence resolves", async () => {
      const indicator = makeIndicator("indicator");
      const labelData = storeLabel(
        makeLabelData({ activityIndicators: [indicator] })
      );
      const feedback = makeDeferred();
      labelAnimationAdapterPort.displayHideFeedback.mockReturnValue(
        feedback.promise
      );

      const hiding = service.hideLabel(bookPiece);
      await service.showLabel({ piece: bookPiece, translucencyMode: "Solid" });
      feedback.resolve();
      await hiding;

      expect(labelData.isHiding).toBe(false);
      expect(labelData.activityIndicators).toEqual([indicator]);
      expect(labelsByOwnerId.get(bookPiece.id)).toBe(labelData);
      expect(
        activityIndicatorsAdapterPort.hideIndicators
      ).not.toHaveBeenCalled();
      expect(
        labelAnimationAdapterPort.stopAttentionFeedback
      ).not.toHaveBeenCalled();
      expect(labelAdapterPort.despawnLabel).not.toHaveBeenCalled();
      expect(labelDataStorePort.removeLabelData).not.toHaveBeenCalled();
    });

    it("clears the activity indicators for the label and hides them if they exists, if it was hidding", async () => {
      const indicators = [makeIndicator("first"), makeIndicator("second")];
      const labelWithIndicators = storeLabel(
        makeLabelData({ activityIndicators: indicators })
      );
      storeLabel(makeLabelData({ id: "other-label", owner: otherBookPiece }));

      await service.hideLabel(bookPiece);
      await service.hideLabel(otherBookPiece);

      expect(labelWithIndicators.activityIndicators).toEqual([]);
      expect(
        activityIndicatorsAdapterPort.hideIndicators
      ).toHaveBeenCalledExactlyOnceWith(indicators);
    });

    it("stops attention feedback for the label if it was hidding", async () => {
      const labelData = storeLabel(makeLabelData());

      await service.hideLabel(bookPiece);

      expect(
        labelAnimationAdapterPort.stopAttentionFeedback
      ).toHaveBeenCalledExactlyOnceWith(labelData);
    });

    it("despawns the label if it was hidding", async () => {
      const labelData = storeLabel(makeLabelData());

      await service.hideLabel(bookPiece);

      expect(labelAdapterPort.despawnLabel).toHaveBeenCalledExactlyOnceWith(
        labelData
      );
      expect(labelData.isHiding).toBe(false);
    });

    it("removes the label from the repo if it was hidding", async () => {
      storeLabel(makeLabelData());

      await service.hideLabel(bookPiece);

      expect(labelsByOwnerId.has(bookPiece.id)).toBe(false);
      expect(service.getPieceLabel(bookPiece)).toBeUndefined();
    });

    it("catches and logs the error if the hide feedback sequence rejects", async () => {
      const labelData = storeLabel(makeLabelData());
      const error = new Error("hide failed");
      labelAnimationAdapterPort.displayHideFeedback.mockRejectedValue(error);

      await expect(service.hideLabel(bookPiece)).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "PieceLabelService: displayHideFeedback failed at hideLabel.",
        error
      );
      expect(labelsByOwnerId.get(bookPiece.id)).toBe(labelData);
      expect(labelAdapterPort.despawnLabel).not.toHaveBeenCalled();
    });
  });

  describe("getPieceLabel", () => {
    it("tries to find the label data by the piece id and returns the result", () => {
      const labelData = storeLabel(makeLabelData());

      expect(service.getPieceLabel(bookPiece)).toBe(labelData);
      expect(labelDataStorePort.getDataByOwnerId).toHaveBeenCalledWith(
        bookPiece.id
      );
      expect(service.getPieceLabel(otherBookPiece)).toBeUndefined();
    });
  });

  describe("updateLabelPosition", () => {
    it("no-ops if no label found for piece", () => {
      service.updateLabelPosition(bookPiece);

      expect(bookStrategy.getLabelPositioning).not.toHaveBeenCalled();
      expect(labelAdapterPort.locateLabel).not.toHaveBeenCalled();
    });

    it("locates the label with the position provided by the strategy", () => {
      const labelData = storeLabel(makeLabelData());
      bookStrategy.getLabelPositioning.mockReturnValue(
        LabelPositions.LeftSided
      );

      service.updateLabelPosition(bookPiece);

      expect(bookStrategy.getLabelPositioning).toHaveBeenCalledExactlyOnceWith(
        bookPiece
      );
      expect(labelAdapterPort.locateLabel).toHaveBeenCalledExactlyOnceWith({
        positioning: LabelPositions.LeftSided,
        piece: bookPiece,
        infoLabelTransformer: labelData.transformer,
      });
    });
  });
});
