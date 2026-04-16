interface PortalPort {
  resetZoomMin: () => void;
}

interface StackManagementService {
  clearAllStacks: () => void;
}

interface PieceHighlightService {
  clearUnhighlightDelays: () => void;
  clearHighlightedPieces: () => void;
}

interface InteractionRegistryService {
  clearAllLastInteractions: () => void;
}

interface ExperienceServiceParams {
  portalPort: PortalPort;
  stackService: StackManagementService;
  pieceHighlightService: PieceHighlightService;
  interactionRegistryService: InteractionRegistryService;
}

export class ExperienceService {
  #portalPort: ExperienceServiceParams["portalPort"];
  #stackService: ExperienceServiceParams["stackService"];
  #pieceHighlightService: ExperienceServiceParams["pieceHighlightService"];
  #interactionRegistryService: ExperienceServiceParams["interactionRegistryService"];

  constructor({
    portalPort,
    stackService,
    pieceHighlightService,
    interactionRegistryService,
  }: ExperienceServiceParams) {
    this.#portalPort = portalPort;
    this.#stackService = stackService;
    this.#pieceHighlightService = pieceHighlightService;
    this.#interactionRegistryService = interactionRegistryService;
  }

  clearExperience() {
    clearAnimations(thisBot); // TODO: Think of if it is possible/benefitial to get rid of bot animations
    this.#portalPort.resetZoomMin();
    this.#stackService.clearAllStacks();
    this.#pieceHighlightService.clearUnhighlightDelays();
    this.#pieceHighlightService.clearHighlightedPieces();
    this.#interactionRegistryService.clearAllLastInteractions();

    // TODO: Keep the following declarations for now, but every non built-in tag/mask on this matter will probably be relocated to this service in the future

    clearTagMasks(thisBot);

    setTagMask(
      thisBot,
      "areBiblePiecesDraggable",
      thisBot.tags.areBiblePiecesDraggable
    );
  }
}
