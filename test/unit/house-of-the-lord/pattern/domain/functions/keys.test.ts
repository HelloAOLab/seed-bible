import { describe, it, expect } from "vitest";
import {
  ToExperienceKey,
  ToPieceKeyOf,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/functions/keys";
import { EXPERIENCE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import { TABERNACLE_PIECE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/piece";

describe("domain.functions.keys.ToExperienceKey", () => {
  it("accepts a known experience key", () => {
    expect(ToExperienceKey(EXPERIENCE_KEYS.TABERNACLE)).toBe(
      EXPERIENCE_KEYS.TABERNACLE
    );
  });

  it("rejects an unknown string", () => {
    expect(ToExperienceKey("temple")).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(ToExperienceKey(42)).toBeNull();
    expect(ToExperienceKey(null)).toBeNull();
    expect(ToExperienceKey(undefined)).toBeNull();
    expect(
      ToExperienceKey({ experience: EXPERIENCE_KEYS.TABERNACLE })
    ).toBeNull();
  });
});

describe("domain.functions.keys.ToPieceKeyOf", () => {
  const experience = EXPERIENCE_KEYS.TABERNACLE;
  const validKey = TABERNACLE_PIECE_KEYS.ALTAR_OF_SACRIFICE;

  it("accepts a piece key that belongs to the experience", () => {
    expect(ToPieceKeyOf(experience, validKey)).toBe(validKey);
  });

  it("rejects a string that is not a piece of the experience", () => {
    expect(ToPieceKeyOf(experience, "not-a-piece")).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(ToPieceKeyOf(experience, 42)).toBeNull();
    expect(ToPieceKeyOf(experience, null)).toBeNull();
    expect(ToPieceKeyOf(experience, undefined)).toBeNull();
  });
});
