import { LabelInteractionService } from "bibleVizUtils.application.services.LabelInteractionService";
import type { LabelInteractionEventPort } from "bibleVizUtils.domain.ports.label";
import type { LabelDataStorePort } from "bibleVizUtils.domain.ports.piece";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

// ─── factories ────────────────────────────────────────────────────────────────

const makePiece = <T extends Piece["type"]>(
  type: T,
  id = `${type}-1`
): Piece<T> => ({ id, type }) as Piece<T>;

const makeLabelData = (owner: Piece = makePiece("StackBook")) => ({
  owner,
  tail: makePiece("InfoLabelTail", "tail-1"),
  label: makePiece("InfoLabelText", "text-1"),
  transformer: makePiece("InfoLabelTransformer", "transformer-1"),
});

const makeEventPort = (): LabelInteractionEventPort => ({ emit: jest.fn() });

const makeDataStore = (
  overrides: Partial<LabelDataStorePort> = {}
): LabelDataStorePort => ({
  getDataByTailId: jest.fn().mockReturnValue(undefined),
  getDataByTextId: jest.fn().mockReturnValue(undefined),
  getDataByTransformerId: jest.fn().mockReturnValue(undefined),
  getDataByOwnerId: jest.fn().mockReturnValue(undefined),
  addLabelData: jest.fn(),
  removeLabelData: jest.fn(),
  getAllLabelsData: jest.fn().mockReturnValue([]),
  ...overrides,
});

const makeService = (
  overrides: {
    labelInteractionEventPort?: LabelInteractionEventPort;
    labelDataStorePort?: LabelDataStorePort;
  } = {}
) =>
  new LabelInteractionService({
    labelInteractionEventPort: makeEventPort(),
    labelDataStorePort: makeDataStore(),
    ...overrides,
  });

// ─── handleLabelTailClick ─────────────────────────────────────────────────────

describe("handleLabelTailClick", () => {
  it("calls getDataByTailId with the tail piece id", () => {
    const labelDataStorePort = makeDataStore();
    const svc = makeService({ labelDataStorePort });
    const tail = makePiece("InfoLabelTail", "tail-42");
    svc.handleLabelTailClick(tail);
    expect(labelDataStorePort.getDataByTailId).toHaveBeenCalledWith("tail-42");
  });

  it("does not emit when getDataByTailId returns undefined", () => {
    const eventPort = makeEventPort();
    const labelDataStorePort = makeDataStore({
      getDataByTailId: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTailClick(makePiece("InfoLabelTail"));
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("emits OnPieceClick with the label data owner when data is found", () => {
    const eventPort = makeEventPort();
    const owner = makePiece("StackBook", "book-99");
    const data = makeLabelData(owner);
    const labelDataStorePort = makeDataStore({
      getDataByTailId: jest.fn().mockReturnValue(data),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTailClick(makePiece("InfoLabelTail"));
    expect(eventPort.emit).toHaveBeenCalledWith("OnPieceClick", {
      piece: owner,
    });
  });

  it("emits exactly once when data is found", () => {
    const eventPort = makeEventPort();
    const labelDataStorePort = makeDataStore({
      getDataByTailId: jest.fn().mockReturnValue(makeLabelData()),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTailClick(makePiece("InfoLabelTail"));
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("does not call getDataByTextId — only tail lookup is performed", () => {
    const labelDataStorePort = makeDataStore();
    const svc = makeService({ labelDataStorePort });
    svc.handleLabelTailClick(makePiece("InfoLabelTail"));
    expect(labelDataStorePort.getDataByTextId).not.toHaveBeenCalled();
  });
});

// ─── handleLabelTextClick ─────────────────────────────────────────────────────

describe("handleLabelTextClick", () => {
  it("calls getDataByTextId with the text piece id", () => {
    const labelDataStorePort = makeDataStore();
    const svc = makeService({ labelDataStorePort });
    const text = makePiece("InfoLabelText", "text-77");
    svc.handleLabelTextClick(text);
    expect(labelDataStorePort.getDataByTextId).toHaveBeenCalledWith("text-77");
  });

  it("does not emit when getDataByTextId returns undefined", () => {
    const eventPort = makeEventPort();
    const labelDataStorePort = makeDataStore({
      getDataByTextId: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTextClick(makePiece("InfoLabelText"));
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("emits OnPieceClick with the label data owner when data is found", () => {
    const eventPort = makeEventPort();
    const owner = makePiece("StackBook", "book-55");
    const data = makeLabelData(owner);
    const labelDataStorePort = makeDataStore({
      getDataByTextId: jest.fn().mockReturnValue(data),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTextClick(makePiece("InfoLabelText"));
    expect(eventPort.emit).toHaveBeenCalledWith("OnPieceClick", {
      piece: owner,
    });
  });

  it("emits exactly once when data is found", () => {
    const eventPort = makeEventPort();
    const labelDataStorePort = makeDataStore({
      getDataByTextId: jest.fn().mockReturnValue(makeLabelData()),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTextClick(makePiece("InfoLabelText"));
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("does not call getDataByTailId — only text lookup is performed", () => {
    const labelDataStorePort = makeDataStore();
    const svc = makeService({ labelDataStorePort });
    svc.handleLabelTextClick(makePiece("InfoLabelText"));
    expect(labelDataStorePort.getDataByTailId).not.toHaveBeenCalled();
  });
});

// ─── handler independence ─────────────────────────────────────────────────────

describe("handler independence", () => {
  it("tail click and text click use separate store lookups — no cross-calls", () => {
    const labelDataStorePort = makeDataStore({
      getDataByTailId: jest.fn().mockReturnValue(makeLabelData()),
      getDataByTextId: jest.fn().mockReturnValue(makeLabelData()),
    });
    const svc = makeService({ labelDataStorePort });
    svc.handleLabelTailClick(makePiece("InfoLabelTail"));
    svc.handleLabelTextClick(makePiece("InfoLabelText"));
    expect(labelDataStorePort.getDataByTailId).toHaveBeenCalledTimes(1);
    expect(labelDataStorePort.getDataByTextId).toHaveBeenCalledTimes(1);
  });

  it("both handlers emit the same event name — OnPieceClick", () => {
    const eventPort = makeEventPort();
    const owner1 = makePiece("StackBook", "owner-1");
    const owner2 = makePiece("StackBook", "owner-2");
    const labelDataStorePort = makeDataStore({
      getDataByTailId: jest.fn().mockReturnValue(makeLabelData(owner1)),
      getDataByTextId: jest.fn().mockReturnValue(makeLabelData(owner2)),
    });
    const svc = makeService({
      labelInteractionEventPort: eventPort,
      labelDataStorePort,
    });
    svc.handleLabelTailClick(makePiece("InfoLabelTail"));
    svc.handleLabelTextClick(makePiece("InfoLabelText"));
    const calls = (eventPort.emit as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe("OnPieceClick");
    expect(calls[1][0]).toBe("OnPieceClick");
    expect(calls[0][1]).toEqual({ piece: owner1 });
    expect(calls[1][1]).toEqual({ piece: owner2 });
  });
});
