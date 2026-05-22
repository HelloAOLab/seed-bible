import { LabelInteractionController } from "bibleVizUtils.infrastructure.controllers.label.LabelInteractionController";

jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper");
jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper");

import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import { InfoLabelTextMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper";

// ─── factories ────────────────────────────────────────────────────────────────

const makeServicePort = () => ({
  handleLabelTailClick: jest.fn(),
  handleLabelTextClick: jest.fn(),
});

const makeController = (servicePort = makeServicePort()) =>
  new LabelInteractionController({ labelInteractionServicePort: servicePort });

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

beforeEach(() => {
  jest.clearAllMocks();
  (InfoLabelTailMapper.toDomain as jest.Mock).mockReturnValue(makeTailPiece());
  (InfoLabelTextMapper.toDomain as jest.Mock).mockReturnValue(makeTextPiece());
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

  it("does not call InfoLabelTextMapper.toDomain", () => {
    makeController().handleLabelTailClick(makeTailBot());
    expect(InfoLabelTextMapper.toDomain).not.toHaveBeenCalled();
  });
});

// ─── handleLabelTextClick ─────────────────────────────────────────────────────

describe("handleLabelTextClick", () => {
  it("calls InfoLabelTextMapper.toDomain with the provided bot", () => {
    const bot = makeTextBot();
    makeController().handleLabelTextClick(bot);
    expect(InfoLabelTextMapper.toDomain).toHaveBeenCalledWith(bot);
  });

  it("calls InfoLabelTextMapper.toDomain exactly once", () => {
    makeController().handleLabelTextClick(makeTextBot());
    expect(InfoLabelTextMapper.toDomain).toHaveBeenCalledTimes(1);
  });

  it("passes the mapped piece to handleLabelTextClick on the service port", () => {
    const servicePort = makeServicePort();
    const piece = makeTextPiece();
    (InfoLabelTextMapper.toDomain as jest.Mock).mockReturnValue(piece);
    makeController(servicePort).handleLabelTextClick(makeTextBot());
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
