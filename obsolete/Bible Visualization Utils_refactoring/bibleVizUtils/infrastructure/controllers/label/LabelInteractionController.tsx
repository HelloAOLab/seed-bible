import type {
  InfoLabelTailBot,
  InfoLabelTextBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import type { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { LabelInteractionServicePort } from "bibleVizUtils.domain.ports.label";

interface InfoLabelTextMapperPort {
  toDomain: (bot: InfoLabelTextBot) => Piece<"InfoLabelText">;
}

interface ControllerProps {
  labelInteractionServicePort: LabelInteractionServicePort;
  infoLabelTextMapperPort: InfoLabelTextMapperPort;
  infoLabelTailMapperPort: InfoLabelTailMapper;
}

export class LabelInteractionController {
  #labelInteractionServicePort: ControllerProps["labelInteractionServicePort"];
  #infoLabelTextMapperPort: InfoLabelTextMapperPort;
  #infoLabelTailMapperPort: ControllerProps["infoLabelTailMapperPort"];

  constructor({
    labelInteractionServicePort,
    infoLabelTextMapperPort,
    infoLabelTailMapperPort,
  }: ControllerProps) {
    this.#labelInteractionServicePort = labelInteractionServicePort;
    this.#infoLabelTextMapperPort = infoLabelTextMapperPort;
    this.#infoLabelTailMapperPort = infoLabelTailMapperPort;
  }

  handleLabelTailClick(labelTail: InfoLabelTailBot) {
    const piece = this.#infoLabelTailMapperPort.toDomain(labelTail);
    this.#labelInteractionServicePort.handleLabelTailClick(piece);
  }

  handleLabelTextClick(labelText: InfoLabelTextBot) {
    const piece = this.#infoLabelTextMapperPort.toDomain(labelText);
    this.#labelInteractionServicePort.handleLabelTextClick(piece);
  }
}
