import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { BibleStackEvents } from "bibleStack.domain.models.events";
import type { ArrangementInfo } from "bibleVizUtils.domain.models.arrangement";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "bibleStack.domain.models.pieces";
import type { WorldPosition } from "bibleStack.domain.models.spatial";
import type { BibleTypeType } from "bibleVizUtils.domain.models.canvas";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";

export interface BibleSetupAdapterPort {
  setUp(params: {
    bibleData: StackBibleData;
    position: WorldPosition;
    bibleType: BibleTypeType;
  }): {
    testamentPiecesMap: Map<StackTestamentData["id"], Piece<"StackTestament">>;
  };
}

export interface PieceLifecycleServicePort {
  deleteTestaments: (testaments: StackTestamentData[]) => void;
  createTestament({
    arrangementIndex,
    testamentIndex,
    bibleDataId,
    isHidden,
  }: {
    arrangementIndex: number;
    testamentIndex: number;
    bibleDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }): StackTestamentData;
}

export interface PieceLifecycleAdapterPort {
  despawnPieces(pieces: Piece[]): void;
}

export interface BibleDataRepositoryPort {
  removeBibleData(data: StackBibleData): void;
  addBibleData(data: StackBibleData): void;
}

export interface BibleLifecycleEventPort {
  emit: <K extends "OnBibleDelete" | "OnBibleCreationBegin" | "OnBibleCreated">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface ArrangementServicePort {
  getCurrentArrangementIndex(): number;
  getArrangementByIndex(index: number): ArrangementInfo | undefined;
}

export interface IdGeneratorPort {
  getId(): string;
}

export interface StackPieceLifecycleAdapterPort {
  spawnBibleTransformer(bibleId: StackBibleData["id"]): StackTransformer;
  spawnCover(bibleId: StackBibleData["id"]): StackCover;
  spawnCrossLine(bibleId: StackBibleData["id"]): StackCrossLine;
  spawnShadow(bibleId: StackBibleData["id"]): StackShadow;
  despawnSectionShadow(piece: Piece<"StackSectionShadow">): void;
  despawnTestament(piece: Piece<"StackTestament">): void;
  despawnSection(piece: Piece<"StackSection">): void;
  despawnBook(piece: Piece<"StackBook">): void;
  despawnSectionBook(piece: Piece<"StackSectionBook">): void;
  spawnSectionDomain(): Piece<"StackSection">;
  spawnSectionBookDomain(): Piece<"StackSectionBook">;
}

export interface CameraAdapterPort {
  focusOn(position: WorldPosition): void;
}

export interface BibleLifecycleServicePort {
  createBible(params: {
    position: WorldPosition;
    type: BibleTypeType;
    arrangementIndex?: number;
  }): { bibleData: StackBibleData };
}

export interface BibleSequenceEventPort {
  emit: <
    K extends
      | "OnBibleOpenSequenceStart"
      | "OnBibleResetSequenceEnd"
      | "OnBibleOpenSequenceBegin"
      | "OnBibleOpenSequenceEnd"
      | "OnBibleResetSequenceStart"
      | "OnBibleCloseSequenceStart"
      | "OnBibleCloseSequenceEnd"
      | "OnBibleCrackOpenSequenceStart"
      | "OnBibleCrackOpenSequenceEnd",
  >(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface BibleSequenceAdapterPort {
  displayCrackOpenBibleSequence(
    bibleData: StackBibleData,
    arePiecesDraggable: boolean
  ): Promise<void>;
  displayCloseBibleSequence(params: {
    lowerCover: StackCover;
    upperCover: StackCover;
    verticalLine: StackCrossLine;
    horizontalLine: StackCrossLine;
    pacing?: StackPresenceNavigationPacing;
    piecesToCollapse: (
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackSectionShadow">
    )[];
  }): Promise<void>;
  displayOpenBibleSequence(params: {
    lowerCover: StackCover;
    upperCover: StackCover;
    verticalLine: StackCrossLine;
    horizontalLine: StackCrossLine;
    pacing?: StackPresenceNavigationPacing;
    bibleData: StackBibleData;
    arePiecesDraggable: boolean;
  }): Promise<void>;
}

export interface BibleSequenceServicePort {
  crackOpenBible(bibleData: StackBibleData): Promise<void>;
}

export interface BibleSequenceServiceConfigProviderPort {
  getTestamentHighlightSequenceConfig<
    K extends "initialDelay" | "staggerDelay" | "unhighlightDelay",
  >(
    key: K
  ): number;
}

export interface LabelDataRepositoryPort {
  getDataByOwnerId(id: string): InfoLabelData | undefined;
}

export interface PieceAdapterPort {
  makeNonInteractable(piece: Piece): boolean;
  isPieceBeingUsed(piece: Piece): boolean;
}

export interface RenderOrderAdapterPort {
  setSortedRenderOrder(pieces: Piece[]): void;
}

export interface ScripturePiecesStateServicePort {
  readonly arePiecesDraggable: boolean;
}

export interface BookChaptersManagementServicePort {
  hideChapters(bookData: StackBookData | StackSectionBookData): void;
}
