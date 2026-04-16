import type { PieceLabelServiceParams } from "bibleVizUtils.domain.ports.label";
import { InfoLabelData } from "../../domain/entities/InfoLabelData";
import type { LabelTranslucencyMode } from "bibleVizUtils.domain.models.label";
import type { BiblePieceType, Piece } from "bibleVizUtils.domain.models.canvas";

export class PieceLabelService<T extends BiblePieceType> {
  #labelAdapterPort: PieceLabelServiceParams<T>["labelAdapterPort"];
  #labelDataStorePort: PieceLabelServiceParams<T>["labelDataStorePort"];
  #pieceActivityServicePort: PieceLabelServiceParams<T>["pieceActivityServicePort"];
  #labelPropertiesStrategies: PieceLabelServiceParams<T>["labelPropertiesStrategies"];
  #labelDateFormatServicePort: PieceLabelServiceParams<T>["labelDateFormatServicePort"];
  #idGeneratorPort: PieceLabelServiceParams<T>["idGeneratorPort"];
  constructor({
    labelAdapterPort,
    labelDataStorePort,
    pieceActivityServicePort,
    labelPropertiesStrategies,
    labelDateFormatServicePort,
    idGeneratorPort,
  }: PieceLabelServiceParams<T>) {
    this.#labelAdapterPort = labelAdapterPort;
    this.#labelDataStorePort = labelDataStorePort;
    this.#pieceActivityServicePort = pieceActivityServicePort;
    this.#labelPropertiesStrategies = labelPropertiesStrategies;
    this.#labelDateFormatServicePort = labelDateFormatServicePort;
    this.#idGeneratorPort = idGeneratorPort;
  }

  showLabel({
    piece,
    translucencyMode,
  }: {
    piece: Piece<T>;
    translucencyMode: LabelTranslucencyMode;
  }) {
    const strategy = this.#labelPropertiesStrategies[piece.type];

    if (!strategy) {
      throw new Error(`PieceLabelService: strategy not found at showLabel`);
    }

    const label = strategy.getLabel(piece);
    const date = strategy.getDate(piece);
    const color = strategy.getColor(piece);
    const labelColor = strategy.getLabelColor(piece);
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
    });

    const labelData = new InfoLabelData({
      id: this.#idGeneratorPort.getId(),
      transformer: labelTransformer,
      tail: labelTail,
      label: labelText,
      date: labelDate,
      owner: piece,
    });

    this.#pieceActivityServicePort.updateIndicators(labelData);
    this.#labelDataStorePort.addLabelData(labelData);
  }

  hideLabel(piece: Piece<T>) {
    const labelData = this.#labelDataStorePort.getDataByOwnerId(piece.id);
    if (!labelData) {
      throw new Error(`PieceLabelService: labelData not found at hideLabel`);
    }

    this.#labelAdapterPort.despawnLabel(labelData);
  }
}
