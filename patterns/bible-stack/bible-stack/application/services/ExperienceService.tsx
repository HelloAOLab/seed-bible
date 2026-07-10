import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type {
  EnvironmentAdapterPort,
  StackManagementService,
  InteractionRegistryServicePort,
  ExperienceAdapterPort,
  ScripturePiecesStateServicePort,
  ExperienceConfigProviderPort,
  SequenceStateServicePort,
  StackPresenceNavigationServicePort,
  AwaiterPort,
} from "../ports/experience";
import type {
  CameraAdapterPort,
  BibleLifecycleServicePort,
  BibleSequenceServicePort,
} from "../ports/bibleLifecycle";
import { BibleTypes } from "../../domain/models/canvas";

interface ExperienceServiceParams {
  environmentAdapterPort: EnvironmentAdapterPort;
  stackManagementServicePort: StackManagementService;
  pieceHighlightServicePort: PieceHighlighterPort;
  interactionRegistryServicePort: InteractionRegistryServicePort;
  experienceAdapterPort: ExperienceAdapterPort;
  scripturePiecesStateServicePort: ScripturePiecesStateServicePort;
  experienceConfigProviderPort: ExperienceConfigProviderPort;
  sequenceStateServicePort: SequenceStateServicePort;
  cameraAdapterPort: CameraAdapterPort;
  bibleLifecycleServicePort: BibleLifecycleServicePort;
  bibleSequenceServicePort: BibleSequenceServicePort;
  stackPresenceNavigationServicePort: StackPresenceNavigationServicePort;
  awaiterPort: AwaiterPort;
}

export class ExperienceService {
  #environmentAdapterPort: ExperienceServiceParams["environmentAdapterPort"];
  #stackManagementServicePort: ExperienceServiceParams["stackManagementServicePort"];
  #pieceHighlightServicePort: ExperienceServiceParams["pieceHighlightServicePort"];
  #interactionRegistryServicePort: ExperienceServiceParams["interactionRegistryServicePort"];

  #experienceId: string | undefined = undefined;
  #experienceAdapterPort: ExperienceServiceParams["experienceAdapterPort"];
  #scripturePiecesStateServicePort: ExperienceServiceParams["scripturePiecesStateServicePort"];
  #experienceConfigProviderPort: ExperienceServiceParams["experienceConfigProviderPort"];
  #sequenceStateServicePort: ExperienceServiceParams["sequenceStateServicePort"];
  #cameraAdapterPort: ExperienceServiceParams["cameraAdapterPort"];
  #bibleLifecycleServicePort: ExperienceServiceParams["bibleLifecycleServicePort"];
  #bibleSequenceServicePort: ExperienceServiceParams["bibleSequenceServicePort"];
  #stackPresenceNavigationServicePort: ExperienceServiceParams["stackPresenceNavigationServicePort"];
  #awaiterPort: ExperienceServiceParams["awaiterPort"];

  constructor({
    environmentAdapterPort,
    stackManagementServicePort,
    pieceHighlightServicePort,
    interactionRegistryServicePort,
    experienceAdapterPort,
    scripturePiecesStateServicePort,
    experienceConfigProviderPort,
    sequenceStateServicePort,
    cameraAdapterPort,
    bibleLifecycleServicePort,
    bibleSequenceServicePort,
    stackPresenceNavigationServicePort,
    awaiterPort,
  }: ExperienceServiceParams) {
    this.#environmentAdapterPort = environmentAdapterPort;
    this.#stackManagementServicePort = stackManagementServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#interactionRegistryServicePort = interactionRegistryServicePort;
    this.#experienceAdapterPort = experienceAdapterPort;
    this.#scripturePiecesStateServicePort = scripturePiecesStateServicePort;
    this.#experienceConfigProviderPort = experienceConfigProviderPort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#cameraAdapterPort = cameraAdapterPort;
    this.#bibleLifecycleServicePort = bibleLifecycleServicePort;
    this.#bibleSequenceServicePort = bibleSequenceServicePort;
    this.#stackPresenceNavigationServicePort =
      stackPresenceNavigationServicePort;
    this.#awaiterPort = awaiterPort;
  }

  clearExperience() {
    this.#environmentAdapterPort.resetZoomMin();
    this.#stackManagementServicePort.clearAllStacks();
    this.#pieceHighlightServicePort.clearScheduledUnhighlights();
    this.#pieceHighlightServicePort.clearHighlightedPieces();
    this.#interactionRegistryServicePort.clearAllLastInteractions();
    this.#scripturePiecesStateServicePort.resetToDefault();
  }

  async displayExperience() {
    if (!this.#experienceId) {
      const id = this.#experienceAdapterPort.displayExperience();
      this.#experienceId = id;

      await this.#awaiterPort.sleep(
        this.#experienceConfigProviderPort.getInitialBibleCreationDelay()
      );

      if (this.#experienceId && this.#experienceId === id) {
        this.#sequenceStateServicePort.executeAsSequence(async () => {
          const position =
            this.#experienceConfigProviderPort.getBibleCreationPosition();
          const { bibleData } = this.#bibleLifecycleServicePort.createBible({
            position,
            type: BibleTypes.Default,
          });
          this.#cameraAdapterPort.focusOn(position);
          await this.#bibleSequenceServicePort.crackOpenBible(bibleData);
          await this.#stackPresenceNavigationServicePort.update();
        });
      }
    }
  }

  closeExperience() {
    if (this.#experienceId) {
      this.#experienceAdapterPort.closeExperience(this.#experienceId);
    }
  }

  handleSomeExperienceClosed(id: string) {
    if (this.#experienceId && this.#experienceId === id) {
      this.#experienceId = undefined;
      this.clearExperience();
    }
  }
}
