import type { ExperienceDisplayerPort } from "tabernacle.application.ports.in.experience";
import type {
  LoggerPort,
  PanelDisplayerPort,
  PiecesSequencePort,
  UpdatePiecesPositionPort,
} from "../ports/out/experience";
import type { HitboxSpawnerPort } from "tabernacle.application.ports.in.hitboxLifecycle";

interface ServiceParams {
  piecesSequencePort: PiecesSequencePort;
  panelDisplayerPort: PanelDisplayerPort;
  logger: LoggerPort;
  hitboxSpawnerPort: HitboxSpawnerPort;
  updatePiecesPositionPort: UpdatePiecesPositionPort;
}

export class ExperienceService implements ExperienceDisplayerPort {
  #piecesSequencePort: ServiceParams["piecesSequencePort"];
  #panelDisplayerPort: ServiceParams["panelDisplayerPort"];
  #updatePiecesPositionPort: ServiceParams["updatePiecesPositionPort"];
  #hitboxSpawnerPort: ServiceParams["hitboxSpawnerPort"];
  #logger: ServiceParams["logger"];
  #isExperienceDisplayed = false;

  constructor({
    piecesSequencePort,
    panelDisplayerPort,
    updatePiecesPositionPort,
    logger,
    hitboxSpawnerPort,
  }: ServiceParams) {
    this.#piecesSequencePort = piecesSequencePort;
    this.#panelDisplayerPort = panelDisplayerPort;
    this.#updatePiecesPositionPort = updatePiecesPositionPort;
    this.#logger = logger;
    this.#hitboxSpawnerPort = hitboxSpawnerPort;
  }

  async tryDisplayExperience(): Promise<boolean> {
    if (this.#isExperienceDisplayed) {
      return true;
    }

    return this.#displayExperience();
  }

  async #displayExperience(): Promise<boolean> {
    try {
      this.#updatePiecesPositionPort.updatePositions();
      this.#hitboxSpawnerPort.spawnPiecesHitbox();
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
