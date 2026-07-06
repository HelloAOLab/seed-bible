import type { SetArrangementIndexByNamePort } from "@packages/seed-bible-utils/application/ports/in/arrangement";

export class ArrangementController {
  #arrangementService: SetArrangementIndexByNamePort;
  constructor(arrangementService: SetArrangementIndexByNamePort) {
    this.#arrangementService = arrangementService;
  }

  handleBookOrientationChanged(orientation: string) {
    this.#arrangementService.setArrangementIndexByName(orientation);
  }
}
