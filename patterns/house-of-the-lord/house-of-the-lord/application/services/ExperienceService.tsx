import type { ExperienceServicePort } from "../ports/in/experience";
import type { PiecesSequencePort } from "../ports/out/experience";
import type { PiecesSetUpPort } from "../ports/in/piecesSetUp";
import type { EnvironmentSetUpPort } from "../ports/in/environmentSetUp";
import type { ExperienceKey } from "../../domain/models/experience";
import type { LoggerAdapterPort } from "../ports/out/LoggerAdapter";
import type { BaseEventManager } from "./BaseEventManager";
import type { DomainEventMap } from "../../domain/models/events";

interface ServiceParams {
  piecesSequencePort: PiecesSequencePort;
  logger: LoggerAdapterPort;
  piecesSetUpPort: PiecesSetUpPort;
  environmentSetUpPort: EnvironmentSetUpPort;
  eventBus: BaseEventManager<DomainEventMap>;
}

export class ExperienceService implements ExperienceServicePort {
  #piecesSequencePort: ServiceParams["piecesSequencePort"];
  #piecesSetUpPort: ServiceParams["piecesSetUpPort"];
  #environmentSetUpPort: ServiceParams["environmentSetUpPort"];
  #logger: ServiceParams["logger"];
  #experience: ExperienceKey | null = null;
  #isDisplayingExperience = false;
  #queuedExperience: ExperienceKey | null = null;
  #eventBus: ServiceParams["eventBus"];

  constructor({
    piecesSequencePort,
    piecesSetUpPort,
    environmentSetUpPort,
    logger,
    eventBus,
  }: ServiceParams) {
    this.#piecesSequencePort = piecesSequencePort;
    this.#piecesSetUpPort = piecesSetUpPort;
    this.#environmentSetUpPort = environmentSetUpPort;
    this.#logger = logger;
    this.#eventBus = eventBus;
  }

  #setExperience(experience: ExperienceKey | null): void {
    if (this.#experience === experience) return;
    this.#experience = experience;
    this.#eventBus.emit("OnExperienceChanged", { experience });
  }

  async tryDisplayExperience(experience: ExperienceKey): Promise<boolean> {
    if (experience === this.#experience) {
      return true;
    }
    const isQueued = !!this.#queuedExperience;
    this.#queuedExperience = experience;
    if (this.#isDisplayingExperience) {
      if (isQueued) {
        return true;
      }
      await this.clearExperience();
    }
    this.#setExperience(this.#queuedExperience);
    this.#queuedExperience = null;

    return this.#displayExperience();
  }

  async #displayExperience(): Promise<boolean> {
    if (!this.#experience) {
      this.#logger.error(
        "ExperienceService: experience is not defined at displayExperience."
      );
      return false;
    }
    this.#isDisplayingExperience = true;
    this.#environmentSetUpPort.setUp(this.#experience);
    this.#piecesSetUpPort.setUpPieces(this.#experience);
    try {
      await this.#piecesSequencePort.displayDropSequence(this.#experience);
      this.#logger.log("house-of-the-lord experience displayed");
      return true;
    } catch (error) {
      this.#logger.error(
        "Failed to display house-of-the-lord experience",
        error
      );
      this.#setExperience(null);
      return false;
    } finally {
      this.#isDisplayingExperience = false;
    }
  }

  async clearExperience(): Promise<void> {
    const experience = this.#experience;
    if (!experience) {
      this.#logger.error(
        "ExperienceService: experience is not defined at clearExperience."
      );
      return;
    }
    this.#piecesSequencePort.tryAbortCurrentDropSequence();
    try {
      await this.#piecesSequencePort.displayClearSequence(experience);
    } catch (error) {
      this.#logger.error("Failed to clear house-of-the-lord experience", error);
    } finally {
      this.#piecesSetUpPort.clearPieces(experience);
      this.#setExperience(null);
    }
  }

  get experience() {
    return this.#experience;
  }
}
