import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { VisualStateMap } from "bibleStack.infrastructure.models.visualState";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";

export class VisualStateRegistry {
  #statesMap: {
    [K in keyof VisualStateMap]: Map<string, VisualStateMap[K]>;
  } = {
    [BiblePiece.StackTransformer]: new Map(),
    [BiblePiece.StackTestament]: new Map(),
    [BiblePiece.StackSection]: new Map(),
    [BiblePiece.StackSectionBook]: new Map(),
    [BiblePiece.StackBook]: new Map(),
    [BiblePiece.StackChapter]: new Map(),
  };

  registerState<K extends keyof VisualStateMap>({
    piece,
    state,
  }: {
    piece: Piece<K>;
    state: VisualStateMap[K];
  }) {
    const map = this.#statesMap[piece.type];
    map.set(piece.id, state);
  }

  registerStateProperty<
    K extends keyof VisualStateMap,
    P extends keyof VisualStateMap[K],
  >({
    piece,
    property,
    value,
  }: {
    piece: Piece<K>;
    property: P;
    value: VisualStateMap[K][P];
  }) {
    const map = this.#statesMap[piece.type];
    const state = map.get(piece.id);
    if (!state) {
      throw new Error(
        `VisualStateRegistry: state not found at registerStateProperty.`
      );
    }
    state[property] = value;
  }

  getStateProperty<
    K extends keyof VisualStateMap,
    P extends keyof VisualStateMap[K],
  >({
    piece,
    property,
  }: {
    piece: Piece<K>;
    property: P;
  }): VisualStateMap[K][P] {
    const map = this.#statesMap[piece.type];
    const state = map.get(piece.id);
    if (!state) {
      throw new Error(
        `VisualStateRegistry: state not found at getStateProperty.`
      );
    }
    const value = state[property];
    return value;
  }
}
