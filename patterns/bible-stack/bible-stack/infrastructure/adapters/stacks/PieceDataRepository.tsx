import { BiblePieces, type Piece } from "../../../domain/models/canvas";
import { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import { StackSectionData } from "../../../domain/entities/StackSectionData";
import { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import { StackBookData } from "../../../domain/entities/StackBookData";
import { StackChapterData } from "../../../domain/entities/StackChapterData";
import type {
  PieceDataRepositoryPort,
  StackPieceDataMap,
} from "../../../application/ports/pieces";
import type { PieceDataRepositoryPort as StackManagementPieceDataRepositoryPort } from "../../../application/ports/stackManagement";
import type { PieceDataRepositoryPort as StackUpdatePieceDataRepositoryPort } from "../../../application/ports/out/StackUpdate";
import type { PieceDataRepositoryPort as ViewportPieceDataRepositoryPort } from "../../../application/ports/out/ViewportService";

export class PieceDataRepository
  implements
    PieceDataRepositoryPort,
    StackManagementPieceDataRepositoryPort,
    StackUpdatePieceDataRepositoryPort,
    ViewportPieceDataRepositoryPort
{
  #testamentsData: Set<StackTestamentData> = new Set();
  #sectionsData: Set<StackSectionData> = new Set();
  #sectionBooksData: Set<StackSectionBookData> = new Set();
  #booksData: Set<StackBookData> = new Set();
  #chaptersData: Set<StackChapterData> = new Set();
  #dataStrategy: {
    [K in keyof StackPieceDataMap]: Set<StackPieceDataMap[K]>;
  } = {
    [BiblePieces.StackTestament]: this.#testamentsData,
    [BiblePieces.StackSection]: this.#sectionsData,
    [BiblePieces.StackSectionBook]: this.#sectionBooksData,
    [BiblePieces.StackBook]: this.#booksData,
    [BiblePieces.StackChapter]: this.#chaptersData,
  };

  addTestamentData(data: StackTestamentData) {
    this.#testamentsData.add(data);
  }

  removeTestamentData(data: StackTestamentData) {
    this.#testamentsData.delete(data);
  }

  clearTestamentsData(): StackTestamentData[] {
    const testamentsData = [...this.#testamentsData.values()];
    this.#testamentsData.clear();
    return testamentsData;
  }

  getAllTestaments(): StackTestamentData[] {
    return [...this.#testamentsData.values()];
  }

  getStandaloneTestaments(): StackTestamentData[] {
    const all = this.getAllTestaments();
    return all.filter((data) => !data.getParentId("stackBibleId"));
  }

  addSectionData(data: StackSectionData) {
    this.#sectionsData.add(data);
  }

  removeSectionData(data: StackSectionData) {
    this.#sectionsData.delete(data);
  }

  clearSectionsData(): StackSectionData[] {
    const sectionsData = [...this.#sectionsData.values()];
    this.#sectionsData.clear();
    return sectionsData;
  }

  getAllSections(): StackSectionData[] {
    return [...this.#sectionsData.values()];
  }

  getStandaloneSections(): StackSectionData[] {
    const all = this.getAllSections();
    return all.filter((data) => !data.getParentId("stackTestamentId"));
  }

  addSectionBookData(data: StackSectionBookData) {
    this.#sectionBooksData.add(data);
  }

  removeSectionBookData(data: StackSectionBookData) {
    this.#sectionBooksData.delete(data);
  }

  clearSectionBooksData(): StackSectionBookData[] {
    const sectionBooksData = [...this.#sectionBooksData.values()];
    this.#sectionBooksData.clear();
    return sectionBooksData;
  }

  getAllSectionBooks(): StackSectionBookData[] {
    return [...this.#sectionBooksData.values()];
  }

  getStandaloneSectionBooks(): StackSectionBookData[] {
    const all = this.getAllSectionBooks();
    return all.filter((data) => !data.getParentId("stackTestamentId"));
  }

  addBookData(data: StackBookData) {
    this.#booksData.add(data);
  }

  removeBookData(data: StackBookData) {
    this.#booksData.delete(data);
  }

  clearBooksData(): StackBookData[] {
    const booksData = [...this.#booksData.values()];
    this.#booksData.clear();
    return booksData;
  }

  getAllBooks(): StackBookData[] {
    return [...this.#booksData.values()];
  }

  getStandaloneBooks(): StackBookData[] {
    const all = this.getAllBooks();
    return all.filter((data) => !data.getParentId("stackSectionId"));
  }

  addChapterData(data: StackChapterData) {
    this.#chaptersData.add(data);
  }

  removeChapterData(data: StackChapterData) {
    this.#chaptersData.delete(data);
  }

  clearChaptersData(): StackChapterData[] {
    const chaptersData = [...this.#chaptersData.values()];
    this.#chaptersData.clear();
    return chaptersData;
  }

  getAllChapters(): StackChapterData[] {
    return [...this.#chaptersData.values()];
  }

  getPieceData<K extends keyof StackPieceDataMap>(
    piece: Piece<K>
  ): StackPieceDataMap[K] | undefined {
    const targetSet = this.#dataStrategy[piece.type];

    if (!targetSet) {
      console.warn(
        `PieceDataRepository.getPieceData: Target array not found for piece type '${piece.type}'`
      );
      return undefined;
    }

    for (const data of targetSet) {
      if (data.isActive && !!data.piece && data.piece.id === piece.id) {
        return data;
      }
    }
    return undefined;
  }

  getAllPiecesDataByType<K extends keyof StackPieceDataMap>(
    type: K
  ): StackPieceDataMap[K][] {
    const data = this.#dataStrategy[type];

    return Array.from(data);
  }

  getDataById: <K extends keyof StackPieceDataMap>(params: {
    type: K;
    id: StackPieceDataMap[K]["id"];
  }) => StackPieceDataMap[K] | undefined = ({ type, id }) => {
    const targetSet = this.#dataStrategy[type];
    for (const data of targetSet) {
      if (data.id === id) {
        return data;
      }
    }
    return undefined;
  };
}
