import type { StackSpacingsType } from "bibleVizUtils.infrastructure.config.stacks.spacings";
import type { BibleTypeType, Piece } from "bibleVizUtils.domain.models.canvas";
import type { CrackOpenBibleAnimationEasingType } from "bibleStack.infrastructure.config.sequences.crackOpenBibleAnimation";
import type { CloseBibleAnimationEasingType } from "bibleStack.infrastructure.config.sequences.closeBibleAnimation";
import type { OpenBibleAnimationEasingType } from "bibleStack.infrastructure.config.sequences.openBibleAnimation";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";
import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { StackPieceMeasurementsType } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/measurements";
import type { SectionInfo as DomainSectionInfo } from "bibleVizUtils.domain.models.arrangement";
import type { SectionInfo as InfrastructureSectionInfo } from "bibleVizUtils.infrastructure.models.arrangement";

export interface PieceMapperPort {
  toInfrastructure: (piece: Piece) => PieceBot | undefined;
}

export interface BibleSequenceAdapterConfigProviderPort {
  getStackSpacing<K extends keyof StackSpacingsType>(
    key: K
  ): StackSpacingsType[K];
  getCrackOpenBibleAnimationDuration(bibleType: BibleTypeType): number;
  getCrackOpenBibleAnimationEasing(): CrackOpenBibleAnimationEasingType;
  getCloseBibleAnimationDuration(pacing: StackPresenceNavigationPacing): number;
  getCloseBibleAnimationEasing(): CloseBibleAnimationEasingType;
  getOpenBibleAnimationDuration(pacing: StackPresenceNavigationPacing): number;
  getOpenBibleAnimationEasing(): OpenBibleAnimationEasingType;
  getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
    measurement: K
  ) => StackPieceMeasurementsType[K];
}

export interface PieceAdapterPort {
  hide(piece: Piece): void;
}

export interface SectionInfoMapperPort {
  toInfrastructure(info: DomainSectionInfo): InfrastructureSectionInfo;
}
