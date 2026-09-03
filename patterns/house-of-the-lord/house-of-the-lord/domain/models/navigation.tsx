import type { ExperienceKey } from "./experience";
import type { PieceKey } from "./piece";
import type { ReadingState } from "./scripture";

export const NAV_MENU_LEVELS = {
  PIECES: "pieces",
  PIECE_DETAIL: "piece-detail",
} as const;

export type NavMenuLevel =
  (typeof NAV_MENU_LEVELS)[keyof typeof NAV_MENU_LEVELS];

export interface NavigationState {
  isOpen: boolean;
  level: NavMenuLevel;
  selectedPiece: PieceKey | null;
  /**
   * The piece the model is currently revealed around. Separate from
   * `selectedPiece` because clicking away drops the selection without putting
   * the hidden layers back — the reveal outlives the selection.
   */
  occludedBy: PieceKey | null;
  experience: ExperienceKey;
  reading: ReadingState | null;
}
