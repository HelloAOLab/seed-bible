import type { CoverInteractionServicePort } from "../../../application/ports/in/CoverInteraction";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import type { CoverBot } from "../../models/stack";

interface ControllerParams {
  coverInteractionServicePort: CoverInteractionServicePort;
  coverMapper: StackCoverMapper;
}

export class CoverInteractionController {
  #coverInteractionServicePort: ControllerParams["coverInteractionServicePort"];
  #coverMapper: ControllerParams["coverMapper"];

  constructor({ coverInteractionServicePort, coverMapper }: ControllerParams) {
    this.#coverInteractionServicePort = coverInteractionServicePort;
    this.#coverMapper = coverMapper;
  }

  handleCoverClick(cover: CoverBot) {
    const coverData = this.#coverMapper.toDomain(cover);
    this.#coverInteractionServicePort.handleCoverClick(coverData);
  }
}
