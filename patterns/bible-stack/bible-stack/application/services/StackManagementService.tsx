import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { BibleLifecycleServicePort } from "../ports/in/BibleLifecycle";
import type { StackManagementServicePort } from "../ports/in/StackManagement";
import type { BibleDataRepositoryPort } from "../ports/out/BibleDataRepository";
import type { PieceDataRepositoryPort } from "../ports/out/PieceDataRepository";

interface StackManagementServiceProps {
  bibleLifecycleServicePort: BibleLifecycleServicePort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
}

export class StackManagementService implements StackManagementServicePort {
  #bibleLifecycleServicePort: StackManagementServiceProps["bibleLifecycleServicePort"];
  #pieceLifecycleServicePort: StackManagementServiceProps["pieceLifecycleServicePort"];
  #bibleDataRepositoryPort: StackManagementServiceProps["bibleDataRepositoryPort"];
  #pieceDataRepositoryPort: StackManagementServiceProps["pieceDataRepositoryPort"];

  constructor({
    bibleLifecycleServicePort,
    pieceLifecycleServicePort,
    bibleDataRepositoryPort,
    pieceDataRepositoryPort,
  }: StackManagementServiceProps) {
    this.#bibleLifecycleServicePort = bibleLifecycleServicePort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
  }

  clearAllStacks() {
    const biblesData = this.#bibleDataRepositoryPort.getAllBiblesData();
    this.#bibleLifecycleServicePort.deleteBibles(biblesData);

    const testamentsData = this.#pieceDataRepositoryPort.getAllTestaments();
    this.#pieceLifecycleServicePort.deleteTestaments(testamentsData);

    const sectionsData = this.#pieceDataRepositoryPort.getAllSections();
    this.#pieceLifecycleServicePort.deleteSections(sectionsData);

    const sectionBooksData = this.#pieceDataRepositoryPort.getAllSectionBooks();
    this.#pieceLifecycleServicePort.deleteSectionBooks(sectionBooksData);

    const booksData = this.#pieceDataRepositoryPort.getAllBooks();
    this.#pieceLifecycleServicePort.deleteBooks(booksData);

    const chaptersData = this.#pieceDataRepositoryPort.getAllChapters();
    this.#pieceLifecycleServicePort.deleteChapters(chaptersData);
  }
}
