import type {
  PieceLabelServiceParams,
  PieceLabelServicePort,
} from "bibleVizUtils.domain.ports.label";
import { InfoLabelData } from "../../domain/entities/InfoLabelData";
import type { LabelTranslucencyMode } from "bibleVizUtils.domain.models.label";
import type { BiblePieceType, Piece } from "bibleVizUtils.domain.models.canvas";
import type { ShowSequencePacing } from "bibleVizUtils.domain.models.label";

export class PieceLabelService<
  T extends BiblePieceType,
> implements PieceLabelServicePort<T> {
  #labelAdapterPort: PieceLabelServiceParams<T>["labelAdapterPort"];
  #labelDataStorePort: PieceLabelServiceParams<T>["labelDataStorePort"];
  #pieceActivityServicePort: PieceLabelServiceParams<T>["pieceActivityServicePort"];
  #labelPropertiesStrategies: PieceLabelServiceParams<T>["labelPropertiesStrategies"];
  #labelDateFormatServicePort: PieceLabelServiceParams<T>["labelDateFormatServicePort"];
  #idGeneratorPort: PieceLabelServiceParams<T>["idGeneratorPort"];
  #activityIndicatorsAdapterPort: PieceLabelServiceParams<T>["activityIndicatorsAdapterPort"];
  #labelAnimationAdapterPort: PieceLabelServiceParams<T>["labelAnimationAdapterPort"];

  constructor({
    labelAdapterPort,
    labelDataStorePort,
    pieceActivityServicePort,
    labelPropertiesStrategies,
    labelDateFormatServicePort,
    idGeneratorPort,
    activityIndicatorsAdapterPort,
    labelAnimationAdapterPort,
  }: PieceLabelServiceParams<T>) {
    this.#labelAdapterPort = labelAdapterPort;
    this.#labelDataStorePort = labelDataStorePort;
    this.#pieceActivityServicePort = pieceActivityServicePort;
    this.#labelPropertiesStrategies = labelPropertiesStrategies;
    this.#labelDateFormatServicePort = labelDateFormatServicePort;
    this.#idGeneratorPort = idGeneratorPort;
    this.#activityIndicatorsAdapterPort = activityIndicatorsAdapterPort;
    this.#labelAnimationAdapterPort = labelAnimationAdapterPort;
  }

  async showLabel({
    piece,
    translucencyMode,
    pacing = "Regular",
  }: {
    piece: Piece<T>;
    translucencyMode: LabelTranslucencyMode;
    pacing?: ShowSequencePacing;
  }): Promise<void> {
    const existingLabelData = this.#labelDataStorePort.getDataByOwnerId(
      piece.id
    );
    if (existingLabelData) {
      await this.#labelAnimationAdapterPort.displayShowFeedback({
        data: existingLabelData,
        pacing,
      });
      return;
    }

    const strategy = this.#labelPropertiesStrategies[piece.type];

    if (!strategy) {
      throw new Error(`PieceLabelService: strategy not found at showLabel`);
    }

    const label = strategy.getLabel(piece);
    const date = strategy.getDate(piece);
    const color = strategy.getColor(piece);
    const labelColor = strategy.getLabelColor(piece);
    const makesAttentionFeedback = strategy.makesAttentionFeedback;
    const labelPositioning = strategy.labelPositioning;
    const isInteractable = strategy.isInteractable;
    const dateFormat = this.#labelDateFormatServicePort.dateFormat;

    const {
      transformer: labelTransformer,
      tail: labelTail,
      label: labelText,
      date: labelDate,
    } = this.#labelAdapterPort.spawnLabel({
      piece,
      label,
      date,
      color,
      labelColor,
      labelPositioning,
      isInteractable,
      dateFormat,
      translucencyMode,
      makesAttentionFeedback,
    });

    const labelData = new InfoLabelData({
      id: this.#idGeneratorPort.getId(),
      transformer: labelTransformer,
      tail: labelTail,
      label: labelText,
      date: labelDate,
      owner: piece,
      positioning: labelPositioning,
    });

    this.#pieceActivityServicePort.updateIndicators(labelData);
    this.#labelDataStorePort.addLabelData(labelData);
    this.#labelAnimationAdapterPort.displayAttentionFeedback(labelData);
    await this.#labelAnimationAdapterPort.displayShowFeedback({
      data: labelData,
      pacing,
    });
  }

  async changeIntensity(
    piece: Piece<T>,
    translucencyMode: LabelTranslucencyMode,
    pacing: ShowSequencePacing = "Regular"
  ): Promise<void> {
    const labelData = this.#labelDataStorePort.getDataByOwnerId(piece.id);
    if (!labelData) return;

    if (translucencyMode === "Solid") {
      this.#labelAnimationAdapterPort.displayAttentionFeedback(labelData);
    } else {
      this.#labelAnimationAdapterPort.stopAttentionFeedback(labelData);
    }
    await this.#labelAnimationAdapterPort.displayChangedIntensityFeedback({
      data: labelData,
      translucencyMode,
      pacing,
    });
  }

  async hideLabel(
    piece: Piece<T>,
    pacing: ShowSequencePacing = "Regular"
  ): Promise<void> {
    const labelData = this.#labelDataStorePort.getDataByOwnerId(piece.id);
    if (!labelData) {
      throw new Error(`PieceLabelService: labelData not found at hideLabel`);
    }

    labelData.beginHiding();
    await this.#labelAnimationAdapterPort.displayHideFeedback({
      data: labelData,
      pacing,
    });
    labelData.endHiding();
    const activityIndicators = labelData.clearActivityIndicators();
    if (activityIndicators) {
      this.#activityIndicatorsAdapterPort.hideIndicators(activityIndicators);
    }
    this.#labelAnimationAdapterPort.stopAttentionFeedback(labelData);
    this.#labelAdapterPort.despawnLabel(labelData);
    this.#labelDataStorePort.removeLabelData(labelData);
  }
}
