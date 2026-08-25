import type { ExperienceDisplayerPort } from "../ports/in/experience";
import type { LoggerPort, PiecesSequencePort } from "../ports/out/experience";
import type { PiecesSetUpPort } from "../ports/in/piecesSetUp";
import type { EnvironmentSetUpPort } from "../ports/in/environmentSetUp";
import type { ExperienceKey } from "../../domain/models/experience";

interface ServiceParams {
  piecesSequencePort: PiecesSequencePort;
  logger: LoggerPort;
  piecesSetUpPort: PiecesSetUpPort;
  environmentSetUpPort: EnvironmentSetUpPort;
  getExperienceKey: () => ExperienceKey;
}

export class ExperienceService implements ExperienceDisplayerPort {
  #piecesSequencePort: ServiceParams["piecesSequencePort"];
  #piecesSetUpPort: ServiceParams["piecesSetUpPort"];
  #environmentSetUpPort: ServiceParams["environmentSetUpPort"];
  #logger: ServiceParams["logger"];
  #getExperienceKey: ServiceParams["getExperienceKey"];
  #isExperienceDisplayed = false;
  #isDisplayingExperience = false;

  constructor({
    piecesSequencePort,
    piecesSetUpPort,
    environmentSetUpPort,
    logger,
    getExperienceKey,
  }: ServiceParams) {
    this.#piecesSequencePort = piecesSequencePort;
    this.#piecesSetUpPort = piecesSetUpPort;
    this.#environmentSetUpPort = environmentSetUpPort;
    this.#logger = logger;
    this.#getExperienceKey = getExperienceKey;
  }

  async tryDisplayExperience(): Promise<boolean> {
    if (this.#isExperienceDisplayed || this.#isDisplayingExperience) {
      return true;
    }

    return this.#displayExperience();
  }

  async #displayExperience(): Promise<boolean> {
    this.#isDisplayingExperience = true;
    const experience = this.#getExperienceKey();
    this.#environmentSetUpPort.setUp(experience);
    this.#piecesSetUpPort.setUpPieces(experience);
    try {
      await this.#piecesSequencePort.displayDropSequence(experience);
      this.#logger.log("house-of-the-lord experience displayed");
      this.#isExperienceDisplayed = true;
      return true;
    } catch (error) {
      this.#logger.error(
        "Failed to display house-of-the-lord experience",
        error
      );
      return false;
    } finally {
      this.#isDisplayingExperience = false;
    }
  }

  clearExperience(): void {
    this.#logger.log("house-of-the-lord experience cleared");
    // Hide pieces
  }
}
