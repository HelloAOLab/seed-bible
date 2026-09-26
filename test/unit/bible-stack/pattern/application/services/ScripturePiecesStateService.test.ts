import { describe, it, expect, beforeEach } from "vitest";
import { ScripturePiecesStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePiecesStateService";

describe("pattern.bible-stack.application.services.ScripturePiecesStateService", () => {
  let service: ScripturePiecesStateService;

  beforeEach(() => {
    service = new ScripturePiecesStateService({
      arePiecesDraggable: false,
      shouldShowLabelDates: false,
    });
  });

  describe("resetToDefault", () => {
    it("makes pieces not draggable and label dates not showable", () => {
      service = new ScripturePiecesStateService({
        arePiecesDraggable: true,
        shouldShowLabelDates: true,
      });

      service.resetToDefault();

      expect(service.arePiecesDraggable).toBe(false);
      expect(service.shouldShowLabelDates).toBe(false);
    });
  });

  describe("makePiecesDraggable", () => {
    it("makes pieces draggable", () => {
      service.makePiecesDraggable();

      expect(service.arePiecesDraggable).toBe(true);
    });
  });

  describe("makePiecesNotDraggable", () => {
    it("makes pieces not draggable", () => {
      service.makePiecesDraggable();

      service.makePiecesNotDraggable();

      expect(service.arePiecesDraggable).toBe(false);
    });
  });

  describe("enableLabelDates", () => {
    it("makes pieces label dates showable", () => {
      service.enableLabelDates();

      expect(service.shouldShowLabelDates).toBe(true);
    });
  });

  describe("disableLabelDates", () => {
    it("makes pieces label dates not showable", () => {
      service.enableLabelDates();

      service.disableLabelDates();

      expect(service.shouldShowLabelDates).toBe(false);
    });
  });
});
