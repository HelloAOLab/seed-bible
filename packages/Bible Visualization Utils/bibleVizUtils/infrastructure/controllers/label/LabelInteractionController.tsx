import type {
  InfoLabelTailBot,
  InfoLabelTextBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { LabelInteractionServicePort } from "bibleVizUtils.domain.ports.label";

interface InfoLabelTextMapperPort {
  toDomain: (bot: InfoLabelTextBot) => Piece<"InfoLabelText">;
}

interface ControllerProps {
  labelInteractionServicePort: LabelInteractionServicePort;
  infoLabelTextMapperPort: InfoLabelTextMapperPort;
}

export class LabelInteractionController {
  #labelInteractionServicePort: ControllerProps["labelInteractionServicePort"];
  #infoLabelTextMapperPort: InfoLabelTextMapperPort;

  constructor({
    labelInteractionServicePort,
    infoLabelTextMapperPort,
  }: ControllerProps) {
    this.#labelInteractionServicePort = labelInteractionServicePort;
    this.#infoLabelTextMapperPort = infoLabelTextMapperPort;
  }

  handleLabelTailClick(labelTail: InfoLabelTailBot) {
    const piece = InfoLabelTailMapper.toDomain(labelTail);
    this.#labelInteractionServicePort.handleLabelTailClick(piece);
  }

  handleLabelTextClick(labelText: InfoLabelTextBot) {
    const piece = this.#infoLabelTextMapperPort.toDomain(labelText);
    this.#labelInteractionServicePort.handleLabelTextClick(piece);
  }
}
