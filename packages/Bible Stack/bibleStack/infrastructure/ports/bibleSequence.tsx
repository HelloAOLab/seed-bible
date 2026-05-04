import type { StackSpacingsType } from "bibleVizUtils.infrastructure.config.stacks.spacings";
import type { BibleTypeType } from "bibleVizUtils.domain.models.canvas";
import type { CrackOpenBibleAnimationEasingType } from "bibleStack.infrastructure.config.sequences.crackOpenBibleAnimation";

export interface BibleSequenceAdapterConfigProviderPort {
  getStackSpacing<K extends keyof StackSpacingsType>(
    key: K
  ): StackSpacingsType[K];
  getCrackOpenBibleAnimationDuration(bibleType: BibleTypeType): number;
  getCrackOpenBibleAnimationEasing(): CrackOpenBibleAnimationEasingType;
}
