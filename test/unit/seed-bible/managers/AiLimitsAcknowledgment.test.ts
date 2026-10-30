import { signal } from "@preact/signals";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  AI_LIMITS_ACKNOWLEDGMENT_VERSION,
  PROFILE_AI_LIMITS_ACKNOWLEDGMENT,
  aiLimitsAcknowledgmentVersion,
  hasCurrentAiLimitsAcknowledgment,
  readAiLimitsAcknowledgment,
  saveAiLimitsAcknowledgment,
} from "@packages/seed-bible/seed-bible/managers/AiLimitsAcknowledgment";

function createTestLogin(initial?: {
  userId?: string | null;
  profile?: UserProfile | null;
  localConfig?: Record<string, unknown>;
}): LoginManager {
  const userId = signal<string | null>(initial?.userId ?? null);
  const profile = signal<UserProfile | null>(initial?.profile ?? null);
  const localConfig = signal<Record<string, unknown>>(
    initial?.localConfig ?? {}
  );
  const updateProfile = (newData: Partial<UserProfile>) => {
    if (!userId.value || !profile.value) {
      return;
    }
    profile.value = { ...profile.value, ...newData };
  };
  return {
    userId,
    profile,
    localConfig,
    profilePromise: null,
    updateProfile,
  } as unknown as LoginManager;
}

describe("AI limits acknowledgment", () => {
  it("reads only an integer version", () => {
    expect(aiLimitsAcknowledgmentVersion(null)).toBeNull();
    expect(aiLimitsAcknowledgmentVersion(undefined)).toBeNull();
    expect(aiLimitsAcknowledgmentVersion({})).toBeNull();
    expect(aiLimitsAcknowledgmentVersion({ version: "1" })).toBeNull();
    expect(aiLimitsAcknowledgmentVersion({ version: 1.5 })).toBeNull();
    expect(aiLimitsAcknowledgmentVersion({ version: 1 })).toBe(1);
    expect(aiLimitsAcknowledgmentVersion({ version: 0 })).toBe(0);
  });

  it("treats the current version as accepted and an older one as not", () => {
    expect(
      hasCurrentAiLimitsAcknowledgment({
        version: AI_LIMITS_ACKNOWLEDGMENT_VERSION,
      })
    ).toBe(true);
    expect(
      hasCurrentAiLimitsAcknowledgment({
        version: AI_LIMITS_ACKNOWLEDGMENT_VERSION - 1,
      })
    ).toBe(false);
    expect(hasCurrentAiLimitsAcknowledgment(null)).toBe(false);
  });

  it("asks again when the required version is raised above the saved one", () => {
    expect(hasCurrentAiLimitsAcknowledgment({ version: 1 }, 1)).toBe(true);
    expect(hasCurrentAiLimitsAcknowledgment({ version: 1 }, 2)).toBe(false);
    expect(hasCurrentAiLimitsAcknowledgment({ version: 2 }, 2)).toBe(true);
  });

  it("reads the account profile when someone is signed in", () => {
    const login = createTestLogin({
      userId: "user-1",
      profile: {
        name: "Me",
        config: {
          [PROFILE_AI_LIMITS_ACKNOWLEDGMENT]: { version: 1 },
        },
      },
      localConfig: {
        [PROFILE_AI_LIMITS_ACKNOWLEDGMENT]: { version: 0 },
      },
    });

    expect(readAiLimitsAcknowledgment(login)).toEqual({ version: 1 });
  });

  it("does not inherit a device-local acknowledgment for a signed-in account", () => {
    const login = createTestLogin({
      userId: "user-1",
      profile: { name: "Me", config: {} },
      localConfig: {
        [PROFILE_AI_LIMITS_ACKNOWLEDGMENT]: {
          version: AI_LIMITS_ACKNOWLEDGMENT_VERSION,
        },
      },
    });

    expect(readAiLimitsAcknowledgment(login)).toBeUndefined();
  });

  it("does not treat a still-loading profile as accepted", () => {
    const login = createTestLogin({
      userId: "user-1",
      profile: null,
      localConfig: {
        [PROFILE_AI_LIMITS_ACKNOWLEDGMENT]: {
          version: AI_LIMITS_ACKNOWLEDGMENT_VERSION,
        },
      },
    });

    expect(readAiLimitsAcknowledgment(login)).toBeNull();
  });

  it("reads the device-local store when nobody is signed in", () => {
    const login = createTestLogin({
      localConfig: {
        [PROFILE_AI_LIMITS_ACKNOWLEDGMENT]: { version: 1 },
      },
    });

    expect(readAiLimitsAcknowledgment(login)).toEqual({ version: 1 });
  });

  it("saves the current version on the profile without dropping other config", () => {
    const login = createTestLogin({
      userId: "user-1",
      profile: { name: "Me", config: { fontSize: "L" } },
    });

    saveAiLimitsAcknowledgment(login);

    expect(login.profile.value?.config).toEqual({
      fontSize: "L",
      [PROFILE_AI_LIMITS_ACKNOWLEDGMENT]: {
        version: AI_LIMITS_ACKNOWLEDGMENT_VERSION,
      },
    });
  });

  it("saves the current version on this device when nobody is signed in", () => {
    const login = createTestLogin();

    saveAiLimitsAcknowledgment(login);

    expect(login.profile.value).toBeNull();
    expect(login.localConfig.value[PROFILE_AI_LIMITS_ACKNOWLEDGMENT]).toEqual({
      version: AI_LIMITS_ACKNOWLEDGMENT_VERSION,
    });
  });
});
