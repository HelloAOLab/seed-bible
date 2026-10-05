import type { StackCover } from "../../../domain/models/pieces";

export interface CoverInteractionServicePort {
  handleCoverClick(cover: StackCover): void;
}
