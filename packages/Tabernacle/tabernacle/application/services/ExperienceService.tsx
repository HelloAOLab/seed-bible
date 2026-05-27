import type { ExperienceDisplayerPort } from "tabernacle.application.ports.in.experience";
import type {
  LoggerPort,
  PanelDisplayerPort,
  PiecesSequencePort,
} from "../ports/out/experience";

interface ServiceParams {
  piecesSequencePort: PiecesSequencePort;
  panelDisplayerPort: PanelDisplayerPort;
  logger: LoggerPort;
}

export class ExperienceService implements ExperienceDisplayerPort {
  #piecesSequencePort: ServiceParams["piecesSequencePort"];
  #panelDisplayerPort: ServiceParams["panelDisplayerPort"];
  #logger: ServiceParams["logger"];
  #isExperienceDisplayed = false;

  constructor({
    piecesSequencePort,
    panelDisplayerPort,
    logger,
  }: ServiceParams) {
    this.#piecesSequencePort = piecesSequencePort;
    this.#panelDisplayerPort = panelDisplayerPort;
    this.#logger = logger;
  }

  async tryDisplayExperience(): Promise<boolean> {
    if (this.#isExperienceDisplayed) {
      return true;
    }

    return this.#displayExperience();
  }

  async #displayExperience(): Promise<boolean> {
    try {
      this.#panelDisplayerPort.displayPanel();
      await this.#piecesSequencePort.displayDropSequence();
      this.#isExperienceDisplayed = true;
      this.#logger.log("Tabernacle experience displayed");
      return true;
    } catch (error) {
      this.#logger.error("Failed to display tabernacle experience", error);
      return false;
    }
  }

  clearExperience(): void {
    this.#logger.log("Tabernacle experience cleared");
    // Hide pieces
  }
}
