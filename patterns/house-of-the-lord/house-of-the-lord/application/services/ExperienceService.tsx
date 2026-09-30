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
  #queuedExperience: ExperienceKey | null = null;
  #processing: Promise<boolean> | null = null;
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
    this.#queuedExperience = experience;

    if (this.#processing) {
      if (experience !== this.#experience) {
        this.#piecesSequencePort.tryAbortCurrentDropSequence();
      }
      return this.#processing;
    }

    this.#processing = this.#drainQueuedExperiences();
    try {
      return await this.#processing;
    } finally {
      this.#processing = null;
    }
  }

  async #drainQueuedExperiences(): Promise<boolean> {
    let displayed = true;
    while (this.#queuedExperience) {
      const next = this.#queuedExperience;
      this.#queuedExperience = null;
      if (next === this.#experience) continue;
      if (this.#experience) {
        await this.#hideExperience(this.#experience);
      }
      this.#setExperience(next);
      displayed = await this.#displayExperience();
    }
    return displayed;
  }

  async #displayExperience(): Promise<boolean> {
    if (!this.#experience) {
      this.#logger.error(
        "ExperienceService: experience is not defined at displayExperience."
      );
      return false;
    }
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
    await this.#hideExperience(experience);
  }

  async #hideExperience(experience: ExperienceKey): Promise<void> {
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
