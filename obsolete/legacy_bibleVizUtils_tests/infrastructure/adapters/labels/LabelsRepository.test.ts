import { LabelsRepository } from "bibleVizUtils.infrastructure.adapters.labels.LabelsRepository";

// ─── globals ──────────────────────────────────────────────────────────────────

let getBotMock: jest.Mock;
let byTagMock: jest.Mock;
let getIDMock: jest.Mock;

beforeEach(() => {
  getBotMock = jest.fn();
  byTagMock = jest
    .fn()
    .mockImplementation((tag: string, value: unknown) => ({ tag, value }));
  getIDMock = jest.fn().mockImplementation((bot: any) => bot?.id ?? "");

  (globalThis as any).getBot = getBotMock;
  (globalThis as any).byTag = byTagMock;
  (globalThis as any).getID = getIDMock;
});

afterEach(() => {
  delete (globalThis as any).getBot;
  delete (globalThis as any).byTag;
  delete (globalThis as any).getID;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeOwner = (id = "owner-1"): any => ({
  id,
  tags: { type: "StackBook" },
});

const makeTransformerBot = (id = "transformer-1"): any => ({
  id,
  tags: {
    type: "InfoLabelTransformer",
    isInUse: true,
    isInfoLabelTransformer: true,
  },
});

// ─── getLabelTransformerByOwner ───────────────────────────────────────────────

describe("getLabelTransformerByOwner", () => {
  it("returns the bot from getBot", () => {
    const transformer = makeTransformerBot();
    getBotMock.mockReturnValue(transformer);
    const result = LabelsRepository.getLabelTransformerByOwner(makeOwner());
    expect(result).toBe(transformer);
  });

  it("returns undefined when getBot finds no match", () => {
    getBotMock.mockReturnValue(undefined);
    expect(
      LabelsRepository.getLabelTransformerByOwner(makeOwner())
    ).toBeUndefined();
  });

  it("calls getID with the owner bot to resolve its id", () => {
    const owner = makeOwner("my-owner");
    LabelsRepository.getLabelTransformerByOwner(owner);
    expect(getIDMock).toHaveBeenCalledWith(owner);
  });

  it("passes a byTag filter for ownerBotId matching the owner's id", () => {
    const owner = makeOwner("resolved-id");
    getIDMock.mockReturnValue("resolved-id");
    LabelsRepository.getLabelTransformerByOwner(owner);
    expect(byTagMock).toHaveBeenCalledWith("ownerBotId", "resolved-id");
  });

  it("passes a byTag filter for isInfoLabelTransformer=true", () => {
    LabelsRepository.getLabelTransformerByOwner(makeOwner());
    expect(byTagMock).toHaveBeenCalledWith("isInfoLabelTransformer", true);
  });

  it("passes a byTag filter for isInUse=true", () => {
    LabelsRepository.getLabelTransformerByOwner(makeOwner());
    expect(byTagMock).toHaveBeenCalledWith("isInUse", true);
  });

  it("calls getBot with all three byTag filters", () => {
    LabelsRepository.getLabelTransformerByOwner(makeOwner());
    expect(getBotMock).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "ownerBotId" }),
      expect.objectContaining({ tag: "isInfoLabelTransformer" }),
      expect.objectContaining({ tag: "isInUse" })
    );
  });

  it("calls getBot exactly once per invocation", () => {
    LabelsRepository.getLabelTransformerByOwner(makeOwner());
    expect(getBotMock).toHaveBeenCalledTimes(1);
  });

  it("uses the id returned by getID — not a property read on the owner", () => {
    const owner = makeOwner("ignored");
    getIDMock.mockReturnValue("computed-id");
    LabelsRepository.getLabelTransformerByOwner(owner);
    const ownerBotIdCall = byTagMock.mock.calls.find(
      ([tag]: [string]) => tag === "ownerBotId"
    );
    expect(ownerBotIdCall?.[1]).toBe("computed-id");
  });
});
