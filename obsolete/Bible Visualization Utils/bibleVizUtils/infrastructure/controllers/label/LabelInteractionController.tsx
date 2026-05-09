import type {
  InfoLabelTailBot,
  InfoLabelTextBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import { InfoLabelTextMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper";
import type { LabelInteractionServicePort } from "bibleVizUtils.domain.ports.label";

interface ControllerProps {
  labelInteractionServicePort: LabelInteractionServicePort;
}

export class LabelInteractionController {
  #labelInteractionServicePort: ControllerProps["labelInteractionServicePort"];

  constructor({ labelInteractionServicePort }: ControllerProps) {
    this.#labelInteractionServicePort = labelInteractionServicePort;
  }

  handleLabelTailClick(labelTail: InfoLabelTailBot) {
    const piece = InfoLabelTailMapper.toDomain(labelTail);
    this.#labelInteractionServicePort.handleLabelTailClick(piece);
  }

  handleLabelTextClick(labelText: InfoLabelTextBot) {
    const piece = InfoLabelTextMapper.toDomain(labelText);
    this.#labelInteractionServicePort.handleLabelTextClick(piece);
  }
}
