import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";

export interface BookChaptersManagementServicePort {
  showChapters(bookData: StackBookData | StackSectionBookData): void;
  hideChapters(bookData: StackBookData | StackSectionBookData): void;
  updateChaptersPosition(bookData: StackBookData | StackSectionBookData): void;
}
