import type { Piece } from "bibleVizUtils.domain.models.canvas";
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
  emit: <K extends "OnBibleOpenSequenceBegin" | "OnBibleOpenSequenceEnd">(
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
