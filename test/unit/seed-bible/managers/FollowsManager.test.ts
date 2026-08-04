import {
  createFollowsManager,
  MAX_FOLLOWS,
  type FollowedUser,
} from "@packages/seed-bible/seed-bible/managers/FollowsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

const STORAGE_ADDRESS = "following";
const STORAGE_MARKER = "private";

function makeFollowedUser(overrides: Partial<FollowedUser> = {}): FollowedUser {
  return {
    userId: "other-1",
    followedAtMs: Date.UTC(2026, 0, 1),
    name: "Ada",
    pictureUrl: null,
    ...overrides,
  };
}

describe("FollowsManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  /** Makes `getData` resolve to a stored follow list for the given account. */
  const givenStoredFollows = (follows: FollowedUser[]) => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { follows },
    });
  };

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    }) as unknown as Mock;
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never) as unknown as Mock;
    warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined) as unknown as Mock;

    login = {
      authBot: signal(null),
      sessionEnded: signal(null),
      userId: signal("user-1"),
      connectionId: "conn-1",
      profile: signal(null),
      cachedProfile: signal(null),
      localConfig: signal({}),
      profilePromise: null,
      isProfileLoading: signal(false),
      isSavingProfile: signal(false),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getUserProfile: vi
        .fn()
        .mockResolvedValue({ name: "Ada", pictureUrl: null }),
      uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
      userInfo: signal({ id: "user-1", email: "test@example.com" }),
      cancelLogin: vi.fn().mockResolvedValue(undefined),
      isLoginOpen: signal(false),
      requestLoginByEmail: vi
        .fn()
        .mockResolvedValue({ success: true, requestId: "req-1" }),
      submitLoginCode: vi.fn().mockResolvedValue({
        success: true,
        userInfo: { id: "user-1", email: "test@example.com" },
      }),
    } as unknown as Mocked<LoginManager>;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe("loading", () => {
    it("starts empty and reads nothing while signed out", () => {
      login.userId.value = null;
      const manager = createFollowsManager(os, login);

      expect(manager.following.value).toEqual([]);
      expect(manager.followingIds.value).toEqual([]);
      expect(getDataMock).not.toHaveBeenCalled();
    });

    it("loads the stored list for the signed-in account", async () => {
      givenStoredFollows([makeFollowedUser({ userId: "other-1" })]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      expect(getDataMock).toHaveBeenCalledWith("user-1", STORAGE_ADDRESS);
      expect(manager.followingIds.value).toEqual(["other-1"]);
    });

    it("treats a missing record as an empty list", async () => {
      const manager = createFollowsManager(os, login);
      await flushPromises();

      expect(manager.following.value).toEqual([]);
    });

    it("falls back to empty when the stored payload is malformed", async () => {
      getDataMock.mockResolvedValue({
        success: true,
        data: { follows: [{ nope: true }] },
      });
      const manager = createFollowsManager(os, login);
      await flushPromises();

      expect(manager.following.value).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("sorts the list most recently followed first", async () => {
      givenStoredFollows([
        makeFollowedUser({ userId: "older", followedAtMs: 1000 }),
        makeFollowedUser({ userId: "newer", followedAtMs: 5000 }),
      ]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      expect(manager.followingIds.value).toEqual(["newer", "older"]);
    });

    it("clears the list on sign-out", async () => {
      givenStoredFollows([makeFollowedUser()]);
      const manager = createFollowsManager(os, login);
      await flushPromises();
      expect(manager.following.value).toHaveLength(1);

      login.userId.value = null;
      expect(manager.following.value).toEqual([]);
    });

    it("re-reads for a different account after a switch", async () => {
      givenStoredFollows([makeFollowedUser({ userId: "a" })]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      givenStoredFollows([makeFollowedUser({ userId: "b" })]);
      login.userId.value = "user-2";
      await flushPromises();

      expect(getDataMock).toHaveBeenCalledWith("user-2", STORAGE_ADDRESS);
      expect(manager.followingIds.value).toEqual(["b"]);
    });

    it("does not apply a response that arrives after the account changed", async () => {
      // The read for user-1 is still in flight when the account switches.
      let resolveFirst: (value: unknown) => void = () => undefined;
      getDataMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      );
      getDataMock.mockResolvedValue({
        success: true,
        data: { follows: [makeFollowedUser({ userId: "user-2-follow" })] },
      });

      const manager = createFollowsManager(os, login);
      login.userId.value = "user-2";
      await flushPromises();

      // user-1's read lands late; it must not overwrite user-2's list.
      resolveFirst({
        success: true,
        data: { follows: [makeFollowedUser({ userId: "user-1-follow" })] },
      });
      await flushPromises();

      expect(manager.followingIds.value).toEqual(["user-2-follow"]);
    });
  });

  describe("follow", () => {
    it("writes the new entry to the signed-in account's record", async () => {
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.follow("other-1");

      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        STORAGE_ADDRESS,
        { follows: [expect.objectContaining({ userId: "other-1" })] },
        { marker: STORAGE_MARKER }
      );
      expect(manager.followingIds.value).toEqual(["other-1"]);
    });

    it("stores a snapshot of the followee's profile", async () => {
      login.getUserProfile.mockResolvedValue({
        name: "Grace",
        pictureUrl: "https://example.com/g.png",
      });
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.follow("other-1");

      expect(manager.following.value[0]).toMatchObject({
        userId: "other-1",
        name: "Grace",
        pictureUrl: "https://example.com/g.png",
      });
    });

    it("still follows when the profile can't be loaded", async () => {
      login.getUserProfile.mockRejectedValue(new Error("network"));
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.follow("other-1");

      expect(manager.followingIds.value).toEqual(["other-1"]);
      expect(manager.following.value[0]?.name).toBeNull();
    });

    it("refuses to follow yourself", async () => {
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.follow("user-1");

      expect(manager.following.value).toEqual([]);
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("is a no-op when already following", async () => {
      givenStoredFollows([makeFollowedUser({ userId: "other-1" })]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.follow("other-1");

      expect(manager.following.value).toHaveLength(1);
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("throws once the list is full", async () => {
      givenStoredFollows(
        Array.from({ length: MAX_FOLLOWS }, (_, i) =>
          makeFollowedUser({ userId: `other-${i}`, followedAtMs: 1000 + i })
        )
      );
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await expect(manager.follow("one-too-many")).rejects.toThrow(
        /Cannot follow more than/
      );
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("prompts sign-in when signed out and gives up if it fails", async () => {
      login.userId.value = null;
      const manager = createFollowsManager(os, login);

      await manager.follow("other-1");

      expect(login.login).toHaveBeenCalled();
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("rolls the list back and rethrows when the write fails", async () => {
      const manager = createFollowsManager(os, login);
      await flushPromises();
      recordDataMock.mockRejectedValue(new Error("server down"));

      await expect(manager.follow("other-1")).rejects.toThrow("server down");

      // The UI reports the failure, so the list must not claim otherwise.
      expect(manager.following.value).toEqual([]);
      expect(manager.isFollowing("other-1").value).toBe(false);
    });

    it("loads the existing list before writing, so a follow never wipes it", async () => {
      // The manager is created while signed out, so nothing is loaded yet;
      // following must read first rather than persist an empty list + 1.
      login.userId.value = null;
      const manager = createFollowsManager(os, login);

      givenStoredFollows([makeFollowedUser({ userId: "existing" })]);
      login.login.mockImplementation(async () => {
        login.userId.value = "user-1";
        return undefined as never;
      });

      await manager.follow("other-1");

      expect(manager.followingIds.value).toEqual(
        expect.arrayContaining(["existing", "other-1"])
      );
    });
  });

  describe("unfollow", () => {
    it("removes the entry and persists the rest", async () => {
      givenStoredFollows([
        makeFollowedUser({ userId: "a", followedAtMs: 2000 }),
        makeFollowedUser({ userId: "b", followedAtMs: 1000 }),
      ]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.unfollow("a");

      expect(manager.followingIds.value).toEqual(["b"]);
      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        STORAGE_ADDRESS,
        { follows: [expect.objectContaining({ userId: "b" })] },
        { marker: STORAGE_MARKER }
      );
    });

    it("is a no-op for someone who isn't followed", async () => {
      givenStoredFollows([makeFollowedUser({ userId: "a" })]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      await manager.unfollow("not-followed");

      expect(recordDataMock).not.toHaveBeenCalled();
    });
  });

  describe("isFollowing", () => {
    it("tracks follow and unfollow", async () => {
      const manager = createFollowsManager(os, login);
      await flushPromises();

      const view = manager.isFollowing("other-1");
      expect(view.value).toBe(false);

      await manager.follow("other-1");
      expect(view.value).toBe(true);

      await manager.unfollow("other-1");
      expect(view.value).toBe(false);
    });

    it("returns the same signal for repeated calls", () => {
      const manager = createFollowsManager(os, login);
      expect(manager.isFollowing("other-1")).toBe(
        manager.isFollowing("other-1")
      );
    });
  });

  describe("refreshProfiles", () => {
    it("updates stale name and picture snapshots", async () => {
      givenStoredFollows([
        makeFollowedUser({ userId: "other-1", name: "Old Name" }),
      ]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      login.getUserProfile.mockResolvedValue({
        name: "New Name",
        pictureUrl: "https://example.com/new.png",
      });

      await manager.refreshProfiles();

      expect(manager.following.value[0]).toMatchObject({
        name: "New Name",
        pictureUrl: "https://example.com/new.png",
      });
      expect(recordDataMock).toHaveBeenCalled();
    });

    it("does not write when nothing changed", async () => {
      givenStoredFollows([
        makeFollowedUser({ userId: "other-1", name: "Ada", pictureUrl: null }),
      ]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      login.getUserProfile.mockResolvedValue({ name: "Ada", pictureUrl: null });

      await manager.refreshProfiles();

      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("keeps the existing snapshot for an account it can't reach", async () => {
      givenStoredFollows([
        makeFollowedUser({ userId: "other-1", name: "Ada" }),
      ]);
      const manager = createFollowsManager(os, login);
      await flushPromises();

      login.getUserProfile.mockRejectedValue(new Error("network"));

      await manager.refreshProfiles();

      expect(manager.following.value[0]?.name).toBe("Ada");
      expect(recordDataMock).not.toHaveBeenCalled();
    });
  });
});
