import { describe, expect, it, vi, beforeEach, type Mocked } from "vitest";
import { ScriptureInteractionService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/ScriptureInteractionService";
import type { PieceFocusPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/PieceFocus";
import type { ExperienceServicePort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/experience";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import { TABERNACLE_PIECE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";

describe("application.services.ScriptureInteractionService", () => {
  let service: ScriptureInteractionService;
  let pieceFocusPort: Mocked<PieceFocusPort>;
  let experienceServicePort: Mocked<ExperienceServicePort>;

  const experience = EXPERIENCE_KEYS.TABERNACLE;
  // The pattern's domain has a single experience today, so the swap path is
  // exercised with a fabricated key; the collaborators treat it opaquely.
  const otherExperience = "second-experience" as unknown as ExperienceKey;
  const pieceKey = TABERNACLE_PIECE_KEYS.MENORAH;
  const otherPieceKey = TABERNACLE_PIECE_KEYS.ARK_OF_COVENANT;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** Hands back a `tryDisplayExperience` that stays pending until released. */
  function holdDisplayUntilReleased() {
    let release: (displayed: boolean) => void = () => {};
    experienceServicePort.tryDisplayExperience.mockReturnValue(
      new Promise<boolean>((resolve) => {
        release = resolve;
      })
    );
    return (displayed: boolean) => release(displayed);
  }

  beforeEach(() => {
    pieceFocusPort = {
      focus: vi.fn(),
      clearFocus: vi.fn(),
    };
    experienceServicePort = {
      tryDisplayExperience: vi.fn(),
      experience,
    };
    experienceServicePort.tryDisplayExperience.mockResolvedValue(true);
    service = new ScriptureInteractionService({
      pieceFocusPort,
      experienceServicePort,
    });
  });

  it("focuses the piece when the experience is already on stage", async () => {
    await service.handlePieceFocusRequest(experience, pieceKey);

    expect(pieceFocusPort.focus).toHaveBeenCalledWith(pieceKey);
  });

  it("waits for an in-flight mount instead of focusing during it", async () => {
    const release = holdDisplayUntilReleased();

    const pending = service.handlePieceFocusRequest(experience, pieceKey);
    await flush();

    expect(pieceFocusPort.focus).not.toHaveBeenCalled();

    release(true);
    await pending;

    expect(pieceFocusPort.focus).toHaveBeenCalledWith(pieceKey);
  });

  it("focuses after a swap from another experience completes", async () => {
    experienceServicePort.experience = otherExperience;
    experienceServicePort.tryDisplayExperience.mockImplementation(
      async (requested) => {
        experienceServicePort.experience = requested;
        return true;
      }
    );

    await service.handlePieceFocusRequest(experience, pieceKey);

    expect(experienceServicePort.tryDisplayExperience).toHaveBeenCalledWith(
      experience
    );
    expect(pieceFocusPort.focus).toHaveBeenCalledWith(pieceKey);
  });

  it("does not focus when the experience fails to display", async () => {
    experienceServicePort.tryDisplayExperience.mockResolvedValue(false);

    await service.handlePieceFocusRequest(experience, pieceKey);

    expect(pieceFocusPort.focus).not.toHaveBeenCalled();
  });

  it("focuses only the newest piece when two requests wait on the same mount", async () => {
    const release = holdDisplayUntilReleased();

    const first = service.handlePieceFocusRequest(experience, pieceKey);
    const second = service.handlePieceFocusRequest(experience, otherPieceKey);

    release(true);
    await Promise.all([first, second]);

    expect(pieceFocusPort.focus).toHaveBeenCalledTimes(1);
    expect(pieceFocusPort.focus).toHaveBeenCalledWith(otherPieceKey);
  });

  it("focuses once when the same piece is requested twice while waiting", async () => {
    const release = holdDisplayUntilReleased();

    const first = service.handlePieceFocusRequest(experience, pieceKey);
    const second = service.handlePieceFocusRequest(experience, pieceKey);

    release(true);
    await Promise.all([first, second]);

    expect(pieceFocusPort.focus).toHaveBeenCalledTimes(1);
    expect(pieceFocusPort.focus).toHaveBeenCalledWith(pieceKey);
  });

  it("focuses a later request made after an earlier one already settled", async () => {
    await service.handlePieceFocusRequest(experience, pieceKey);
    await service.handlePieceFocusRequest(experience, otherPieceKey);

    expect(pieceFocusPort.focus).toHaveBeenNthCalledWith(1, pieceKey);
    expect(pieceFocusPort.focus).toHaveBeenNthCalledWith(2, otherPieceKey);
  });

  it("does not focus when the stage changed while it waited", async () => {
    const release = holdDisplayUntilReleased();

    const pending = service.handlePieceFocusRequest(experience, pieceKey);
    experienceServicePort.experience = otherExperience;
    release(true);
    await pending;

    expect(pieceFocusPort.focus).not.toHaveBeenCalled();
  });
});
