import type { BibleType, Piece } from "../../../domain/models/canvas";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { WorldPosition } from "../../../domain/models/spatial";

export interface BibleSetupPort {
  setUp(params: {
    bibleData: StackBibleData;
    position: WorldPosition;
    bibleType: BibleType;
  }): { testamentPiecesMap: Map<string, Piece<"StackTestament">> };
}
