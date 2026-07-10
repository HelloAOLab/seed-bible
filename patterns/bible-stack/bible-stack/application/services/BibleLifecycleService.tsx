import { StackBibleData } from "../../domain/entities/StackBibleData";
import type {
  PieceLifecycleServicePort,
  PieceLifecycleAdapterPort,
  BibleDataRepositoryPort,
  BibleLifecycleEventPort,
  ArrangementServicePort,
  IdGeneratorPort,
  StackPieceLifecycleAdapterPort,
  BibleSetupAdapterPort,
} from "../ports/bibleLifecycle";
import type { WorldPosition } from "../../domain/models/spatial";
import {
  BibleVisualizationStates,
  CrossPositions,
  type BibleType,
} from "../../domain/models/canvas";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";

interface BibleLifecycleServiceParams {
  pieceLifecycleAdapterPort: PieceLifecycleAdapterPort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  bibleLifecycleEventPort: BibleLifecycleEventPort;
  arrangementServicePort: ArrangementServicePort;
  idGeneratorPort: IdGeneratorPort;
  stackPieceLifecycleAdapterPort: StackPieceLifecycleAdapterPort;
  bibleSetupAdapterPort: BibleSetupAdapterPort;
}

export class BibleLifecycleService {
  #pieceLifecycleAdapterPort: BibleLifecycleServiceParams["pieceLifecycleAdapterPort"];
  #pieceLifecycleServicePort: BibleLifecycleServiceParams["pieceLifecycleServicePort"];
  #bibleDataRepositoryPort: BibleLifecycleServiceParams["bibleDataRepositoryPort"];
  #bibleLifecycleEventPort: BibleLifecycleServiceParams["bibleLifecycleEventPort"];
  #arrangementServicePort: BibleLifecycleServiceParams["arrangementServicePort"];
  #idGeneratorPort: BibleLifecycleServiceParams["idGeneratorPort"];
  #hasABibleEverBeenCreated: boolean = false;
  #stackPieceLifecycleAdapterPort: BibleLifecycleServiceParams["stackPieceLifecycleAdapterPort"];
  #bibleSetupAdapterPort: BibleLifecycleServiceParams["bibleSetupAdapterPort"];

  constructor({
    pieceLifecycleAdapterPort,
    pieceLifecycleServicePort,
    bibleDataRepositoryPort,
    bibleLifecycleEventPort,
    arrangementServicePort,
    idGeneratorPort,
    stackPieceLifecycleAdapterPort,
    bibleSetupAdapterPort,
  }: BibleLifecycleServiceParams) {
    this.#pieceLifecycleAdapterPort = pieceLifecycleAdapterPort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#bibleLifecycleEventPort = bibleLifecycleEventPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#idGeneratorPort = idGeneratorPort;
    this.#stackPieceLifecycleAdapterPort = stackPieceLifecycleAdapterPort;
    this.#bibleSetupAdapterPort = bibleSetupAdapterPort;
  }

  deleteBible(bibleData: StackBibleData) {
    this.#bibleDataRepositoryPort.removeBibleData(bibleData);
    const clearedPieces = bibleData.clearStaticBiblePieces();
    if (clearedPieces) {
      this.#pieceLifecycleAdapterPort.despawnPieces(clearedPieces);
    }
    const children = bibleData.clearChildren();
    this.#pieceLifecycleServicePort.deleteTestaments(children);

    this.#bibleLifecycleEventPort.emit("OnBibleDelete", {
      bibleId: bibleData.id,
    }); // TODO: Wire this event to the InteractionRegistryService to check if the deleted bible is the last interacted
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
    this.#bibleLifecycleEventPort.emit("OnBibleCreationBegin", {
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
    this.#bibleLifecycleEventPort.emit("OnBibleCreated", { bibleData }); // TODO: Make the interaction registry service listen to this to register this bible as the last interacted.

    const { testamentPiecesMap } = this.#bibleSetupAdapterPort.setUp({
      bibleData,
      position,
      bibleType: type,
    });

    bibleData.changeState("Closed");
    bibleData.handleSetup();

    for (const testamentData of bibleData.childrenData) {
      const piece = testamentPiecesMap.get(testamentData.id);
      if (piece) {
        testamentData.setPiece(piece);
        testamentData.activate();
      }
    }

    // if (displayJarvisSpawnPieceAnimation)
    //   await jarvis.SpawnPieceEnd({ scales: new Vector3(4.5, 4.5, 4.5) });

    return { bibleData };
  }
}
