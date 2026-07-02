// import type { TabernacleService } from "../../../application/services/TabernacleService";
import type { PieceKey } from "tabernacle.domain.models.piece";
import type { VerseMenuClickHandlerPort } from "tabernacle.application.ports.in.scriptureInteraction";

interface ControllerParams {
  verseMenuClickHandlerPort: VerseMenuClickHandlerPort;
  // tabernacleService: TabernacleService;
  // navigate: (bookId: string, chapter: number) => void;
}

export class ScriptureInteractionController {
  #verseMenuClickHandlerPort: ControllerParams["verseMenuClickHandlerPort"];
  // #tabernacleService: TabernacleService;
  // #navigate: (bookId: string, chapter: number) => void;

  constructor({
    // tabernacleService,
    // navigate,
    verseMenuClickHandlerPort,
  }: ControllerParams) {
    // this.#tabernacleService = tabernacleService;
    // this.#navigate = navigate;

    this.#verseMenuClickHandlerPort = verseMenuClickHandlerPort;
  }

  handleVerseMenuItemClick(key: PieceKey): void {
    // this.#tabernacleService.handleGridClick();
    // this.#navigate(bookId, chapter);

    this.#verseMenuClickHandlerPort.handleVerseMenuItemClick(key);
  }
}
