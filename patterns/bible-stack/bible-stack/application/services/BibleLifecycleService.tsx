import { StackBibleData } from "../../domain/entities/StackBibleData";
import type { WorldPosition } from "../../domain/models/spatial";
import {
  BibleVisualizationStates,
  CrossPositions,
  type BibleType,
} from "../../domain/models/canvas";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { ArrangementServicePort } from "../ports/in/Arrangement";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { BibleLifecycleServicePort } from "../ports/in/BibleLifecycle";
import type { StackPieceLifecyclePort } from "../ports/out/StackPieceLifecycle";
import type { BibleSetupPort } from "../ports/out/BibleSetup";
import type { BibleDataRepositoryPort } from "../ports/out/BibleDataRepository";
import type { LoggerPort } from "../ports/out/Logger";
import type { IdGeneratorPort } from "../ports/out/IdGenerator";

interface ServiceParams {
  pieceLifecycleAdapterPort: StackPieceLifecyclePort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  arrangementServicePort: ArrangementServicePort;
  idGeneratorPort: IdGeneratorPort;
  stackPieceLifecycleAdapterPort: StackPieceLifecyclePort;
  bibleSetupAdapterPort: BibleSetupPort;
  loggerPort: LoggerPort;
}

export class BibleLifecycleService implements BibleLifecycleServicePort {
  #pieceLifecycleAdapterPort: ServiceParams["pieceLifecycleAdapterPort"];
  #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #eventManagerPort: ServiceParams["eventManagerPort"];
  #arrangementServicePort: ServiceParams["arrangementServicePort"];
  #idGeneratorPort: ServiceParams["idGeneratorPort"];
  #hasABibleEverBeenCreated: boolean = false;
  #stackPieceLifecycleAdapterPort: ServiceParams["stackPieceLifecycleAdapterPort"];
  #bibleSetupAdapterPort: ServiceParams["bibleSetupAdapterPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    pieceLifecycleAdapterPort,
    pieceLifecycleServicePort,
    bibleDataRepositoryPort,
    eventManagerPort,
    arrangementServicePort,
    idGeneratorPort,
    stackPieceLifecycleAdapterPort,
    bibleSetupAdapterPort,
    loggerPort,
  }: ServiceParams) {
    this.#pieceLifecycleAdapterPort = pieceLifecycleAdapterPort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#eventManagerPort = eventManagerPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#idGeneratorPort = idGeneratorPort;
    this.#stackPieceLifecycleAdapterPort = stackPieceLifecycleAdapterPort;
    this.#bibleSetupAdapterPort = bibleSetupAdapterPort;
    this.#loggerPort = loggerPort;
  }

  deleteBible(bibleData: StackBibleData) {
    this.#bibleDataRepositoryPort.removeBibleData(bibleData);
    const clearedPieces = bibleData.clearStaticBiblePieces();
    if (clearedPieces) {
      this.#pieceLifecycleAdapterPort.despawnPieces(clearedPieces);
    }
    const children = bibleData.clearChildren();
    this.#pieceLifecycleServicePort.deleteTestaments(children);

    this.#eventManagerPort.emit("OnBibleDelete", {
      bibleId: bibleData.id,
    });
  }

  deleteBibles(biblesData: StackBibleData[]) {
    for (const bibleData of biblesData) {
      this.deleteBible(bibleData);
    }
  }

  createBible({
    position,
    type,
    arrangementIndex = this.#arrangementServicePort.getCurrentArrangementIndex(),
  }: {
    position: WorldPosition;
    type: BibleType;
    arrangementIndex?: number;
  }) {
    this.#eventManagerPort.emit("OnBibleCreationBegin", {
      hasABibleEverBeenCreated: this.#hasABibleEverBeenCreated,
    });
    this.#hasABibleEverBeenCreated = true;
    const bibleDataId = this.#idGeneratorPort.getId();

    const bibleTransformer =
      this.#stackPieceLifecycleAdapterPort.spawnBibleTransformer(bibleDataId);
    const upperCover =
      this.#stackPieceLifecycleAdapterPort.spawnCover(bibleDataId);
    const leftCover =
      this.#stackPieceLifecycleAdapterPort.spawnCover(bibleDataId);
    const lowerCover =
      this.#stackPieceLifecycleAdapterPort.spawnCover(bibleDataId);
    const crossVerticalLine =
      this.#stackPieceLifecycleAdapterPort.spawnCrossLine(bibleDataId);
    const crossHorizontalLine =
      this.#stackPieceLifecycleAdapterPort.spawnCrossLine(bibleDataId);
    const bibleShadow =
      this.#stackPieceLifecycleAdapterPort.spawnShadow(bibleDataId);

    const staticBiblePieces: StackBibleData["staticBiblePieces"] = {
      bibleTransformer,
      upperCover,
      leftCover,
      lowerCover,
      crossVerticalLine,
      crossHorizontalLine,
      bibleShadow,
    };

    const testamentsData: StackTestamentData[] = [];
    const arrangement =
      this.#arrangementServicePort.getArrangementByIndex(arrangementIndex);
    if (arrangement) {
      for (
        let testamentIndex = 0;
        testamentIndex < arrangement.testaments.length;
        testamentIndex++
      ) {
        const testamentData = this.#pieceLifecycleServicePort.createTestament({
          arrangementIndex,
          testamentIndex,
          bibleDataId,
        });
        testamentsData.push(testamentData);
      }
    }

    const bibleData = new StackBibleData({
      bibleType: type,
      arrangementIndex,
      currentCrossPosition: CrossPositions.Top,
      currentStackVizState: BibleVisualizationStates.Regular,
      id: bibleDataId,
      childrenData: testamentsData,
      staticBiblePieces,
    });

    this.#bibleDataRepositoryPort.addBibleData(bibleData);
    this.#eventManagerPort.emit("OnBibleCreated", { bibleData });

    const { testamentPiecesMap } = this.#bibleSetupAdapterPort.setUp({
      bibleData,
      position,
      bibleType: type,
    });

    bibleData.changeState("Closed");
    bibleData.handleSetup();

    for (const testamentData of bibleData.childrenData) {
      const piece = testamentPiecesMap.get(testamentData.id);
      if (!piece) {
        this.#loggerPort.error(
          "BibleLifecycleService: testament piece not found at createBible.",
          { testamentDataId: testamentData.id }
        );
        continue;
      }
      testamentData.setPiece(piece);
      testamentData.activate();
    }

    // if (displayJarvisSpawnPieceAnimation)
    //   await jarvis.SpawnPieceEnd({ scales: new Vector3(4.5, 4.5, 4.5) });

    return { bibleData };
  }
}
