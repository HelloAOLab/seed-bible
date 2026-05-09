import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { HighlightPacing } from "bibleStack.domain.models.pieces";
import type { VisualStateMap } from "bibleStack.infrastructure.models.visualState";
import type { Easing } from "../../../../../typings/AuxLibraryDefinitions";
import type {
  StackTestamentMapperPort,
  StackSectionMapperPort,
  StackSectionBookMapperPort,
  StackBookMapperPort,
  StackChapterMapperPort,
} from "bibleStack.infrastructure.ports.stackPieceLifecycle";
import type { PieceHighlightPieceDataRepositoryPort } from "bibleStack.application.ports.pieces";

export interface HighlightAnimationConfigProviderPort {
  getHighlightDuration(pacing: HighlightPacing): number;
  getHighlightEasing(): Easing;
}

export interface HighlightVisualStatePort {
  getStateProperty<
    K extends keyof VisualStateMap,
    P extends keyof VisualStateMap[K],
  >(params: {
    piece: Piece<K>;
    property: P;
  }): VisualStateMap[K][P];
}

export interface PieceHighlightAdapterParams {
  testamentMapperPort: StackTestamentMapperPort;
  sectionMapperPort: StackSectionMapperPort;
  sectionBookMapperPort: StackSectionBookMapperPort;
  bookMapperPort: StackBookMapperPort;
  chapterMapperPort: StackChapterMapperPort;
  visualStatePort: HighlightVisualStatePort;
  animationConfigProviderPort: HighlightAnimationConfigProviderPort;
  pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
}
