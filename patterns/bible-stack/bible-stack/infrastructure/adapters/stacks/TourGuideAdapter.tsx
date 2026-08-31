import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { TourGuieAdapterPort } from "../../../application/ports/tourGuide";
import type { CameraAdapterPort } from "../../../application/ports/bibleLifecycle";
import type { PieceHighlighterPort } from "../../../application/ports/in/PieceHighlight";
import type { AudioAdapter } from "../audio/AudioAdapter";
import type { LoggerPort } from "../../../application/ports/in/Logger";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { SectionBot } from "../../models/stack";
import type { TourGuideConfigProvider } from "../../config/tourGuide/TourGuideConfigProvider";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { WorldPosition } from "../../../domain/models/spatial";
import { MakePortalFree, MakePortalRestrict } from "../../functions/casualos";

interface AdapterParams {
  getDimension: () => string;
  sectionMapper: StackSectionMapper;
  visualStateRegistry: VisualStateRegistry;
  cameraAdapterPort: CameraAdapterPort;
  pieceHighlighterPort: PieceHighlighterPort;
  audioAdapter: AudioAdapter;
  tourGuideConfigProvider: TourGuideConfigProvider;
  loggerPort: LoggerPort;
}

/**
 * Runs the "tour guide" the first time a section is selected: it focuses the
 * camera on the section, frees the portal, then highlights each book in turn
 * while the camera slowly pans down to the section's base. This is the clean
 * architecture port of the legacy `TryMakeTourGuideOnSection` /
 * `StopCurrentTourGuide` bot scripts.
 */
export class TourGuideAdapter implements TourGuieAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #sectionMapper: AdapterParams["sectionMapper"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #cameraAdapterPort: AdapterParams["cameraAdapterPort"];
  #pieceHighlighterPort: AdapterParams["pieceHighlighterPort"];
  #audioAdapter: AdapterParams["audioAdapter"];
  #tourGuideConfigProvider: AdapterParams["tourGuideConfigProvider"];
  #loggerPort: AdapterParams["loggerPort"];

  #intervalId: ReturnType<typeof setInterval> | undefined;
  #settleOngoing: (() => void) | undefined;

  constructor({
    getDimension,
    sectionMapper,
    visualStateRegistry,
    cameraAdapterPort,
    pieceHighlighterPort,
    audioAdapter,
    tourGuideConfigProvider,
    loggerPort,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#sectionMapper = sectionMapper;
    this.#visualStateRegistry = visualStateRegistry;
    this.#cameraAdapterPort = cameraAdapterPort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#audioAdapter = audioAdapter;
    this.#tourGuideConfigProvider = tourGuideConfigProvider;
    this.#loggerPort = loggerPort;
  }

  async startTourGuideSequence(sectionData: StackSectionData): Promise<void> {
    const piece = sectionData.piece;
    if (!piece) {
      this.#loggerPort.error(
        "TourGuideAdapter: section piece not defined at startTourGuideSequence"
      );
      return;
    }
    const sectionBot = this.#sectionMapper.toInfrastructure(piece);
    if (!sectionBot) {
      this.#loggerPort.error(
        "TourGuideAdapter: section bot not found at startTourGuideSequence"
      );
      return;
    }

    const dimension = this.#getDimension();
    const basePosition = this.#computeFocusBasePosition(
      sectionData,
      sectionBot,
      dimension
    );
    const desiredScaleZ = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "desiredScaleZ",
    });

    MakePortalRestrict();

    // Focus slightly above the section, then release the portal once the
    // camera settles (mirrors the legacy `OnTourGuideCameraFocusComplete`).
    await this.#cameraAdapterPort.focusOn(
      {
        x: basePosition.x,
        y: basePosition.y,
        z: basePosition.z + desiredScaleZ,
      },
      "tourGuideSection",
      { duration: this.#tourGuideConfigProvider.getInitialFocusDuration() }
    );
    MakePortalFree();

    const books = sectionData.getReversedActiveBooks();
    if (books.length === 0) return;

    const delay = this.#tourGuideConfigProvider.getDelayBetweenBookHighlight();
    // Slow pan down to the section base, spanning the whole highlight loop.
    this.#cameraAdapterPort.focusOn(basePosition, "tourGuideSection", {
      duration: (delay / 1000) * books.length,
    });

    return new Promise<void>((resolve) => {
      this.#settleOngoing = resolve;
      let index = 0;
      this.#intervalId = setInterval(() => {
        const bookPiece = books[index]?.piece;
        if (bookPiece) {
          this.#pieceHighlighterPort.tryHighlightPiece({
            piece: bookPiece,
            source: "Transition",
            scheduledUnhighlightData: {
              delay: this.#tourGuideConfigProvider.getUnhighlightDelay(),
              pacing: this.#tourGuideConfigProvider.getBookHighlightPacing(),
            },
            pacing: this.#tourGuideConfigProvider.getBookHighlightPacing(),
          });
        }
        const sound = this.#tourGuideConfigProvider.getSound(
          books.length,
          index
        );
        if (sound) this.#audioAdapter.playSound(sound);
        index++;
        if (index >= books.length) this.#complete();
      }, delay);
    });
  }

  endTourGuideSequence(): void {
    this.#cameraAdapterPort.cancelFocus();
    this.#complete();
  }

  /**
   * Settles the ongoing tour: stops the highlight loop, frees the portal and
   * resolves the pending promise so `TourGuideService`'s `.finally` clears the
   * ongoing state. Safe to call when no tour is running.
   */
  #complete(): void {
    if (this.#intervalId !== undefined) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
    MakePortalFree();
    const settle = this.#settleOngoing;
    this.#settleOngoing = undefined;
    settle?.();
  }

  /**
   * The section's world position, offset by the bible transformer's position
   * when the section belongs to a bible (positions are relative to it).
   */
  #computeFocusBasePosition(
    sectionData: StackSectionData,
    sectionBot: SectionBot,
    dimension: string
  ): WorldPosition {
    const position = getBotPosition(sectionBot, dimension);
    const basePosition = { x: position.x, y: position.y, z: position.z };

    const bibleId = sectionData.getParentId("stackBibleId");
    if (bibleId) {
      const transformerId = sectionBot.tags.transformer;
      if (transformerId) {
        const transformerBot = getBot(byID(transformerId));
        if (transformerBot) {
          const transformerPosition = getBotPosition(transformerBot, dimension);
          basePosition.x += transformerPosition.x;
          basePosition.y += transformerPosition.y;
          basePosition.z += transformerPosition.z;
        }
      }
    }

    return basePosition;
  }
}
