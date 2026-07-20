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
  profilePromise?: Promise<UserProfile> | null;
  localConfig?: Record<string, unknown>;
}): LoginManager {
  const userId = signal<string | null>(initial?.userId ?? null);
  const profile = signal<UserProfile | null>(initial?.profile ?? null);
  const localConfig = signal<Record<string, unknown>>(
    initial?.localConfig ?? {}
  );
  const updateProfile = (newData: Partial<UserProfile>) => {
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    } as UserProfile;
  };
  return {
    userId,
    profile,
    localConfig,
    profilePromise: initial?.profilePromise ?? null,
    updateProfile,
  } as unknown as LoginManager;
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("saveProfileConfigValue", () => {
  it("saves to the device-local config store when the user is not logged in", () => {
    const login = createTestLogin();

    saveProfileConfigValue(login, "fontSize", "large");

    expect(login.profile.value).toBeNull();
    expect(login.localConfig.value).toEqual({ fontSize: "large" });
  });

  it("does not write to the local config store when the value is unchanged", () => {
    const login = createTestLogin({ localConfig: { fontSize: "large" } });
    const localConfig = login.localConfig.value;

    saveProfileConfigValue(login, "fontSize", "large");

    expect(login.localConfig.value).toBe(localConfig);
  });

  it("does not write, and does not overwrite the profile, while the profile is still loading", () => {
    // userId is set (session restored) but the async profile fetch hasn't
    // resolved yet — this is the exact window in which commit 4e15dad's
    // boot-time extension sync raced the profile load and wiped the account.
    const login = createTestLogin({ userId: "user-1", profile: null });

    saveProfileConfigValue(login, "installedExtensions", ["ext.a"]);

    expect(login.profile.value).toBeNull();
  });

  it("waits for the profile to finish loading before writing", async () => {
    // userId is set (session restored) but the async profile fetch hasn't
    // resolved yet — this is the exact window in which commit 4e15dad's
    // boot-time extension sync raced the profile load and wiped the account.
    const { promise, resolve } = deferred<UserProfile>();
    const login = createTestLogin({
      userId: "user-1",
      profile: null,
      profilePromise: promise,
    });

    saveProfileConfigValue(login, "installedExtensions", ["ext.a"]);

    expect(login.profile.value).toBeNull();

    login.profile.value = {
      name: "Kal",
      location: "Earth",
      config: { fontSize: "small" },
    };
    resolve(login.profile.value);

    await Promise.resolve();

    expect(login.profile.value).toEqual({
      name: "Kal",
      location: "Earth",
      config: { fontSize: "small", installedExtensions: ["ext.a"] },
    });
  });

  it("processes pending profile updates in sequence once the profile is loaded", async () => {
    // userId is set (session restored) but the async profile fetch hasn't
    // resolved yet — this is the exact window in which commit 4e15dad's
    // boot-time extension sync raced the profile load and wiped the account.
    const { promise, resolve } = deferred<UserProfile>();
    const login = createTestLogin({
      userId: "user-1",
      profile: null,
      profilePromise: promise,
    });

    saveProfileConfigValue(login, "installedExtensions", ["ext.a"]);
    saveProfileConfigValue(login, "fun", "abc");
    saveProfileConfigValue(login, "test", 123);

    expect(login.profile.value).toBeNull();

    login.profile.value = {
      name: "Kal",
      location: "Earth",
      config: { fontSize: "small" },
    };
    resolve(login.profile.value);

    await Promise.resolve();

    expect(login.profile.value).toEqual({
      name: "Kal",
      location: "Earth",
      config: {
        fontSize: "small",
        installedExtensions: ["ext.a"],
        fun: "abc",
        test: 123,
      },
    });
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
