import type {
  EnvironmentAdapterPort,
  InteractionRegistryServicePort,
  ExperienceAdapterPort,
  ExperienceConfigProviderPort,
  AwaiterPort,
} from "../ports/experience";
import type { StackPresenceNavigationServicePort } from "../ports/in/StackPresenceNavigation";
import type { CameraAdapterPort } from "../ports/bibleLifecycle";
import { BibleTypes } from "../../domain/models/canvas";
import type { ScripturePiecesStateServicePort } from "../ports/in/ScripturePiecesState";
import type { ExperienceServicePort } from "../ports/in/Experience";
import type { PieceActivityServicePort } from "../ports/in/PieceActivity";
import type { PieceHighlightServicePort } from "../ports/in/PieceHighlight";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { BibleSequenceServicePort } from "../ports/in/BibleSequence";
import type { BibleLifecycleServicePort } from "../ports/in/BibleLifecycle";
import type { StackManagementServicePort } from "../ports/in/StackManagement";

interface ExperienceServiceParams {
  environmentAdapterPort: EnvironmentAdapterPort;
  stackManagementServicePort: StackManagementServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
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
  pieceActivityServicePort: PieceActivityServicePort;
}

export class ExperienceService implements ExperienceServicePort {
  #environmentAdapterPort: ExperienceServiceParams["environmentAdapterPort"];
  #stackManagementServicePort: ExperienceServiceParams["stackManagementServicePort"];
  #pieceHighlightServicePort: ExperienceServiceParams["pieceHighlightServicePort"];
  #interactionRegistryServicePort: ExperienceServiceParams["interactionRegistryServicePort"];

  #experienceAdapterPort: ExperienceServiceParams["experienceAdapterPort"];
  #scripturePiecesStateServicePort: ExperienceServiceParams["scripturePiecesStateServicePort"];
  #experienceConfigProviderPort: ExperienceServiceParams["experienceConfigProviderPort"];
  #sequenceStateServicePort: ExperienceServiceParams["sequenceStateServicePort"];
  #cameraAdapterPort: ExperienceServiceParams["cameraAdapterPort"];
  #bibleLifecycleServicePort: ExperienceServiceParams["bibleLifecycleServicePort"];
  #bibleSequenceServicePort: ExperienceServiceParams["bibleSequenceServicePort"];
  #stackPresenceNavigationServicePort: ExperienceServiceParams["stackPresenceNavigationServicePort"];
  #awaiterPort: ExperienceServiceParams["awaiterPort"];
  #pieceActivityServicePort: ExperienceServiceParams["pieceActivityServicePort"];

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
    pieceActivityServicePort,
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
    this.#pieceActivityServicePort = pieceActivityServicePort;
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
    this.#experienceAdapterPort.displayExperience();

    await this.#awaiterPort.sleep(
      this.#experienceConfigProviderPort.getInitialBibleCreationDelay()
    );
    const position =
      this.#experienceConfigProviderPort.getBibleCreationPosition();
    const { bibleData } = this.#bibleLifecycleServicePort.createBible({
      position,
      type: BibleTypes.Default,
    });
    this.#cameraAdapterPort.focusOn(position, "bibleSetup");

    this.#sequenceStateServicePort.executeAsSequence(async () => {
      await this.#bibleSequenceServicePort.crackOpenBible(bibleData);
      await this.#stackPresenceNavigationServicePort.update();
      this.#pieceActivityServicePort.updateAllNotifications();
    });
  }
}
