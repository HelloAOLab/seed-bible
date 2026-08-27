import { describe, expect, it, vi } from "vitest";
import { EnvironmentInteractionService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/EnvironmentInteractionService";
import type {
  ContextMenuRendererPort,
  PieceHighlightPort,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/EnvironmentInteraction";

describe("application.services.EnvironmentInteractionService", () => {
  it("stops highlight and hides the context menu on blur", () => {
    const pieceHighlight = {
      stopHighlight: vi.fn(),
    } satisfies PieceHighlightPort;
    const contextMenu = {
      hideContextMenu: vi.fn(),
    } satisfies ContextMenuRendererPort;
    const service = new EnvironmentInteractionService({
      pieceHighlight,
      contextMenu,
    });
    service.handleBlur();

    expect(pieceHighlight.stopHighlight).toHaveBeenCalledOnce();
    expect(contextMenu.hideContextMenu).toHaveBeenCalledOnce();
  });
});
