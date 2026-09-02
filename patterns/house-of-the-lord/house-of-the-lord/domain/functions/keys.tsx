import {
  EXPERIENCE_KEYS,
  EXPERIENCE_PIECE_KEYS,
  type ExperienceKey,
  type ExperienceKeyMap,
} from "../models/experience";

const EXPERIENCE_KEY_VALUES: readonly string[] = Object.values(EXPERIENCE_KEYS);

/**
 * Narrows a value that arrived from outside the pattern into a known experience,
 * or null when it is not one. Everything else that gets validated depends on
 * knowing which experience is in play, so this runs first.
 */
export function ToExperienceKey(value: unknown): ExperienceKey | null {
  if (typeof value !== "string") return null;
  return EXPERIENCE_KEY_VALUES.includes(value)
    ? (value as ExperienceKey)
    : null;
}

/**
 * Narrows a value that arrived from outside the pattern into a piece key of the
 * experience currently on stage, or null when it is not one.
 *
 * Which keys are valid depends on the experience, so this takes it rather than
 * checking against a single experience's keys.
 */
export function ToPieceKeyOf<E extends ExperienceKey>(
  experience: E,
  value: unknown
): ExperienceKeyMap[E] | null {
  if (typeof value !== "string") return null;
  const keys: readonly string[] = EXPERIENCE_PIECE_KEYS[experience];
  return keys.includes(value) ? (value as ExperienceKeyMap[E]) : null;
}
