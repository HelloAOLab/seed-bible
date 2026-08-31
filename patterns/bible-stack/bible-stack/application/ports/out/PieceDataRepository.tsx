import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { Piece } from "../../../domain/models/canvas";
import type { StackPieceDataMap } from "../pieces";

export interface PieceDataRepositoryPort {
  addTestamentData: (data: StackTestamentData) => void;
  removeTestamentData: (data: StackTestamentData) => void;
  clearTestamentsData: () => StackTestamentData[];
  getAllTestaments: () => StackTestamentData[];
  addSectionData: (data: StackSectionData) => void;
  removeSectionData: (data: StackSectionData) => void;
  clearSectionsData: () => StackSectionData[];
  getAllSections: () => StackSectionData[];
  addSectionBookData: (data: StackSectionBookData) => void;
  removeSectionBookData: (data: StackSectionBookData) => void;
  clearSectionBooksData: () => StackSectionBookData[];
  getAllSectionBooks: () => StackSectionBookData[];
  addBookData: (data: StackBookData) => void;
  removeBookData: (data: StackBookData) => void;
  clearBooksData: () => StackBookData[];
  getAllBooks: () => StackBookData[];
  addChapterData: (data: StackChapterData) => void;
  removeChapterData: (data: StackChapterData) => void;
  clearChaptersData: () => StackChapterData[];
  getAllChapters: () => StackChapterData[];
  getPieceData: <K extends keyof StackPieceDataMap>(
    piece: Piece<K>
  ) => StackPieceDataMap[K] | undefined;
  getAllPiecesDataByType: <K extends keyof StackPieceDataMap>(
    type: K
  ) => StackPieceDataMap[K][];
  getDataById: <K extends keyof StackPieceDataMap>(params: {
    type: K;
    id: StackPieceDataMap[K]["id"];
  }) => StackPieceDataMap[K] | undefined;
}
