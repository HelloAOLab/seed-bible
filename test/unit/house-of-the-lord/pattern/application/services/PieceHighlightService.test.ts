import { describe, expect, it, vi, beforeEach, type Mocked } from "vitest";
import { PieceHighlightService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/PieceHighlightService";
import type { PieceHighlightAdapterPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/PieceHighlight";
import type { ExperienceServicePort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/experience";
import { EXPERIENCE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import { TABERNACLE_PIECE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";

describe("application.services.PieceHighlightService", () => {
  let service: PieceHighlightService;
  let pieceHighlight: Mocked<PieceHighlightAdapterPort>;
  let experienceService: Mocked<ExperienceServicePort>;

  const experience = EXPERIENCE_KEYS.TABERNACLE;
  const pieceKey = TABERNACLE_PIECE_KEYS.MENORAH;

  beforeEach(() => {
    pieceHighlight = {
      highlight: vi.fn(),
      stopHighlight: vi.fn(),
    };
    experienceService = {
      tryDisplayExperience: vi.fn(),
      experience,
    };
    service = new PieceHighlightService({
      experienceService,
      pieceHighlight,
    });
  });

  it("highlights the piece against the experience on stage", () => {
    service.highlight(pieceKey);

    expect(pieceHighlight.highlight).toHaveBeenCalledWith(experience, pieceKey);
  });

  it("does not highlight when no experience is on stage", () => {
    experienceService.experience = null;

    service.highlight(pieceKey);

    expect(pieceHighlight.highlight).not.toHaveBeenCalled();
  });

  it("stopHighlight() clears the highlight regardless of the experience", () => {
    service.stopHighlight();

    expect(pieceHighlight.stopHighlight).toHaveBeenCalledTimes(1);

    experienceService.experience = null;
    service.stopHighlight();

    expect(pieceHighlight.stopHighlight).toHaveBeenCalledTimes(2);
  });
});
