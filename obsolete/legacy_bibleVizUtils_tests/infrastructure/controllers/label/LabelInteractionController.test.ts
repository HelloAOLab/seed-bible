import { LabelInteractionController } from "bibleVizUtils.infrastructure.controllers.label.LabelInteractionController";

jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper");

import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";

// ─── factories ────────────────────────────────────────────────────────────────

const makeServicePort = () => ({
  handleLabelTailClick: jest.fn(),
  handleLabelTextClick: jest.fn(),
});

const makeTailBot = (): any => ({ id: "tail-bot-1" });
const makeTextBot = (): any => ({ id: "text-bot-1" });
const makeTailPiece = (): any => ({
  type: "InfoLabelTail",
  id: "piece-tail-1",
});
const makeTextPiece = (): any => ({
  type: "InfoLabelText",
  id: "piece-text-1",
});

const makeInfoLabelTextMapper = () => ({
  toDomain: jest.fn().mockReturnValue(makeTextPiece()),
});

const makeController = (
  servicePort = makeServicePort(),
  infoLabelTextMapper = makeInfoLabelTextMapper()
) =>
  new LabelInteractionController({
    labelInteractionServicePort: servicePort,
    infoLabelTextMapperPort: infoLabelTextMapper,
  });

beforeEach(() => {
  jest.clearAllMocks();
  (InfoLabelTailMapper.toDomain as jest.Mock).mockReturnValue(makeTailPiece());
});

// ─── handleLabelTailClick ─────────────────────────────────────────────────────

describe("handleLabelTailClick", () => {
  it("calls InfoLabelTailMapper.toDomain with the provided bot", () => {
    const bot = makeTailBot();
    makeController().handleLabelTailClick(bot);
    expect(InfoLabelTailMapper.toDomain).toHaveBeenCalledWith(bot);
  });

  it("calls InfoLabelTailMapper.toDomain exactly once", () => {
    makeController().handleLabelTailClick(makeTailBot());
    expect(InfoLabelTailMapper.toDomain).toHaveBeenCalledTimes(1);
  });

  it("passes the mapped piece to handleLabelTailClick on the service port", () => {
    const servicePort = makeServicePort();
    const piece = makeTailPiece();
    (InfoLabelTailMapper.toDomain as jest.Mock).mockReturnValue(piece);
    makeController(servicePort).handleLabelTailClick(makeTailBot());
    expect(servicePort.handleLabelTailClick).toHaveBeenCalledWith(piece);
  });

  it("calls service port's handleLabelTailClick exactly once", () => {
    const servicePort = makeServicePort();
    makeController(servicePort).handleLabelTailClick(makeTailBot());
    expect(servicePort.handleLabelTailClick).toHaveBeenCalledTimes(1);
  });

  it("does not call service port's handleLabelTextClick", () => {
    const servicePort = makeServicePort();
    makeController(servicePort).handleLabelTailClick(makeTailBot());
    expect(servicePort.handleLabelTextClick).not.toHaveBeenCalled();
  });

  it("does not call infoLabelTextMapperPort.toDomain", () => {
    const mapper = makeInfoLabelTextMapper();
    makeController(undefined, mapper).handleLabelTailClick(makeTailBot());
    expect(mapper.toDomain).not.toHaveBeenCalled();
  });
});

// ─── handleLabelTextClick ─────────────────────────────────────────────────────

describe("handleLabelTextClick", () => {
  it("calls infoLabelTextMapperPort.toDomain with the provided bot", () => {
    const bot = makeTextBot();
    const mapper = makeInfoLabelTextMapper();
    makeController(undefined, mapper).handleLabelTextClick(bot);
    expect(mapper.toDomain).toHaveBeenCalledWith(bot);
  });

  it("calls infoLabelTextMapperPort.toDomain exactly once", () => {
    const mapper = makeInfoLabelTextMapper();
    makeController(undefined, mapper).handleLabelTextClick(makeTextBot());
    expect(mapper.toDomain).toHaveBeenCalledTimes(1);
  });

  it("passes the mapped piece to handleLabelTextClick on the service port", () => {
    const servicePort = makeServicePort();
    const piece = makeTextPiece();
    const mapper = makeInfoLabelTextMapper();
    mapper.toDomain.mockReturnValue(piece);
    makeController(servicePort, mapper).handleLabelTextClick(makeTextBot());
    expect(servicePort.handleLabelTextClick).toHaveBeenCalledWith(piece);
  });

  it("calls service port's handleLabelTextClick exactly once", () => {
    const servicePort = makeServicePort();
    makeController(servicePort).handleLabelTextClick(makeTextBot());
    expect(servicePort.handleLabelTextClick).toHaveBeenCalledTimes(1);
  });

  it("does not call service port's handleLabelTailClick", () => {
    const servicePort = makeServicePort();
    makeController(servicePort).handleLabelTextClick(makeTextBot());
    expect(servicePort.handleLabelTailClick).not.toHaveBeenCalled();
  });

  it("does not call InfoLabelTailMapper.toDomain", () => {
    makeController().handleLabelTextClick(makeTextBot());
    expect(InfoLabelTailMapper.toDomain).not.toHaveBeenCalled();
  });
});
