import type { Piece, PieceSelectionSource } from "../../domain/models/canvas";
import type { StackBibleData } from "../../domain/entities/StackBibleData";
import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";
import type { UserReadingInstance } from "../../domain/models/reading";

export interface PresenceProviderPort {
  getActiveTab(): UserReadingInstance | undefined;
}

export interface DimensionProviderPort {
  getDimension(): string;
}

export interface PieceAdapterPort {
  isPieceBeingUsed(piece: Piece): boolean;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence(): boolean;
}

export interface BibleSequenceServicePort {
  resetBible(params: {
    bibleData: StackBibleData | undefined;
    pacing: StackPresenceNavigationPacing;
  }): Promise<void>;
}

export interface BookSelectionServicePort {
  selectBook(params: {
    data: StackBookData | StackSectionBookData;
    pacing: StackPresenceNavigationPacing;
    source: PieceSelectionSource;
  }): Promise<void>;
  deselectBook(data: StackBookData | StackSectionBookData): Promise<void>;
}

export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}

export interface TestamentSelectionServicePort {
  selectTestament(params: {
    data: StackTestamentData;
    pacing: StackPresenceNavigationPacing;
    source: PieceSelectionSource;
  }): Promise<void>;
}

export interface SectionSelectionServicePort {
  selectSection(params: {
    data: StackSectionData;
    pacing: StackPresenceNavigationPacing;
    source: PieceSelectionSource;
  }): Promise<void>;
}

export interface ExplodedViewServicePort {
  explodeSection(params: {
    data: StackSectionData;
    pacing: StackPresenceNavigationPacing;
  }): Promise<void>;
}
