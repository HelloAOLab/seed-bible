import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { ChapterInfo } from "bibleVizUtils.domain.models.arrangement";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { BibleStackEvents } from "../../domain/models/events";

export interface PieceAdapterPort {
  makePieceErasable: (piece: Piece) => void;
}

export interface PieceLifecycleServicePort {
  createTestament: (params: {
    arrangementIndex: number;
    testamentIndex: number;
    bibleDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }) => StackTestamentData;
  createSection: (params: {
    arrangementIndex: number;
    testamentIndex: number;
    sectionIndex: number;
    isInsideBible: boolean;
    isInsideTestament: boolean;
    bibleDataId?: string | undefined;
    testamentDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }) => StackSectionData | StackSectionBookData;
  createBook(params: {
    arrangementIndex: number;
    testamentIndex: number;
    sectionIndex: number;
    levelIndex: number;
    bookIndex: number;
    bookLevelIndex: number;
    levelsLenght: number;
    isInsideBible: boolean;
    isInsideTestament: boolean;
    isInsideSection: boolean;
    bibleDataId?: string | undefined;
    testamentDataId?: string | undefined;
    sectionDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }): StackBookData;
  createChapter(params: {
    bibleDataId?: string | undefined;
    testamentDataId?: string | undefined;
    sectionDataId?: string | undefined;
    sectionBookDataId?: string | undefined;
    bookDataId?: string | undefined;
    isHidden?: boolean | undefined;
    isInsideBible: boolean;
    isInsideBook: boolean;
    chapterInfo: ChapterInfo;
    bookId: string;
  }): StackChapterData;
}

export interface StackStructureEventPort {
  emit: <K extends "OnStackPiecePulledOut">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
