import type { ArrangementService } from "bibleVizUtils.application.services.ArrangementService";

export class ArrangementController {
  #arrangementService: ArrangementService;
  constructor(arrangementService: ArrangementService) {
    this.#arrangementService = arrangementService;
  }

  handleBookOientationChanged(orientation: string) {
    this.#arrangementService.setArrangementIndexByName(orientation);
  }
}
