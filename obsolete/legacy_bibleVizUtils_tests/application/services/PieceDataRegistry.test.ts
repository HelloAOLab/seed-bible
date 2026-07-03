import { PieceDataRegistry } from "bibleVizUtils.application.services.PieceDataRegistry";
import type {
  GetPieceData,
  GetAllPiecesDataByType,
} from "bibleVizUtils.domain.models.pieceData";

// ─── factory ─────────────────────────────────────────────────────────────────

const makeRegistry = () => new PieceDataRegistry();

const makeProvider = (
  pieceDataResult: any = { id: "stub" },
  allDataResult: any[] = []
) => ({
  getPieceData: jest
    .fn()
    .mockReturnValue(pieceDataResult) as unknown as GetPieceData,
  getAllPiecesDataByType: jest
    .fn()
    .mockReturnValue(allDataResult) as unknown as GetAllPiecesDataByType,
});

// ─── registerProvider ─────────────────────────────────────────────────────────

describe("registerProvider", () => {
  it("registers a provider such that getPieceData delegates to it", () => {
    const registry = makeRegistry();
    const { getPieceData, getAllPiecesDataByType } = makeProvider();
    registry.registerProvider(
      "StackBook",
      getPieceData,
      getAllPiecesDataByType
    );
    registry.getPieceData({ pieceType: "StackBook", pieceId: "b-1" });
    expect(getPieceData).toHaveBeenCalledWith({
      pieceType: "StackBook",
      pieceId: "b-1",
    });
  });

  it("registers a provider such that getAllPiecesDataByType delegates to it", () => {
    const registry = makeRegistry();
    const { getPieceData, getAllPiecesDataByType } = makeProvider();
    registry.registerProvider(
      "StackBook",
      getPieceData,
      getAllPiecesDataByType
    );
    registry.getAllPiecesDataByType("StackBook");
    expect(getAllPiecesDataByType).toHaveBeenCalledWith("StackBook");
  });

  it("can register multiple different types independently", () => {
    const registry = makeRegistry();
    const bookProvider = makeProvider({ id: "book-data" });
    const chapterProvider = makeProvider({ id: "chapter-data" });
    registry.registerProvider(
      "StackBook",
      bookProvider.getPieceData,
      bookProvider.getAllPiecesDataByType
    );
    registry.registerProvider(
      "StackChapter",
      chapterProvider.getPieceData,
      chapterProvider.getAllPiecesDataByType
    );
    registry.getPieceData({ pieceType: "StackBook", pieceId: "b-1" });
    registry.getPieceData({ pieceType: "StackChapter", pieceId: "c-1" });
    expect(bookProvider.getPieceData).toHaveBeenCalledTimes(1);
    expect(chapterProvider.getPieceData).toHaveBeenCalledTimes(1);
  });

  it("overwriting an existing provider replaces it — subsequent calls use the new provider", () => {
    const registry = makeRegistry();
    const first = makeProvider({ id: "first" });
    const second = makeProvider({ id: "second" });
    registry.registerProvider(
      "StackBook",
      first.getPieceData,
      first.getAllPiecesDataByType
    );
    registry.registerProvider(
      "StackBook",
      second.getPieceData,
      second.getAllPiecesDataByType
    );
    registry.getPieceData({ pieceType: "StackBook", pieceId: "b-1" });
    expect(first.getPieceData).not.toHaveBeenCalled();
    expect(second.getPieceData).toHaveBeenCalled();
  });
});

// ─── getPieceData ─────────────────────────────────────────────────────────────

describe("getPieceData", () => {
  it("throws when pieceType is not provided (undefined)", () => {
    const registry = makeRegistry();
    expect(() =>
      registry.getPieceData({ pieceType: undefined as any, pieceId: "x" })
    ).toThrow("PieceDataRegistry: typeOfPiece not defined");
  });

  it("throws when pieceType is an empty string", () => {
    const registry = makeRegistry();
    expect(() =>
      registry.getPieceData({ pieceType: "" as any, pieceId: "x" })
    ).toThrow("PieceDataRegistry: typeOfPiece not defined");
  });

  it("throws when no provider is registered for the requested type", () => {
    const registry = makeRegistry();
    expect(() =>
      registry.getPieceData({ pieceType: "StackBook", pieceId: "b-1" })
    ).toThrow(
      "PieceDataRegistry: No PieceData provider registered for typeOfPiece: StackBook"
    );
  });

  it("includes the missing type name in the error message", () => {
    const registry = makeRegistry();
    expect(() =>
      registry.getPieceData({ pieceType: "StackChapter", pieceId: "c-1" })
    ).toThrow("StackChapter");
  });

  it("returns the value from the provider's getPieceData", () => {
    const registry = makeRegistry();
    const expected = { id: "book-42", type: "StackBook" };
    const { getPieceData, getAllPiecesDataByType } = makeProvider(expected);
    registry.registerProvider(
      "StackBook",
      getPieceData,
      getAllPiecesDataByType
    );
    const result = registry.getPieceData({
      pieceType: "StackBook",
      pieceId: "book-42",
    });
    expect(result).toBe(expected);
  });

  it("forwards the full params object to the provider", () => {
    const registry = makeRegistry();
    const { getPieceData, getAllPiecesDataByType } = makeProvider();
    registry.registerProvider(
      "StackBook",
      getPieceData,
      getAllPiecesDataByType
    );
    const params = { pieceType: "StackBook" as const, pieceId: "b-99" };
    registry.getPieceData(params);
    expect(getPieceData).toHaveBeenCalledWith(params);
  });

  it("calls only the provider registered for the matching type — not others", () => {
    const registry = makeRegistry();
    const bookProvider = makeProvider();
    const chapterProvider = makeProvider();
    registry.registerProvider(
      "StackBook",
      bookProvider.getPieceData,
      bookProvider.getAllPiecesDataByType
    );
    registry.registerProvider(
      "StackChapter",
      chapterProvider.getPieceData,
      chapterProvider.getAllPiecesDataByType
    );
    registry.getPieceData({ pieceType: "StackBook", pieceId: "b-1" });
    expect(bookProvider.getPieceData).toHaveBeenCalled();
    expect(chapterProvider.getPieceData).not.toHaveBeenCalled();
  });
});

// ─── getAllPiecesDataByType ────────────────────────────────────────────────────

describe("getAllPiecesDataByType", () => {
  it("returns [] when no provider is registered for the type", () => {
    const registry = makeRegistry();
    expect(registry.getAllPiecesDataByType("StackBook")).toEqual([]);
  });

  it("returns the result from the provider's getAllPiecesDataByType", () => {
    const registry = makeRegistry();
    const items = [{ id: "b-1" }, { id: "b-2" }];
    const { getPieceData, getAllPiecesDataByType } = makeProvider(
      undefined,
      items
    );
    registry.registerProvider(
      "StackBook",
      getPieceData,
      getAllPiecesDataByType
    );
    const result = registry.getAllPiecesDataByType("StackBook");
    expect(result).toBe(items);
  });

  it("passes the type argument to the provider", () => {
    const registry = makeRegistry();
    const { getPieceData, getAllPiecesDataByType } = makeProvider();
    registry.registerProvider(
      "StackChapter",
      getPieceData,
      getAllPiecesDataByType
    );
    registry.getAllPiecesDataByType("StackChapter");
    expect(getAllPiecesDataByType).toHaveBeenCalledWith("StackChapter");
  });

  it("calls only the provider registered for the matching type — not others", () => {
    const registry = makeRegistry();
    const bookProvider = makeProvider();
    const chapterProvider = makeProvider();
    registry.registerProvider(
      "StackBook",
      bookProvider.getPieceData,
      bookProvider.getAllPiecesDataByType
    );
    registry.registerProvider(
      "StackChapter",
      chapterProvider.getPieceData,
      chapterProvider.getAllPiecesDataByType
    );
    registry.getAllPiecesDataByType("StackBook");
    expect(bookProvider.getAllPiecesDataByType).toHaveBeenCalled();
    expect(chapterProvider.getAllPiecesDataByType).not.toHaveBeenCalled();
  });

  it("returns [] for a type that had its provider replaced before the replacement was registered", () => {
    const registry = makeRegistry();
    // No provider registered for LayoutBook — should still return []
    expect(registry.getAllPiecesDataByType("LayoutBook")).toEqual([]);
  });
});
