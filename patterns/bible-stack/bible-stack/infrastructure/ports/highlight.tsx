import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { HighlightPacing } from "bibleStack.domain.models.pieces";
import type { VisualStateMap } from "bibleStack.infrastructure.models.visualState";
import type { Easing } from "../../../../pattern-typings/AuxLibraryDefinitions";
import type { StackTestamentMapper } from "../mappers/StackTestamentMapper";
import type { StackSectionMapper } from "../mappers/StackSectionMapper";
import type { StackSectionBookMapper } from "../mappers/StackSectionBookMapper";
import type { StackBookMapper } from "../mappers/StackBookMapper";
import type { StackChapterMapper } from "../mappers/StackChapterMapper";
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
  testamentMapperPort: StackTestamentMapper;
  sectionMapperPort: StackSectionMapper;
  sectionBookMapperPort: StackSectionBookMapper;
  bookMapperPort: StackBookMapper;
  chapterMapperPort: StackChapterMapper;
  visualStatePort: HighlightVisualStatePort;
  animationConfigProviderPort: HighlightAnimationConfigProviderPort;
  pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
}
