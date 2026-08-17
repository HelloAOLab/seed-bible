import type { TabernacleService } from "../../../application/services/TabernacleService";
import type { PieceKey } from "../../../domain/models/piece";

interface TabernacleControllerParams {
  tabernacleService: TabernacleService;
  // navigate: (bookId: string, chapter: number) => void;
}

export class TabernacleController {
  #tabernacleService: TabernacleService;
  // #navigate: (bookId: string, chapter: number) => void;

  constructor({
    tabernacleService,
    // navigate
  }: TabernacleControllerParams) {
    this.#tabernacleService = tabernacleService;
    // this.#navigate = navigate;
  }

  handlePieceClick(key: PieceKey): void {
    this.#tabernacleService.handlePieceClick(key);
  }

  handleGridClick(): void {
    this.#tabernacleService.handleGridClick();
  }
}
