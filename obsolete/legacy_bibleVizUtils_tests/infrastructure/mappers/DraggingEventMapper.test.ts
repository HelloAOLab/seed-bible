import { DraggingEventMapper } from "bibleVizUtils.infrastructure.mappers.DraggingEventMapper";

// ─── factories ────────────────────────────────────────────────────────────────

const makeBot = (overrides: any = {}): any => ({
  id: "bot-1",
  tags: {},
  ...overrides,
});

const makePiece = (overrides: any = {}): any => ({
  id: "piece-1",
  ...overrides,
});

const makePieceMapper = (overrides: any = {}) => ({
  toDomain: jest.fn().mockReturnValue(makePiece()),
  toInfrastructure: jest.fn().mockReturnValue(makeBot()),
  ...overrides,
});

const makeDimensionPort = (dimension = "my-dimension") => ({
  getCurrentDimension: jest.fn().mockReturnValue(dimension),
});

const makeMapper = ({
  pieceMapper = makePieceMapper(),
  dimensionPort = makeDimensionPort(),
} = {}) => ({
  mapper: new DraggingEventMapper({
    pieceMapperPort: pieceMapper,
    dimensionPort,
  }),
  pieceMapper,
  dimensionPort,
});

const makeInfraEvent = (overrides: any = {}): any => ({
  bot: makeBot({ id: "piece-bot" }),
  to: { bot: makeBot({ id: "to-bot" }), x: 2, y: 3, dimension: "dim-a" },
  from: { x: 0, y: 1, dimension: "dim-a" },
  ...overrides,
});

const makeDomainEvent = (overrides: any = {}): any => ({
  piece: makePiece({ id: "piece-1" }),
  to: { piece: makePiece({ id: "to-piece" }), x: 2, y: 3 },
  from: { x: 0, y: 1 },
  ...overrides,
});

// ─── toDomain ─────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("calls pieceMapper.toDomain with event.bot", () => {
    const pieceMapper = makePieceMapper();
    const { mapper } = makeMapper({ pieceMapper });
    const event = makeInfraEvent();
    mapper.toDomain(event);
    expect(pieceMapper.toDomain).toHaveBeenCalledWith(event.bot);
  });

  it("calls pieceMapper.toDomain with event.to.bot", () => {
    const pieceMapper = makePieceMapper();
    const { mapper } = makeMapper({ pieceMapper });
    const event = makeInfraEvent();
    mapper.toDomain(event);
    expect(pieceMapper.toDomain).toHaveBeenCalledWith(event.to.bot);
  });

  it("calls pieceMapper.toDomain exactly twice", () => {
    const pieceMapper = makePieceMapper();
    const { mapper } = makeMapper({ pieceMapper });
    mapper.toDomain(makeInfraEvent());
    expect(pieceMapper.toDomain).toHaveBeenCalledTimes(2);
  });

  it("maps piece from the first toDomain call result", () => {
    const piece = makePiece({ id: "main-piece" });
    const pieceMapper = makePieceMapper();
    pieceMapper.toDomain
      .mockReturnValueOnce(piece)
      .mockReturnValueOnce(makePiece());
    const { mapper } = makeMapper({ pieceMapper });
    expect(mapper.toDomain(makeInfraEvent()).piece).toBe(piece);
  });

  it("maps to.piece from the second toDomain call result", () => {
    const toPiece = makePiece({ id: "to-piece" });
    const pieceMapper = makePieceMapper();
    pieceMapper.toDomain
      .mockReturnValueOnce(makePiece())
      .mockReturnValueOnce(toPiece);
    const { mapper } = makeMapper({ pieceMapper });
    expect(mapper.toDomain(makeInfraEvent()).to.piece).toBe(toPiece);
  });

  it("maps to.x from event.to.x", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(
        makeInfraEvent({ to: { bot: makeBot(), x: 7, y: 0, dimension: "d" } })
      ).to.x
    ).toBe(7);
  });

  it("maps to.y from event.to.y", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(
        makeInfraEvent({ to: { bot: makeBot(), x: 0, y: 9, dimension: "d" } })
      ).to.y
    ).toBe(9);
  });

  it("maps from.x from event.from.x", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeInfraEvent({ from: { x: 4, y: 0, dimension: "d" } }))
        .from.x
    ).toBe(4);
  });

  it("maps from.y from event.from.y", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toDomain(makeInfraEvent({ from: { x: 0, y: 5, dimension: "d" } }))
        .from.y
    ).toBe(5);
  });

  it("does not include dimension in the domain from object", () => {
    const { mapper } = makeMapper();
    const result = mapper.toDomain(makeInfraEvent()) as any;
    expect(result.from.dimension).toBeUndefined();
  });

  it("does not include dimension in the domain to object", () => {
    const { mapper } = makeMapper();
    const result = mapper.toDomain(makeInfraEvent()) as any;
    expect(result.to.dimension).toBeUndefined();
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls pieceMapper.toInfrastructure with event.piece", () => {
    const pieceMapper = makePieceMapper();
    const { mapper } = makeMapper({ pieceMapper });
    const event = makeDomainEvent();
    mapper.toInfrastructure(event);
    expect(pieceMapper.toInfrastructure).toHaveBeenCalledWith(event.piece);
  });

  it("calls pieceMapper.toInfrastructure with event.to.piece", () => {
    const pieceMapper = makePieceMapper();
    const { mapper } = makeMapper({ pieceMapper });
    const event = makeDomainEvent();
    mapper.toInfrastructure(event);
    expect(pieceMapper.toInfrastructure).toHaveBeenCalledWith(event.to.piece);
  });

  it("calls pieceMapper.toInfrastructure exactly twice", () => {
    const pieceMapper = makePieceMapper();
    const { mapper } = makeMapper({ pieceMapper });
    mapper.toInfrastructure(makeDomainEvent());
    expect(pieceMapper.toInfrastructure).toHaveBeenCalledTimes(2);
  });

  it("calls dimensionPort.getCurrentDimension", () => {
    const dimensionPort = makeDimensionPort();
    const { mapper } = makeMapper({ dimensionPort });
    mapper.toInfrastructure(makeDomainEvent());
    expect(dimensionPort.getCurrentDimension).toHaveBeenCalled();
  });

  it("sets bot from the first toInfrastructure call result", () => {
    const bot = makeBot({ id: "infra-bot" });
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure
      .mockReturnValueOnce(bot)
      .mockReturnValueOnce(makeBot());
    const { mapper } = makeMapper({ pieceMapper });
    expect(mapper.toInfrastructure(makeDomainEvent()).bot).toBe(bot);
  });

  it("sets to.bot from the second toInfrastructure call result", () => {
    const toBot = makeBot({ id: "to-infra-bot" });
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure
      .mockReturnValueOnce(makeBot())
      .mockReturnValueOnce(toBot);
    const { mapper } = makeMapper({ pieceMapper });
    expect(mapper.toInfrastructure(makeDomainEvent()).to.bot).toBe(toBot);
  });

  it("sets to.x from event.to.x", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toInfrastructure(
        makeDomainEvent({ to: { piece: makePiece(), x: 11, y: 0 } })
      ).to.x
    ).toBe(11);
  });

  it("sets to.y from event.to.y", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toInfrastructure(
        makeDomainEvent({ to: { piece: makePiece(), x: 0, y: 13 } })
      ).to.y
    ).toBe(13);
  });

  it("sets to.dimension from getCurrentDimension", () => {
    const dimensionPort = makeDimensionPort("canvas-dim");
    const { mapper } = makeMapper({ dimensionPort });
    expect(mapper.toInfrastructure(makeDomainEvent()).to.dimension).toBe(
      "canvas-dim"
    );
  });

  it("sets from.x from event.from.x", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toInfrastructure(makeDomainEvent({ from: { x: 6, y: 0 } })).from.x
    ).toBe(6);
  });

  it("sets from.y from event.from.y", () => {
    const { mapper } = makeMapper();
    expect(
      mapper.toInfrastructure(makeDomainEvent({ from: { x: 0, y: 8 } })).from.y
    ).toBe(8);
  });

  it("sets from.dimension from getCurrentDimension", () => {
    const dimensionPort = makeDimensionPort("from-dim");
    const { mapper } = makeMapper({ dimensionPort });
    expect(mapper.toInfrastructure(makeDomainEvent()).from.dimension).toBe(
      "from-dim"
    );
  });

  it("throws when bot is not found (toInfrastructure returns undefined for piece)", () => {
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure.mockReturnValueOnce(undefined);
    const { mapper } = makeMapper({ pieceMapper });
    expect(() => mapper.toInfrastructure(makeDomainEvent())).toThrow(
      "DraggingEventMapper: bot not found at toInfrastructure."
    );
  });

  it("throws when bot is not found (toInfrastructure returns null for piece)", () => {
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure.mockReturnValueOnce(null);
    const { mapper } = makeMapper({ pieceMapper });
    expect(() => mapper.toInfrastructure(makeDomainEvent())).toThrow(
      "DraggingEventMapper: bot not found at toInfrastructure."
    );
  });

  it("throws when botTo is not found (toInfrastructure returns undefined for to.piece)", () => {
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure
      .mockReturnValueOnce(makeBot())
      .mockReturnValueOnce(undefined);
    const { mapper } = makeMapper({ pieceMapper });
    expect(() => mapper.toInfrastructure(makeDomainEvent())).toThrow(
      "DraggingEventMapper: botTo not found at toInfrastructure."
    );
  });

  it("throws when botTo is not found (toInfrastructure returns null for to.piece)", () => {
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure
      .mockReturnValueOnce(makeBot())
      .mockReturnValueOnce(null);
    const { mapper } = makeMapper({ pieceMapper });
    expect(() => mapper.toInfrastructure(makeDomainEvent())).toThrow(
      "DraggingEventMapper: botTo not found at toInfrastructure."
    );
  });

  it("calls getCurrentDimension before checking bot validity", () => {
    const pieceMapper = makePieceMapper();
    pieceMapper.toInfrastructure.mockReturnValue(undefined);
    const dimensionPort = makeDimensionPort();
    const { mapper } = makeMapper({ pieceMapper, dimensionPort });
    try {
      mapper.toInfrastructure(makeDomainEvent());
    } catch {}
    expect(dimensionPort.getCurrentDimension).toHaveBeenCalledTimes(1);
  });
});
