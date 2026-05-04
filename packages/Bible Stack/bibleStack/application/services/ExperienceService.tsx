import type {
  EnvironmentAdapterPort,
  StackManagementService,
  PieceHighlightServicePort,
  InteractionRegistryServicePort,
  ExperienceAdapterPort,
  ScripturePiecesStateServicePort,
  ExperienceConfigProviderPort,
  SequenceStateServicePort,
  StackPresenceNavigationPort,
  AwaiterPort,
} from "bibleStack.application.ports.experience";
import type {
  CameraAdapterPort,
  BibleLifecycleServicePort,
  BibleSequenceServicePort,
} from "bibleStack.application.ports.bibleLifecycle";
import { BibleType } from "bibleVizUtils.domain.models.canvas";

interface ExperienceServiceParams {
  environmentAdapterPort: EnvironmentAdapterPort;
  stackManagementServicePort: StackManagementService;
  pieceHighlightServicePort: PieceHighlightServicePort;
  interactionRegistryServicePort: InteractionRegistryServicePort;
  experienceAdapterPort: ExperienceAdapterPort;
  scripturePiecesStateServicePort: ScripturePiecesStateServicePort;
  experienceConfigProviderPort: ExperienceConfigProviderPort;
  sequenceStateServicePort: SequenceStateServicePort;
  cameraAdapterPort: CameraAdapterPort;
  bibleLifecycleServicePort: BibleLifecycleServicePort;
  bibleSequenceServicePort: BibleSequenceServicePort;
  stackPresenceNavigationPort: StackPresenceNavigationPort;
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
  #stackPresenceNavigationPort: ExperienceServiceParams["stackPresenceNavigationPort"];
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
    stackPresenceNavigationPort,
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
    this.#stackPresenceNavigationPort = stackPresenceNavigationPort;
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
            type: BibleType.Default,
          });
          this.#cameraAdapterPort.focusOn(position);
          await this.#bibleSequenceServicePort.crackOpenBible(bibleData);
          await this.#stackPresenceNavigationPort.update();
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
