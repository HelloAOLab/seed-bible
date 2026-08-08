import type { Piece } from "../../../domain/models/canvas";
import type { VisualStateMap } from "../../models/visualState";
import { BiblePieces } from "../../../domain/models/canvas";

export class VisualStateRegistry {
  #statesMap: {
    [K in keyof VisualStateMap]: Map<string, VisualStateMap[K]>;
  } = {
    [BiblePieces.StackTransformer]: new Map(),
    [BiblePieces.StackTestament]: new Map(),
    [BiblePieces.StackSection]: new Map(),
    [BiblePieces.StackSectionShadow]: new Map(),
    [BiblePieces.StackSectionBook]: new Map(),
    [BiblePieces.StackBook]: new Map(),
    [BiblePieces.StackChapter]: new Map(),
    [BiblePieces.VersesBundle]: new Map(),
    [BiblePieces.Verse]: new Map(),
    [BiblePieces.InfoLabelTransformer]: new Map(),
    [BiblePieces.InfoLabelDate]: new Map(),
    [BiblePieces.InfoLabelText]: new Map(),
    [BiblePieces.InfoLabelTail]: new Map(),
    [BiblePieces.ActivityIndicator]: new Map(),
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

  clearState<K extends keyof VisualStateMap>({ piece }: { piece: Piece<K> }) {
    const map = this.#statesMap[piece.type];
    if (map) {
      map.delete(piece.id);
    }
  }
}
