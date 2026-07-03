import type { StackUpdatePacing } from "../../domain/models/stacks";
import type {
  InteractabilityBlockerPort,
  InteractabilityUnlockerPort,
} from "../ports/in/PieceInteractability";
import type { BibleStackUpdaterPort } from "../ports/in/BibleStackUpdater";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "../ports/out/StackUpdate";
import type { TestamentStackUpdaterPort } from "../ports/in/TestamentStackUpdater";
import type { SectionStackUpdaterPort } from "../ports/in/SectionStackUpdates";
import type { BookStackUpdaterPort } from "../ports/in/BookStackUpdates";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { StackAncestorType } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

interface ServiceParams {
  pieceInteractabilityPort: InteractabilityBlockerPort &
    InteractabilityUnlockerPort;
  bibleStackUpdaterPort: BibleStackUpdaterPort;
  testamentStackUpdaterPort: TestamentStackUpdaterPort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  sectiontackUpdaterPort: SectionStackUpdaterPort;
  bookStackUpdaterPort: BookStackUpdaterPort;
}

export class StackUpdateService implements StackUpdateServicePort {
  #isUpdating: boolean = false;
  #isUpdateQueued: boolean = false;
  #pieceInteractabilityPort: ServiceParams["pieceInteractabilityPort"];
  #bibleStackUpdaterPort: ServiceParams["bibleStackUpdaterPort"];
  #testamentStackUpdaterPort: ServiceParams["testamentStackUpdaterPort"];
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #sectiontackUpdaterPort: ServiceParams["sectiontackUpdaterPort"];
  #bookStackUpdaterPort: ServiceParams["bookStackUpdaterPort"];

  constructor({
    pieceInteractabilityPort,
    bibleStackUpdaterPort,
    bibleDataRepositoryPort,
    pieceDataRepositoryPort,
    testamentStackUpdaterPort,
    sectiontackUpdaterPort,
    bookStackUpdaterPort,
  }: ServiceParams) {
    this.#pieceInteractabilityPort = pieceInteractabilityPort;
    this.#bibleStackUpdaterPort = bibleStackUpdaterPort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#testamentStackUpdaterPort = testamentStackUpdaterPort;
    this.#sectiontackUpdaterPort = sectiontackUpdaterPort;
    this.#bookStackUpdaterPort = bookStackUpdaterPort;
  }

  async updateAllStacks(pacing: StackUpdatePacing): Promise<void> {
    if (this.#isUpdating) {
      this.#isUpdateQueued = true;
      return;
    }

    const updates: Promise<void>[] = [];
    this.#isUpdating = true;
    this.#pieceInteractabilityPort.blockAll();

    updates.push(
      ...this.#bibleDataRepositoryPort
        .getAllBiblesData()
        .map((data) => this.#bibleStackUpdaterPort.update({ data, pacing }))
    );
    updates.push(
      ...this.#pieceDataRepositoryPort
        .getStandaloneTestaments()
        .map((data) => this.#testamentStackUpdaterPort.update({ data, pacing }))
    );
    updates.push(
      ...this.#pieceDataRepositoryPort
        .getStandaloneSections()
        .map((data) => this.#sectiontackUpdaterPort.update({ data, pacing }))
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

    this.#pieceInteractabilityPort.unlockAll();
    this.#isUpdating = false;

    if (this.#isUpdateQueued) {
      this.#isUpdateQueued = false;
      this.updateAllStacks(pacing);
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
        const data = this.#pieceDataRepositoryPort.getDataById(
          "StackTestament",
          id
        );
        if (data)
          await this.#testamentStackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackSection": {
        const data = this.#pieceDataRepositoryPort.getDataById(
          "StackSection",
          id
        );
        if (data) await this.#sectiontackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackSectionBook": {
        const data = this.#pieceDataRepositoryPort.getDataById(
          "StackSectionBook",
          id
        );
        if (data) await this.#bookStackUpdaterPort.update({ data, pacing });
        return;
      }
      case "StackBook": {
        const data = this.#pieceDataRepositoryPort.getDataById("StackBook", id);
        if (data) await this.#bookStackUpdaterPort.update({ data, pacing });
        return;
      }
    }
  }
}
