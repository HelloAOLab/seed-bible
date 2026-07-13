import { InfoLabelData } from "../../domain/entities/InfoLabelData";
import type {
  LabelPosition,
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../domain/models/label";
import type { Piece, BiblePiece } from "../../domain/models/canvas";
import type { PieceLabelServicePort } from "../ports/in/PieceLabel";
import type {
  LabelAdapterPort,
  LabelDataStorePort,
  IndicatorsUpdaterPort,
  IdGeneratorPort,
  ActivityIndicatorsAdapterPort,
  LabelFeedbackAdapterPort,
} from "../ports/out/PieceLabel";
import type { LabelDateFormatGetterPort } from "../ports/in/LabelDate";

export interface LabelStrategy<P extends Piece> {
  getLabel: (piece: P) => string;
  getDate?: undefined | ((piece: P) => string | undefined);
  getColor: (piece: P) => string;
  getLabelColor: (piece: P) => string;
  getLabelPositioning: (piece: P) => LabelPosition;
  isInteractable: boolean;
  makesAttentionFeedback: boolean;
}

export type LabelPropertiesStrategies<T extends BiblePiece> = {
  [K in T]: LabelStrategy<Piece<K>>;
};

export interface PieceLabelServiceParams<T extends BiblePiece> {
  labelAdapterPort: LabelAdapterPort;
  labelDataStorePort: LabelDataStorePort;
  indicatorsUpdaterPort: IndicatorsUpdaterPort;
  labelPropertiesStrategies: LabelPropertiesStrategies<T>;
  dateFormatGetterPort: LabelDateFormatGetterPort;
  idGeneratorPort: IdGeneratorPort;
  activityIndicatorsAdapterPort: ActivityIndicatorsAdapterPort;
  labelAnimationAdapterPort: LabelFeedbackAdapterPort;
}

export class PieceLabelService<
  T extends BiblePiece,
> implements PieceLabelServicePort<T> {
  #labelAdapterPort: PieceLabelServiceParams<T>["labelAdapterPort"];
  #labelDataStorePort: PieceLabelServiceParams<T>["labelDataStorePort"];
  #indicatorsUpdaterPort: PieceLabelServiceParams<T>["indicatorsUpdaterPort"];
  #labelPropertiesStrategies: PieceLabelServiceParams<T>["labelPropertiesStrategies"];
  #dateFormatGetterPort: PieceLabelServiceParams<T>["dateFormatGetterPort"];
  #idGeneratorPort: PieceLabelServiceParams<T>["idGeneratorPort"];
  #activityIndicatorsAdapterPort: PieceLabelServiceParams<T>["activityIndicatorsAdapterPort"];
  #labelAnimationAdapterPort: PieceLabelServiceParams<T>["labelAnimationAdapterPort"];

  constructor({
    labelAdapterPort,
    labelDataStorePort,
    indicatorsUpdaterPort,
    labelPropertiesStrategies,
    dateFormatGetterPort,
    idGeneratorPort,
    activityIndicatorsAdapterPort,
    labelAnimationAdapterPort,
  }: PieceLabelServiceParams<T>) {
    this.#labelAdapterPort = labelAdapterPort;
    this.#labelDataStorePort = labelDataStorePort;
    this.#indicatorsUpdaterPort = indicatorsUpdaterPort;
    this.#labelPropertiesStrategies = labelPropertiesStrategies;
    this.#dateFormatGetterPort = dateFormatGetterPort;
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
    const date = strategy.getDate?.(piece);
    const color = strategy.getColor(piece);
    const labelColor = strategy.getLabelColor(piece);
    const makesAttentionFeedback = strategy.makesAttentionFeedback;
    const labelPositioning = strategy.getLabelPositioning(piece);
    const isInteractable = strategy.isInteractable;
    const dateFormat = this.#dateFormatGetterPort.dateFormat;

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

    this.#indicatorsUpdaterPort.updateIndicators(labelData);
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
