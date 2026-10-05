import type { Piece, SelectionModality } from "../../../domain/models/canvas";

export interface SectionInteractionServicePort {
  handleSectionSelection({
    section,
    interaction,
  }: {
    section: Piece<"StackSection">;
    interaction: SelectionModality;
  }): void;
  handleSectionFocusBegin(section: Piece<"StackSection">): void;
  handleSectionFocusEnd(section: Piece<"StackSection">): void;
}
