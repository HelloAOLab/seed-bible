import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { BookChaptersManagementServicePort } from "bibleStack.application.ports.bibleLifecycle";

export class BookChaptersManagementService implements BookChaptersManagementServicePort {
  showChapters(bookData: StackBookData | StackSectionBookData) {
    // TODO: Implement show chapters logic here
  }

  hideChapters(bookData: StackBookData | StackSectionBookData) {
    // TODO: Implement the logic here D:\Documents\Work\CasualOS\seed-bible\packages\Bible Stack\bibleStack\prefabs\book\HideChapters.tsx
  }
}
