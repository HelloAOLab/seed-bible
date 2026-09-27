import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { PieceInteractabilityServicePort } from "../ports/in/PieceInteractability";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../ports/out/StackUpdate";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { StackAncestorType } from "../../domain/models/canvas";
import type { LoggerPort } from "../ports/out/Logger";
import type { BibleStackUpdaterServicePort } from "../ports/in/BibleStackUpdater";
import type { TestamentStackUpdaterServicePort } from "../ports/in/TestamentStackUpdater";
import type { BookStackUpdaterServicePort } from "../ports/in/BookStackUpdater";
import type { SectionStackUpdaterServicePort } from "../ports/in/SectionStackUpdater";

interface ServiceParams {
  pieceInteractabilityPort: PieceInteractabilityServicePort &
    PieceInteractabilityServicePort;
  bibleStackUpdaterPort: BibleStackUpdaterServicePort;
  testamentStackUpdaterPort: TestamentStackUpdaterServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sectionStackUpdaterPort: SectionStackUpdaterServicePort;
  bookStackUpdaterPort: BookStackUpdaterServicePort;
  loggerPort: LoggerPort;
}

export class StackUpdateService implements StackUpdateServicePort {
  #isUpdating: boolean = false;
  #isUpdateQueued: boolean = false;
  #pieceInteractabilityPort: ServiceParams["pieceInteractabilityPort"];
  #bibleStackUpdaterPort: ServiceParams["bibleStackUpdaterPort"];
  #testamentStackUpdaterPort: ServiceParams["testamentStackUpdaterPort"];
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sectionStackUpdaterPort: ServiceParams["sectionStackUpdaterPort"];
  #bookStackUpdaterPort: ServiceParams["bookStackUpdaterPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    pieceInteractabilityPort,
    bibleStackUpdaterPort,
    bibleDataRepositoryPort,
    pieceDataRepositoryPort,
    testamentStackUpdaterPort,
    sectionStackUpdaterPort,
    bookStackUpdaterPort,
    loggerPort,
  }: ServiceParams) {
    this.#pieceInteractabilityPort = pieceInteractabilityPort;
    this.#bibleStackUpdaterPort = bibleStackUpdaterPort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#testamentStackUpdaterPort = testamentStackUpdaterPort;
    this.#sectionStackUpdaterPort = sectionStackUpdaterPort;
    this.#bookStackUpdaterPort = bookStackUpdaterPort;
    this.#loggerPort = loggerPort;
  }

  async updateAllStacks(pacing: StackUpdatePacing): Promise<void> {
    if (this.#isUpdating) {
      this.#isUpdateQueued = true;
      return;
    }

    this.#isUpdating = true;
    this.#pieceInteractabilityPort.blockAll();

    try {
      const updates: Promise<void>[] = [];

      updates.push(
        ...this.#bibleDataRepositoryPort
          .getAllBiblesData()
          .map((data) => this.#bibleStackUpdaterPort.update({ data, pacing }))
      );
      updates.push(
        ...this.#pieceDataRepositoryPort
          .getStandaloneTestaments()
          .map((data) =>
            this.#testamentStackUpdaterPort.update({ data, pacing })
          )
      );
      updates.push(
        ...this.#pieceDataRepositoryPort
          .getStandaloneSections()
          .map((data) => this.#sectionStackUpdaterPort.update({ data, pacing }))
      );
      updates.push(
        ...this.#pieceDataRepositoryPort
          .getStandaloneSectionBooks()
          .map((data) => this.#bookStackUpdaterPort.update({ data, pacing }))
      );
      updates.push(
        ...this.#pieceDataRepositoryPort
          .getStandaloneBooks()
          .map((data) => this.#bookStackUpdaterPort.update({ data, pacing }))
      );

      await Promise.all(updates);
    } catch (error) {
      this.#loggerPort.error(
        "StackUpdateService: Error while updating stacks at updateAllStacks",
        {
          error,
        }
      );
    } finally {
      this.#pieceInteractabilityPort.unlockAll();
      this.#isUpdating = false;
    }

    if (this.#isUpdateQueued) {
      this.#isUpdateQueued = false;
      await this.updateAllStacks(pacing);
    }
  }

  /**
   * Updates a single stack root by id + type, touching only the affected
   * repository/updater instead of re-running every stack.
   */
  async updateStack(
    id: string,
    type: StackAncestorType,
    pacing: StackUpdatePacing
  ): Promise<void> {
    switch (type) {
      case "StackBible": {
        const data = this.#bibleDataRepositoryPort.getBibleDataById(id);
        if (data) await this.#bibleStackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackTestament": {
        const data = this.#pieceDataRepositoryPort.getDataById({
          type: "StackTestament",
          id,
        });
        if (data)
          await this.#testamentStackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackSection": {
        const data = this.#pieceDataRepositoryPort.getDataById({
          type: "StackSection",
          id,
        });
        if (data) await this.#sectionStackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackSectionBook": {
        const data = this.#pieceDataRepositoryPort.getDataById({
          type: "StackSectionBook",
          id,
        });
        if (data) await this.#bookStackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackBook": {
        const data = this.#pieceDataRepositoryPort.getDataById({
          type: "StackBook",
          id,
        });
        if (data) await this.#bookStackUpdaterPort.update({ data, pacing });
        return;
      }
    }
  }
}
