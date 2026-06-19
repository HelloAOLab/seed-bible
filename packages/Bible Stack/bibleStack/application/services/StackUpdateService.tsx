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
}
