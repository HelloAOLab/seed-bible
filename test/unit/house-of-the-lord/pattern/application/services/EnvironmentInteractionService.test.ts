import { describe, expect, it, vi } from "vitest";
import { EnvironmentInteractionService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/EnvironmentInteractionService";
import type { PieceHighlightPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/PieceHighlight";
import type { NavMenuStatePort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/NavMenuState";

describe("application.services.EnvironmentInteractionService", () => {
  it("stops the highlight and clears the menu selection on blur", () => {
    const pieceHighlight = {
      stopHighlight: vi.fn(),
      highlight: vi.fn(),
    } satisfies PieceHighlightPort;
    const navMenuStatePort = {
      getState: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
      toggle: vi.fn(),
      selectPiece: vi.fn(),
      showPieceList: vi.fn(),
      clearSelection: vi.fn(),
      reset: vi.fn(),
      setExperience: vi.fn(),
      setReading: vi.fn(),
    } satisfies NavMenuStatePort;
    const service = new EnvironmentInteractionService({
      pieceHighlight,
      navMenuStatePort,
    });

    service.handleBlur();

    expect(pieceHighlight.stopHighlight).toHaveBeenCalledOnce();
    expect(navMenuStatePort.clearSelection).toHaveBeenCalledOnce();
  });

  it("leaves the menu open and keeps every other piece visible on blur", () => {
    const pieceHighlight = {
      stopHighlight: vi.fn(),
      highlight: vi.fn(),
    } satisfies PieceHighlightPort;
    const navMenuStatePort = {
      getState: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
      toggle: vi.fn(),
      selectPiece: vi.fn(),
      showPieceList: vi.fn(),
      clearSelection: vi.fn(),
      reset: vi.fn(),
      setExperience: vi.fn(),
      setReading: vi.fn(),
    } satisfies NavMenuStatePort;
    const service = new EnvironmentInteractionService({
      pieceHighlight,
      navMenuStatePort,
    });

    service.handleBlur();

    expect(navMenuStatePort.close).not.toHaveBeenCalled();
    expect(navMenuStatePort.reset).not.toHaveBeenCalled();
  });
});
