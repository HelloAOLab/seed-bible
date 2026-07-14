import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { BookChaptersManagementServicePort } from "../ports/in/BookChaptersManagement";

export class BookChaptersManagementService implements BookChaptersManagementServicePort {
  showChapters(bookData: StackBookData | StackSectionBookData) {
    // TODO: Implement show chapters logic here
  }

  hideChapters(bookData: StackBookData | StackSectionBookData) {
    // TODO: Implement the logic here D:\Documents\Work\CasualOS\seed-bible\packages\Bible Stack\bibleStack\prefabs\book\HideChapters.tsx
  }

  updateChaptersPosition(bookData: StackBookData | StackSectionBookData) {}
}
