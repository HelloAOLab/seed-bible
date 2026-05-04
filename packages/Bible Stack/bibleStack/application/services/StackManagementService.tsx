import type {
  BibleLifecycleServicePort,
  PieceLifecycleServicePort,
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
} from "bibleStack.application.ports.stackManagement";

interface StackManagementServiceProps {
  bibleLifecycleServicePort: BibleLifecycleServicePort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
}

export class StackManagementService {
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

    const booksData = this.#pieceDataRepositoryPort.getAllBooks();
    this.#pieceLifecycleServicePort.deleteBooks(booksData);

    const chaptersData = this.#pieceDataRepositoryPort.getAllChapters();
    this.#pieceLifecycleServicePort.deleteChapters(chaptersData);
  }
}
