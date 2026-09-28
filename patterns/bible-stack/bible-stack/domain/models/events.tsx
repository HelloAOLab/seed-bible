import type { Piece } from "./canvas";
import type { StackBibleData } from "../entities/StackBibleData";
import type { AnyStackData } from "../../application/ports/pieces";
import type { StackTestamentData } from "../entities/StackTestamentData";
import type { StackSectionBookData } from "../entities/StackSectionBookData";
import type { StackBookData } from "../entities/StackBookData";
import type { StackSectionData } from "../entities/StackSectionData";

export interface BibleStackEvents {
  OnStackSequenceStart: void;
  OnStackSequenceEnd: void;
  OnBibleDelete: { bibleId: StackBibleData["id"] };
  OnTestamentDelete: { piece: Piece<"StackTestament"> };
  OnStackPiecePulledOut: void;
  OnStackPieceDrop: { piece: Piece };
  OnBibleCreationBegin: { hasABibleEverBeenCreated: boolean };
  OnBibleCreated: { bibleData: StackBibleData };
  OnBibleOpenSequenceBegin: void;
  OnBibleOpenSequenceEnd: { bibleData: StackBibleData };
  OnBibleResetSequenceStart: { bibleData: StackBibleData };
  OnBibleCloseSequenceStart: { bibleData: StackBibleData };
  OnBibleCloseSequenceEnd: { bibleData: StackBibleData };
  OnBibleResetSequenceEnd: { bibleData: StackBibleData };
  OnBibleOpenSequenceStart: { bibleData: StackBibleData };
  OnBibleCrackOpenSequenceStart: void;
  OnBibleCrackOpenSequenceEnd: void;
  OnScripturePieceHighlighted: { pieceData: AnyStackData };
  OnBookBeginSelect: { data: StackBookData | StackSectionBookData };
  OnBookEndSelect: { data: StackBookData | StackSectionBookData };
  OnBookBeginDeselect: { data: StackBookData | StackSectionBookData };
  OnBookEndDeselect: { data: StackBookData | StackSectionBookData };
  OnSectionBeginSelect: { data: StackSectionData };
  OnSectionEndSelect: { data: StackSectionData };
  OnStackSectionExploded: { sectionData: StackSectionData };
  OnTestamentBeginSelect: { data: StackTestamentData };
  OnTestamentEndSelect: { data: StackTestamentData };
  OnCameraRotationChanged: void;
  OnLabelDateFormatChange: void;
  OnArrangementIndexChanged: { newIndex: number };
  OnCustomArrangementsChanged: void;
}

export type BibleStackEvent = keyof BibleStackEvents;
