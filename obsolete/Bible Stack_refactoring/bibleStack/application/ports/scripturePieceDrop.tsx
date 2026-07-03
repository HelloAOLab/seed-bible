import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { HighlightRequestSource } from "bibleStack.domain.models.pieces";
import type { BibleStackEvents } from "../../domain/models/events";

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
  hasTransformer(piece: Piece): boolean;
  releaseTransformer(params: { piece: Piece; updatePosition?: boolean }): void;
}

export type ScripturePieceDropDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

export interface ChapterSelectionServicePort {
  deselectChapter(
    data: StackChapterData,
    setBibleAnimating?: boolean
  ): Promise<void>;
  trySelectChapter(params: {
    data: StackChapterData;
    bookData: StackBookData | StackSectionBookData | undefined;
  }): Promise<void>;
}

export interface PieceHighlightServicePort {
  tryHighlightPiece: (params: {
    piece: Piece;
    source: HighlightRequestSource;
  }) => Promise<void>;
}

export interface PieceDropEventPort {
  emit: <K extends "OnStackPieceDrop">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
