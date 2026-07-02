import { signal } from "@preact/signals";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "@packages/seed-bible/seed-bible/managers/ProfileConfigSync";

/**
 * Builds a minimal LoginManager stub backed by signals, mirroring the real
 * `updateProfile` merge behavior (including its `profile.value ?? { name: "" }`
 * fallback) so tests can exercise the same code path that wipes data.
 */
function createTestLogin(initial?: {
  userId?: string | null;
  profile?: UserProfile | null;
}): LoginManager {
  const userId = signal<string | null>(initial?.userId ?? null);
  const profile = signal<UserProfile | null>(initial?.profile ?? null);
  const updateProfile = (newData: Partial<UserProfile>) => {
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    } as UserProfile;
  };
  return { userId, profile, updateProfile } as unknown as LoginManager;
}

describe("saveProfileConfigValue", () => {
  it("no-ops when the user is not logged in", () => {
    const login = createTestLogin();

    saveProfileConfigValue(login, "fontSize", "large");

    expect(login.profile.value).toBeNull();
  });

  it("does not write, and does not overwrite the profile, while the profile is still loading", () => {
    // userId is set (session restored) but the async profile fetch hasn't
    // resolved yet — this is the exact window in which commit 4e15dad's
    // boot-time extension sync raced the profile load and wiped the account.
    const login = createTestLogin({ userId: "user-1", profile: null });

    saveProfileConfigValue(login, "installedExtensions", ["ext.a"]);

    expect(login.profile.value).toBeNull();
  });

  it("merges into the loaded profile once it's available", () => {
    const login = createTestLogin({
      userId: "user-1",
      profile: {
        name: "Kal",
        location: "Earth",
        config: { fontSize: "small" },
      } as UserProfile,
    });

    saveProfileConfigValue(login, "installedExtensions", ["ext.a"]);

    expect(login.profile.value?.name).toBe("Kal");
    expect(login.profile.value?.location).toBe("Earth");
    expect(getProfileConfigValue(login.profile.value, "fontSize")).toBe(
      "small"
    );
    expect(
      getProfileConfigValue(login.profile.value, "installedExtensions")
    ).toEqual(["ext.a"]);
  });

  it("does not write when the value already matches what's saved", () => {
    const profile = {
      name: "Kal",
      config: { fontSize: "small" },
    } as UserProfile;
    const login = createTestLogin({ userId: "user-1", profile });

    saveProfileConfigValue(login, "fontSize", "small");

    expect(login.profile.value).toBe(profile);
  });
});

describe("getProfileConfigValue", () => {
  it("returns null when the profile hasn't loaded", () => {
    expect(getProfileConfigValue(null, "fontSize")).toBeNull();
  });

  it("returns the value stored under the given key", () => {
    const profile = {
      name: "Kal",
      config: { fontSize: "large" },
    } as UserProfile;
    expect(getProfileConfigValue(profile, "fontSize")).toBe("large");
  });
});
