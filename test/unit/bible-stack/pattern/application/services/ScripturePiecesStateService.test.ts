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

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ScripturePiecesStateService);
  });
});
