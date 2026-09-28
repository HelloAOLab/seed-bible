import type { LabelInteractionPort } from "../../../application/ports/in/LabelInteraction";
import type { LabelDataStore } from "../../adapters/labels/LabelDataStore";
import type { InfoLabelTailBot, InfoLabelTextBot } from "../../models/stack";

interface ControllerParams {
  labelDataStore: LabelDataStore;
  labelInteractionServicePort: LabelInteractionPort;
}

export class LabelInteractionController {
  #labelDataStore: ControllerParams["labelDataStore"];
  #labelInteractionServicePort: ControllerParams["labelInteractionServicePort"];

  constructor({
    labelDataStore,
    labelInteractionServicePort,
  }: ControllerParams) {
    this.#labelDataStore = labelDataStore;
    this.#labelInteractionServicePort = labelInteractionServicePort;
  }

  handleLabelTextClick(labelTextBot: InfoLabelTextBot) {
    this.#handleLabelPieceClick(labelTextBot);
  }

  handleLabelTailClick(labelTailBot: InfoLabelTailBot) {
    this.#handleLabelPieceClick(labelTailBot);
  }

  #handleLabelPieceClick(piece: InfoLabelTailBot | InfoLabelTextBot) {
    if (!piece.tags.ownerBotId) {
      throw new Error(
        "LabelInteractionController: piece.tags.ownerBotId not defined at handleLabelPieceClick."
      );
    }
    const data = this.#labelDataStore.getDataByOwnerId(piece.tags.ownerBotId);
    if (!data) {
      throw new Error(
        "LabelInteractionController: data not found at handleLabelPieceClick."
      );
    }
    const transformer = data.transformer;
    this.#labelInteractionServicePort.handleLabelSelected(transformer);
  }
}
