import type { LoginManager } from "./LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "./ProfileConfigSync";

/**
 * Version of the AI-limits acknowledgment a person has to accept before
 * chatting with an agent. Stored on their profile under
 * {@link PROFILE_AI_LIMITS_ACKNOWLEDGMENT}. Bump it when the wording changes
 * enough that everyone should read and accept it again.
 */
export const AI_LIMITS_ACKNOWLEDGMENT_VERSION = 1;

export const PROFILE_AI_LIMITS_ACKNOWLEDGMENT = "aiLimitsAcknowledgment";

export function aiLimitsAcknowledgmentVersion(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const version = (value as { version?: unknown }).version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return null;
  }
  return version;
}

/**
 * True when `value` records an acceptance of `requiredVersion` or anything
 * newer. An older saved version is not enough: raising the required version
 * asks that person again.
 */
export function hasCurrentAiLimitsAcknowledgment(
  value: unknown,
  requiredVersion = AI_LIMITS_ACKNOWLEDGMENT_VERSION
): boolean {
  const version = aiLimitsAcknowledgmentVersion(value);
  return version !== null && version >= requiredVersion;
}

/**
 * The acknowledgment saved for this login.
 *
 * A signed-in account reads only its profile, including when the key is
 * absent, so an anonymous acceptance on this device does not cover a
 * different account. While that profile is still loading, nothing is
 * treated as accepted. Signed-out use reads the device-local store that
 * `saveProfileConfigValue` writes to.
 */
export function readAiLimitsAcknowledgment(login: LoginManager): unknown {
  const userId = login.userId.value;
  if (userId) {
    const profile = login.profile.value;
    if (!profile) {
      return null;
    }
    return getProfileConfigValue(profile, PROFILE_AI_LIMITS_ACKNOWLEDGMENT);
  }
  return login.localConfig.value[PROFILE_AI_LIMITS_ACKNOWLEDGMENT];
}

export function saveAiLimitsAcknowledgment(login: LoginManager): Promise<void> {
  return saveProfileConfigValue(login, PROFILE_AI_LIMITS_ACKNOWLEDGMENT, {
    version: AI_LIMITS_ACKNOWLEDGMENT_VERSION,
  });
}
