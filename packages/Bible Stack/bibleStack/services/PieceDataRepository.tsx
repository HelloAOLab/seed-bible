import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  BiblePiece,
  type BiblePieceType,
} from "bibleVizUtils.domain.models.canvas";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { PieceDataMap } from "bibleVizUtils.domain.models.pieceData";

type AnyStackData =
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData;

type StackPieceDataMap = Pick<
  PieceDataMap,
  | "StackTestament"
  | "StackSection"
  | "StackSectionBook"
  | "StackBook"
  | "StackChapter"
>;

export interface PieceRepository {
  getTypeOfPiece: () => BiblePieceType | undefined;
  getId: () => Bot["id"];
}

export class PieceDataRepository {
  #testamentsData: Set<StackTestamentData> = new Set();
  #sectionsData: Set<StackSectionData> = new Set();
  #sectionBooksData: Set<StackSectionBookData> = new Set();
  #booksData: Set<StackBookData> = new Set();
  #chaptersData: Set<StackChapterData> = new Set();
  #dataStrategy = {
    [BiblePiece.StackTestament]: this.#testamentsData,
    [BiblePiece.StackSection]: this.#sectionsData,
    [BiblePiece.StackSectionBook]: this.#sectionBooksData,
    [BiblePiece.StackBook]: this.#booksData,
    [BiblePiece.StackChapter]: this.#chaptersData,
  };

  constructor() {}

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

  getPieceData(pieceRepository: PieceRepository): AnyStackData | undefined {
    const typeOfPiece = pieceRepository.getTypeOfPiece();

    if (!typeOfPiece) {
      console.warn(
        `PieceDataRepository.getPieceData: type of piece is undefined`
      );
      return undefined;
    }

    const targetSet = this.#dataStrategy[typeOfPiece];

    if (!targetSet) {
      console.warn(
        `PieceDataRepository.getPieceData: Target array not found for piece type '${typeOfPiece}'`
      );
      return undefined;
    }

    const pieceId = pieceRepository.getId();

    for (const data of targetSet) {
      if (data.isActive && !!data.piece && data.piece.id === pieceId) {
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
}
