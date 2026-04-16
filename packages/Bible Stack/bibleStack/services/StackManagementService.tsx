import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

interface BibleManagementService {
  deleteBibles: (biblesData: StackBibleData[]) => void;
}

interface BibleDataRepository {
  getAllBiblesData(): StackBibleData[];
}

interface PieceManagementService {
  deleteTestaments: (testaments: StackTestamentData[]) => void;
  deleteSections: (sections: StackSectionData[]) => void;
  deleteBooks: (books: StackBookData[]) => void;
  deleteChapters: (chapters: StackChapterData[]) => void;
}

interface PieceDataRepository {
  getAllTestaments: () => StackTestamentData[];
  getAllSections: () => StackSectionData[];
  getAllBooks: () => StackBookData[];
  getAllChapters: () => StackChapterData[];
}

interface StackManagementServiceProps {
  bibleManagementService: BibleManagementService;
  pieceManagementService: PieceManagementService;
  bibleDataRepository: BibleDataRepository;
  pieceDataRepository: PieceDataRepository;
}

export class StackManagementService {
  #bibleManagementService: StackManagementServiceProps["bibleManagementService"];
  #pieceManagementService: StackManagementServiceProps["pieceManagementService"];
  #bibleDataRepository: StackManagementServiceProps["bibleDataRepository"];
  #pieceDataRepository: StackManagementServiceProps["pieceDataRepository"];

  constructor({
    bibleManagementService,
    pieceManagementService,
    bibleDataRepository,
    pieceDataRepository,
  }: StackManagementServiceProps) {
    this.#bibleManagementService = bibleManagementService;
    this.#pieceManagementService = pieceManagementService;
    this.#bibleDataRepository = bibleDataRepository;
    this.#pieceDataRepository = pieceDataRepository;
  }

  clearAllStacks() {
    const biblesData = this.#bibleDataRepository.getAllBiblesData();
    this.#bibleManagementService.deleteBibles(biblesData);

    const testamentsData = this.#pieceDataRepository.getAllTestaments();
    this.#pieceManagementService.deleteTestaments(testamentsData);

    const sectionsData = this.#pieceDataRepository.getAllSections();
    this.#pieceManagementService.deleteSections(sectionsData);

    const booksData = this.#pieceDataRepository.getAllBooks();
    this.#pieceManagementService.deleteBooks(booksData);

    const chaptersData = this.#pieceDataRepository.getAllChapters();
    this.#pieceManagementService.deleteChapters(chaptersData);
  }
}
