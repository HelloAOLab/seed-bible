import {
  describe,
  expect,
  it,
  vi,
  type Mock,
  type Mocked,
  beforeEach,
} from "vitest";
import { PieceInteractionService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/PieceInteractionService";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import {
  PIECE_VISIBILITY_STATES,
  type Piece,
  type TabernaclePieceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";
import type { PieceFocusPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/PieceFocus";
import type { PiecesProviderAdapterPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/PiecesProviderAdapter";
import type { PieceAdapterPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/PieceAdapter";
import type { LoggerAdapterPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/LoggerAdapter";

describe("application.services.PieceInteractionService", () => {
  let pieceFocusPort: Mocked<PieceFocusPort>;
  let piecesProvider: Mocked<PiecesProviderAdapterPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let loggerPort: Mocked<LoggerAdapterPort>;
  let getExperience: Mocked<() => ExperienceKey>;
  let getPiece: Mock;
  let service: PieceInteractionService;

  const experienceKey = EXPERIENCE_KEYS.TABERNACLE;
  const pieceKey: TabernaclePieceKey = "bars";
  const piece: Piece<TabernaclePieceKey> = { key: pieceKey, id: "bars-id" };

  beforeEach(() => {
    getPiece = vi.fn(() => piece);
    pieceFocusPort = {
      focus: vi.fn(),
      clearFocus: vi.fn(),
    };
    piecesProvider = {
      getPieces: vi.fn(() => [piece]),
      getPiece,
    };
    pieceAdapterPort = {
      setPosition: vi.fn(),
      getCurrentState: vi.fn(() => PIECE_VISIBILITY_STATES.SHOWN),
    };
    loggerPort = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    getExperience = vi.fn(() => experienceKey);
    service = new PieceInteractionService({
      pieceFocusPort,
      piecesProvider,
      pieceAdapterPort,
      loggerPort,
      getExperience,
    });
  });

  it("focuses the piece when it is shown", () => {
    service.handlePieceSelection(pieceKey);

    expect(getPiece).toHaveBeenCalledExactlyOnceWith(experienceKey, pieceKey);
    expect(pieceFocusPort.focus).toHaveBeenCalledExactlyOnceWith(pieceKey);
  });

  it("does not focus a translucent piece", () => {
    pieceAdapterPort.getCurrentState.mockImplementation(
      () => PIECE_VISIBILITY_STATES.TRANSLUCENT
    );

    service.handlePieceSelection(pieceKey);

    expect(pieceFocusPort.focus).not.toHaveBeenCalled();
  });

  it("does not focus a hidden piece", () => {
    pieceAdapterPort.getCurrentState.mockImplementation(
      () => PIECE_VISIBILITY_STATES.HIDDEN
    );

    service.handlePieceSelection(pieceKey);

    expect(pieceFocusPort.focus).not.toHaveBeenCalled();
  });

  it("reports an error and focuses nothing when the piece is unknown", () => {
    getPiece.mockReturnValue(undefined);

    service.handlePieceSelection(pieceKey);

    expect(loggerPort.error).toHaveBeenCalledOnce();
    expect(pieceAdapterPort.getCurrentState).not.toHaveBeenCalled();
    expect(pieceFocusPort.focus).not.toHaveBeenCalled();
  });
});
