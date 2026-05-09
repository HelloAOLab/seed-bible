import type { Tab } from "bibleVizUtils.domain.models.seedBible";
import type {
  Piece,
  PieceSelectionSource,
} from "bibleVizUtils.domain.models.canvas";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

export interface PresenceProviderPort {
  getActiveTab(): Tab | undefined;
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
