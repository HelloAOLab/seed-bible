import type { WorldPosition } from "../../../domain/models/spatial";
export type FocusOnAnimationKey =
  | "bibleSetup"
  | "testamentSelection"
  | "sectionSelection"
  | "tourGuideSection";

export interface CameraPort {
  focusOn(
    position: WorldPosition,
    animationKey: FocusOnAnimationKey,
    overrides?: { duration?: number; zoom?: number }
  ): Promise<void>;
  cancelFocus(): void;
}
