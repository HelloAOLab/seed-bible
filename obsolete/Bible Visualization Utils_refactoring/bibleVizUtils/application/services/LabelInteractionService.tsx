import type { LabelInteractionServicePort } from "bibleVizUtils.domain.ports.label";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { LabelInteractionEventPort } from "bibleVizUtils.domain.ports.label";
import type { LabelDataStorePort } from "bibleVizUtils.domain.ports.piece";

interface ServiceParams {
  labelInteractionEventPort: LabelInteractionEventPort;
  labelDataStorePort: LabelDataStorePort;
}

export class LabelInteractionService implements LabelInteractionServicePort {
  #labelInteractionEventPort: ServiceParams["labelInteractionEventPort"];
  #labelDataStorePort: ServiceParams["labelDataStorePort"];

  constructor({
    labelInteractionEventPort,
    labelDataStorePort,
  }: ServiceParams) {
    this.#labelInteractionEventPort = labelInteractionEventPort;
    this.#labelDataStorePort = labelDataStorePort;
  }

  handleLabelTailClick(labelTail: Piece<"InfoLabelTail">) {
    const data = this.#labelDataStorePort.getDataByTailId(labelTail.id);
    if (!data) {
      return;
    }

    this.#labelInteractionEventPort.emit("OnPieceClick", { piece: data.owner });
  }

  handleLabelTextClick(labelText: Piece<"InfoLabelText">) {
    const data = this.#labelDataStorePort.getDataByTextId(labelText.id);
    if (!data) {
      return;
    }

    this.#labelInteractionEventPort.emit("OnPieceClick", { piece: data.owner });
  }
}
