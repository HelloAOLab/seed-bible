import type { ExperienceKey, ExperienceKeyMap } from "./experience";
import type { PieceVisibilityState } from "./piece";

export type PieceStateMap = {
  [E in ExperienceKey]: {
    [bookId: string]: {
      [chapter: number]: {
        [K in ExperienceKeyMap[E]]?: PieceVisibilityState;
      };
    };
  };
};

export type VerseReferenceMap = {
  [E in ExperienceKey]: {
    [bookId: string]: {
      [chapter: number]: {
        [verse: number]: ExperienceKeyMap[E][];
      };
    };
  };
};

export type HighlightStatesMap = {
  [E in ExperienceKey]: {
    [k in ExperienceKeyMap[E]]?: {
      [k in ExperienceKeyMap[E]]?: PieceVisibilityState;
    };
  };
};
