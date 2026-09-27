import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BibleLifecycleService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BibleLifecycleService";
import type { IdGeneratorPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/bibleLifecycle";
import type { ArrangementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Arrangement";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";
import type { TestamentInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type { Piece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";
import type { PieceLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import {
  makeArrangementServiceDouble,
  makePieceLifecycleServiceDouble,
} from "../serviceDoubles";
import type { BibleSetupPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleSetup";
import type { StackPieceLifecyclePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/StackPieceLifecycle";
import type { BibleDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BibleDataRepository";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import {
  makeBibleDataRepositoryDouble,
  makeStackPieceLifecycleDouble,
} from "../adapterDoubles";

describe("pattern.bible-stack.application.services.BibleLifecycleService", () => {
  let service: BibleLifecycleService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceLifecycleAdapterPort: Mocked<StackPieceLifecyclePort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let eventManagerPort: Mocked<EventManagerPort<BibleStackEvents>>;
  let arrangementServicePort: Mocked<ArrangementServicePort>;
  let idGeneratorPort: Mocked<IdGeneratorPort>;
  let stackPieceLifecycleAdapterPort: Mocked<StackPieceLifecyclePort>;
  let bibleSetupAdapterPort: Mocked<BibleSetupPort>;
  let loggerPort: Mocked<LoggerPort>;
  const makeBible = ({
    id = "bible-id",
    staticPieces,
    children = [{ id: "testament-1" }, { id: "testament-2" }],
  }: {
    id?: string;
    staticPieces?: unknown[] | undefined;
    children?: unknown[];
  } = {}) =>
    ({
      id,
      clearStaticBiblePieces: vi.fn(() => staticPieces),
      clearChildren: vi.fn(() => children),
    }) as unknown as StackBibleData;

  const bibleType = "Default";
  const position = { x: 0, y: 0, z: 10 };
  const id = "bible-id";
  const arrangementIndex = 5;
  const bibleTransformer = {
    id: "bible-transformer",
  } as unknown as StackTransformer;
  const bibleShadow = { id: "bible-shadow" } as unknown as StackShadow;
  const makeTestamentInfo = (): TestamentInfo => {
    return {} as TestamentInfo;
  };

  const makeTestamentData = (dataId: string): StackTestamentData => {
    const data = {
      id: dataId,
      isActive: false,
      piece: undefined as Piece<"StackTestament"> | undefined,
      setPiece: (newPiece: Piece<"StackTestament">) => {
        data.piece = newPiece;
      },
      activate: () => {
        data.isActive = true;
      },
    };
    return data as unknown as StackTestamentData;
  };

  beforeEach(() => {
    bibleDataRepositoryPort = makeBibleDataRepositoryDouble();
    pieceLifecycleAdapterPort = makeStackPieceLifecycleDouble();
    pieceLifecycleServicePort = makePieceLifecycleServiceDouble();
    eventManagerPort = {
      subscribe: vi.fn(),
      emit: vi.fn(() => {}),
      removeAllListeners: vi.fn(),
    };
    arrangementServicePort = makeArrangementServiceDouble();
    idGeneratorPort = {
      getId: vi.fn(),
    };
    stackPieceLifecycleAdapterPort = makeStackPieceLifecycleDouble();
    bibleSetupAdapterPort = {
      setUp: vi.fn(),
    };
    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };
    service = new BibleLifecycleService({
      pieceLifecycleAdapterPort,
      pieceLifecycleServicePort,
      bibleDataRepositoryPort,
      eventManagerPort,
      arrangementServicePort,
      idGeneratorPort,
      stackPieceLifecycleAdapterPort,
      bibleSetupAdapterPort,
      loggerPort,
    });
  });

  describe("deleteBible", () => {
    it("removes the bible data, despawns its static pieces, deletes its testaments and emits", () => {
      const staticPieces = [
        {
          id: "piece-1",
        },
        {
          id: "piece-2",
        },
      ];
      const testaments = [
        {
          id: "testament-1",
        },
        {
          id: "testament-2",
        },
      ];
      const bible = makeBible({
        staticPieces,
        children: testaments,
      });
      service.deleteBible(bible);
      expect(
        bibleDataRepositoryPort.removeBibleData
      ).toHaveBeenCalledExactlyOnceWith(bible);
      expect(
        pieceLifecycleAdapterPort.despawnPieces
      ).toHaveBeenCalledExactlyOnceWith(staticPieces);
      expect(
        pieceLifecycleServicePort.deleteTestaments
      ).toHaveBeenCalledExactlyOnceWith(testaments);
      expect(eventManagerPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnBibleDelete",
        {
          bibleId: bible.id,
        }
      );
    });

    it("does not try to despawn if static pieces provided are undefined", () => {
      const testaments = [
        {
          id: "testament-1",
        },
        {
          id: "testament-2",
        },
      ];
      const bible = makeBible({
        staticPieces: undefined,
        children: testaments,
      });
      service.deleteBible(bible);
      expect(
        bibleDataRepositoryPort.removeBibleData
      ).toHaveBeenCalledExactlyOnceWith(bible);
      expect(pieceLifecycleAdapterPort.despawnPieces).not.toHaveBeenCalled();
      expect(
        pieceLifecycleServicePort.deleteTestaments
      ).toHaveBeenCalledExactlyOnceWith(testaments);
      expect(eventManagerPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnBibleDelete",
        { bibleId: bible.id }
      );
    });
  });

  describe("deleteBibles", () => {
    it("deletes every bible in the batch, in order", () => {
      const bibles = [
        makeBible({ id: "bible-1" }),
        makeBible({ id: "bible-2" }),
        makeBible({ id: "bible-3" }),
        makeBible({ id: "bible-4" }),
      ];

      service.deleteBibles(bibles);

      expect(eventManagerPort.emit.mock.calls).toEqual(
        bibles.map((bible) => ["OnBibleDelete", { bibleId: bible.id }])
      );
      expect(bibleDataRepositoryPort.removeBibleData.mock.calls).toEqual(
        bibles.map((bible) => [bible])
      );
    });
  });

  describe("createBible", () => {
    describe("with an arrangement that has testaments", () => {
      let bibleData: StackBibleData;
      let testamentsInfo: TestamentInfo[];
      let executionOrder: string[];

      beforeEach(() => {
        let spawnedCoversCount = 0;
        let spawnedCrossLinesCount = 0;

        testamentsInfo = [
          makeTestamentInfo(),
          makeTestamentInfo(),
          makeTestamentInfo(),
        ];
        executionOrder = [];

        idGeneratorPort.getId.mockReturnValue(id);
        stackPieceLifecycleAdapterPort.spawnBibleTransformer.mockReturnValue(
          bibleTransformer
        );
        stackPieceLifecycleAdapterPort.spawnCover.mockImplementation(
          () =>
            ({ id: `cover-${spawnedCoversCount++}` }) as unknown as StackCover
        );
        stackPieceLifecycleAdapterPort.spawnCrossLine.mockImplementation(
          () =>
            ({
              id: `cross-line-${spawnedCrossLinesCount++}`,
            }) as unknown as StackCrossLine
        );
        stackPieceLifecycleAdapterPort.spawnShadow.mockReturnValue(bibleShadow);
        eventManagerPort.emit.mockImplementation((eventName) => {
          executionOrder.push(`emit:${eventName}`);
        });
        bibleDataRepositoryPort.addBibleData.mockImplementation(() => {
          executionOrder.push("addBibleData");
        });
        arrangementServicePort.getArrangementByIndex.mockReturnValue({
          name: "arr-name",
          testaments: testamentsInfo,
        });
        pieceLifecycleServicePort.createTestament.mockImplementation(
          ({ arrangementIndex: currArrangementIndex, testamentIndex }) =>
            makeTestamentData(
              `tes-data-${currArrangementIndex}-${testamentIndex}`
            )
        );
        bibleSetupAdapterPort.setUp.mockReturnValue({
          testamentPiecesMap: new Map(
            testamentsInfo.map((_, currTestamentIndex) => [
              `tes-data-${arrangementIndex}-${currTestamentIndex}`,
              {
                id: `tes-piece-${arrangementIndex}-${currTestamentIndex}`,
              } as unknown as Piece<"StackTestament">,
            ])
          ),
        });
        ({ bibleData } = service.createBible({
          position,
          type: bibleType,
          arrangementIndex,
        }));
      });

      it("returns a bible data holding the generated id", () => {
        expect(bibleData).toBeInstanceOf(StackBibleData);
        expect(bibleData.id).toBe(id);
      });

      it("spawns every static piece with the bible id", () => {
        expect(stackPieceLifecycleAdapterPort.spawnCover.mock.calls).toEqual([
          [id],
          [id],
          [id],
        ]);
        expect(
          stackPieceLifecycleAdapterPort.spawnCrossLine.mock.calls
        ).toEqual([[id], [id]]);
        expect(
          stackPieceLifecycleAdapterPort.spawnBibleTransformer
        ).toHaveBeenCalledExactlyOnceWith(id);
        expect(
          stackPieceLifecycleAdapterPort.spawnShadow
        ).toHaveBeenCalledExactlyOnceWith(id);
      });

      it("keeps every spawned static piece, without repeating any", () => {
        expect(bibleData.staticBiblePieces).toBeDefined();
        const {
          upperCover,
          leftCover,
          lowerCover,
          crossVerticalLine,
          crossHorizontalLine,
          ...singleStaticPieces
        } = bibleData.staticBiblePieces!;

        expect(singleStaticPieces).toEqual({ bibleTransformer, bibleShadow });
        expect(new Set([upperCover, leftCover, lowerCover])).toEqual(
          new Set(
            stackPieceLifecycleAdapterPort.spawnCover.mock.results.map(
              ({ value }) => value
            )
          )
        );
        expect(new Set([crossVerticalLine, crossHorizontalLine])).toEqual(
          new Set(
            stackPieceLifecycleAdapterPort.spawnCrossLine.mock.results.map(
              ({ value }) => value
            )
          )
        );
      });

      it("leaves the bible closed and already set up", () => {
        expect(bibleData.currentState).toBe("Closed");
        expect(bibleData.hasBeenSetUp).toBe(true);
      });

      it("creates one testament per arrangement testament", () => {
        expect(pieceLifecycleServicePort.createTestament.mock.calls).toEqual(
          testamentsInfo.map((_, testamentIndex) => [
            {
              arrangementIndex,
              testamentIndex,
              bibleDataId: id,
            },
          ])
        );
      });

      it("gives every testament its piece and activates it", () => {
        expect(
          bibleData.childrenData.map((data) => ({
            active: data.isActive,
            piece: data.piece,
          }))
        ).toEqual(
          testamentsInfo.map((_, infoIndex) => ({
            active: true,
            piece: {
              id: `tes-piece-${arrangementIndex}-${infoIndex}`,
            },
          }))
        );
      });

      it("sets the bible up at the requested position and type", () => {
        expect(bibleSetupAdapterPort.setUp).toHaveBeenCalledExactlyOnceWith({
          bibleData,
          position,
          bibleType,
        });
      });

      it("registers the bible between both creation events", () => {
        expect(
          bibleDataRepositoryPort.addBibleData
        ).toHaveBeenCalledExactlyOnceWith(bibleData);
        expect(eventManagerPort.emit).toHaveBeenNthCalledWith(
          1,
          "OnBibleCreationBegin",
          {
            hasABibleEverBeenCreated: false,
          }
        );
        expect(eventManagerPort.emit).toHaveBeenNthCalledWith(
          2,
          "OnBibleCreated",
          { bibleData }
        );
        expect(executionOrder).toEqual([
          "emit:OnBibleCreationBegin",
          "addBibleData",
          "emit:OnBibleCreated",
        ]);
      });

      it("does not log any error", () => {
        expect(loggerPort.error).not.toHaveBeenCalled();
      });
    });

    it("does not create testaments if no arrangement is found, without blocking the execution", () => {
      idGeneratorPort.getId.mockReturnValue(id);
      arrangementServicePort.getArrangementByIndex.mockReturnValue(undefined);
      stackPieceLifecycleAdapterPort.spawnBibleTransformer.mockReturnValue(
        bibleTransformer
      );
      stackPieceLifecycleAdapterPort.spawnCover.mockReturnValue(
        {} as unknown as StackCover
      );
      stackPieceLifecycleAdapterPort.spawnCrossLine.mockReturnValue(
        {} as unknown as StackCrossLine
      );
      stackPieceLifecycleAdapterPort.spawnShadow.mockReturnValue(bibleShadow);
      bibleSetupAdapterPort.setUp.mockReturnValue({
        testamentPiecesMap: new Map(),
      });

      const { bibleData } = service.createBible({
        position,
        type: bibleType,
        arrangementIndex,
      });

      expect(bibleData).toBeInstanceOf(StackBibleData);
      expect(eventManagerPort.emit).toHaveBeenNthCalledWith(
        1,
        "OnBibleCreationBegin",
        {
          hasABibleEverBeenCreated: false,
        }
      );
      expect(pieceLifecycleServicePort.createTestament).not.toHaveBeenCalled();
      expect(bibleData.childrenData.length).toBe(0);
      expect(
        bibleDataRepositoryPort.addBibleData
      ).toHaveBeenCalledExactlyOnceWith(bibleData);
      expect(eventManagerPort.emit).toHaveBeenNthCalledWith(
        2,
        "OnBibleCreated",
        { bibleData }
      );
      expect(bibleSetupAdapterPort.setUp).toHaveBeenCalledExactlyOnceWith({
        bibleData,
        position,
        bibleType,
      });
    });

    it("emits with hasABibleEverBeenCreated set to true from the second call and on", () => {
      idGeneratorPort.getId.mockReturnValue(id);
      bibleSetupAdapterPort.setUp.mockReturnValue({
        testamentPiecesMap: new Map(),
      });

      service.createBible({ position, type: bibleType, arrangementIndex });
      service.createBible({ position, type: bibleType, arrangementIndex });
      service.createBible({ position, type: bibleType, arrangementIndex });

      const creationBeginCalls = eventManagerPort.emit.mock.calls.filter(
        ([eventName]) => eventName === "OnBibleCreationBegin"
      );

      expect(creationBeginCalls).toEqual([
        ["OnBibleCreationBegin", { hasABibleEverBeenCreated: false }],
        ["OnBibleCreationBegin", { hasABibleEverBeenCreated: true }],
        ["OnBibleCreationBegin", { hasABibleEverBeenCreated: true }],
      ]);
    });

    it("logs an error and leaves the testament inactive when its piece is missing", () => {
      const testamentsInfo = [
        makeTestamentInfo(),
        makeTestamentInfo(),
        makeTestamentInfo(),
      ];

      idGeneratorPort.getId.mockReturnValue(id);
      arrangementServicePort.getArrangementByIndex.mockReturnValue({
        name: "arr-name",
        testaments: testamentsInfo,
      });
      pieceLifecycleServicePort.createTestament.mockImplementation(
        ({ arrangementIndex: currArrangementIndex, testamentIndex }) =>
          makeTestamentData(
            `tes-data-${currArrangementIndex}-${testamentIndex}`
          )
      );
      bibleSetupAdapterPort.setUp.mockReturnValue({
        testamentPiecesMap: new Map([
          [
            `tes-data-${arrangementIndex}-0`,
            {
              id: `tes-piece-${arrangementIndex}-0`,
            } as unknown as Piece<"StackTestament">,
          ],
          [
            `tes-data-${arrangementIndex}-2`,
            {
              id: `tes-piece-${arrangementIndex}-2`,
            } as unknown as Piece<"StackTestament">,
          ],
        ]),
      });

      const { bibleData } = service.createBible({
        position,
        type: bibleType,
        arrangementIndex,
      });

      expect(
        bibleData.childrenData.map((data) => ({
          active: data.isActive,
          piece: data.piece,
        }))
      ).toEqual([
        { active: true, piece: { id: `tes-piece-${arrangementIndex}-0` } },
        { active: false, piece: undefined },
        { active: true, piece: { id: `tes-piece-${arrangementIndex}-2` } },
      ]);
      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "BibleLifecycleService: testament piece not found at createBible.",
        { testamentDataId: `tes-data-${arrangementIndex}-1` }
      );
    });
  });
});
