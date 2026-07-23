import type { Piece, SelectionModality } from "../../../domain/models/canvas";

export interface TestamentInteractionServicePort {
  handleTestamentSelection({
    testament,
    interaction,
  }: {
    testament: Piece<"StackTestament">;
    interaction: SelectionModality;
  }): void;
  handleTestamentFocusBegin(testament: Piece<"StackTestament">): void;
}
