import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { BibleType } from "../../../domain/models/canvas";
import type { WorldPosition } from "../../../domain/models/spatial";

export interface BibleLifecycleServicePort {
  createBible(params: {
    position: WorldPosition;
    type: BibleType;
    arrangementIndex?: number;
  }): { bibleData: StackBibleData };
  deleteBible(bibleData: StackBibleData): void;
  deleteBibles(biblesData: StackBibleData[]): void;
}
