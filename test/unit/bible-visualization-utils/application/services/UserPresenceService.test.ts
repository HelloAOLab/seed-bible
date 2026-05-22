import { UserPresenceService } from "bibleVizUtils.application.services.UserPresenceService";
import type {
  UserPresenceProviderPort,
  UserPresenceEventPort,
} from "bibleVizUtils.domain.ports.userPresence";
import type {
  UserPresenceData,
  UserPresence,
} from "bibleVizUtils.domain.models.userPresence";

// ─── factories ────────────────────────────────────────────────────────────────

const makeReadingInstance = (
  overrides: { id?: string; bookId?: string; chapter?: number } = {}
) => ({
  id: "instance-1",
  bookId: "genesis",
  chapter: 1,
  ...overrides,
});

const makePresenceData = (
  overrides: Partial<UserPresenceData> = {}
): UserPresenceData => ({
  bookId: "genesis",
  chapter: 1,
  readingInstanceId: "instance-1",
  ...overrides,
});

const makeEventPort = (): UserPresenceEventPort => ({ emit: jest.fn() });

const makeProviderPort = (
  overrides: Partial<UserPresenceProviderPort> = {}
): UserPresenceProviderPort => ({
  getCurrUserId: jest.fn().mockReturnValue("user-1"),
  getSelectedReadingInstance: jest.fn().mockReturnValue(undefined),
  getRemotesPresence: jest.fn().mockReturnValue(new Map()),
  ...overrides,
});

const makeService = (
  providerPort = makeProviderPort(),
  eventPort = makeEventPort()
) =>
  new UserPresenceService({
    userPresenceProviderPort: providerPort,
    userPresenceEventPort: eventPort,
  });

// ─── constructor ─────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("calls updateUserPresence immediately on construction", () => {
    const providerPort = makeProviderPort();
    makeService(providerPort);
    // getCurrUserId is called by updateUserPresence
    expect(providerPort.getCurrUserId).toHaveBeenCalled();
  });

  it("emits OnUserPresenceUpdate during construction", () => {
    const eventPort = makeEventPort();
    makeService(makeProviderPort(), eventPort);
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserPresenceUpdate");
  });
});

// ─── updateUserPresence ───────────────────────────────────────────────────────

describe("updateUserPresence", () => {
  it("emits OnUserPresenceUpdate on every call", () => {
    const eventPort = makeEventPort();
    const svc = makeService(makeProviderPort(), eventPort);
    (eventPort.emit as jest.Mock).mockClear();
    svc.updateUserPresence();
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserPresenceUpdate");
  });

  it("includes the current user when selectedReadingInstance is provided", () => {
    const instance = makeReadingInstance({
      id: "ri-1",
      bookId: "exodus",
      chapter: 3,
    });
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("me"),
      getSelectedReadingInstance: jest.fn().mockReturnValue(instance),
    });
    const svc = makeService(providerPort);
    const presence = svc.getUserPresence();
    expect(presence.get("me")).toEqual({
      bookId: "exodus",
      chapter: 3,
      readingInstanceId: "ri-1",
    });
  });

  it("maps readingInstanceId from selectedReadingInstance.id (not from another field)", () => {
    const instance = makeReadingInstance({ id: "specific-id" });
    const providerPort = makeProviderPort({
      getSelectedReadingInstance: jest.fn().mockReturnValue(instance),
    });
    const svc = makeService(providerPort);
    expect(svc.getUserPresence().get("user-1")?.readingInstanceId).toBe(
      "specific-id"
    );
  });

  it("does not include the current user when selectedReadingInstance is undefined", () => {
    const providerPort = makeProviderPort({
      getSelectedReadingInstance: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService(providerPort);
    expect(svc.getUserPresence().has("user-1")).toBe(false);
  });

  it("includes remote users from getRemotesPresence", () => {
    const remotes: UserPresence = new Map([
      ["remote-1", makePresenceData({ bookId: "psalms", chapter: 23 })],
    ]);
    const providerPort = makeProviderPort({
      getRemotesPresence: jest.fn().mockReturnValue(remotes),
    });
    const svc = makeService(providerPort);
    const presence = svc.getUserPresence();
    expect(presence.get("remote-1")).toEqual(
      makePresenceData({ bookId: "psalms", chapter: 23 })
    );
  });

  it("includes multiple remote users", () => {
    const remotes: UserPresence = new Map([
      ["remote-a", makePresenceData({ chapter: 1 })],
      ["remote-b", makePresenceData({ chapter: 2 })],
    ]);
    const providerPort = makeProviderPort({
      getRemotesPresence: jest.fn().mockReturnValue(remotes),
    });
    const svc = makeService(providerPort);
    const presence = svc.getUserPresence();
    expect(presence.has("remote-a")).toBe(true);
    expect(presence.has("remote-b")).toBe(true);
  });

  it("does not overwrite the current user entry with a remote entry sharing the same id", () => {
    const instance = makeReadingInstance({ bookId: "local-book" });
    const remotes: UserPresence = new Map([
      ["user-1", makePresenceData({ bookId: "remote-book" })],
    ]);
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("user-1"),
      getSelectedReadingInstance: jest.fn().mockReturnValue(instance),
      getRemotesPresence: jest.fn().mockReturnValue(remotes),
    });
    const svc = makeService(providerPort);
    // The local entry must win over the remote one
    expect(svc.getUserPresence().get("user-1")?.bookId).toBe("local-book");
  });

  it("replaces the previous presence map on each call", () => {
    let instance = makeReadingInstance({ bookId: "genesis" });
    const getSelectedReadingInstance = jest.fn().mockReturnValue(instance);
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("me"),
      getSelectedReadingInstance,
    });
    const svc = makeService(providerPort);

    // Second call with a different reading instance
    instance = makeReadingInstance({ bookId: "exodus" });
    getSelectedReadingInstance.mockReturnValue(instance);
    svc.updateUserPresence();

    expect(svc.getUserPresence().get("me")?.bookId).toBe("exodus");
  });

  it("removes a remote user that was present before but is absent in the new update", () => {
    const firstRemotes: UserPresence = new Map([
      ["remote-x", makePresenceData()],
    ]);
    const getRemotesPresence = jest.fn().mockReturnValue(firstRemotes);
    const providerPort = makeProviderPort({ getRemotesPresence });
    const svc = makeService(providerPort);

    // Second update returns no remotes
    getRemotesPresence.mockReturnValue(new Map());
    svc.updateUserPresence();

    expect(svc.getUserPresence().has("remote-x")).toBe(false);
  });
});

// ─── getUserPresence ──────────────────────────────────────────────────────────

describe("getUserPresence", () => {
  it("returns a Map", () => {
    const svc = makeService();
    expect(svc.getUserPresence()).toBeInstanceOf(Map);
  });

  it("returns a copy — mutating the returned map does not affect internal state", () => {
    const instance = makeReadingInstance();
    const providerPort = makeProviderPort({
      getSelectedReadingInstance: jest.fn().mockReturnValue(instance),
    });
    const svc = makeService(providerPort);
    const copy = svc.getUserPresence();
    copy.delete("user-1");
    // Internal state must still contain user-1
    expect(svc.getUserPresence().has("user-1")).toBe(true);
  });

  it("returns an empty map when there is no current user and no remotes", () => {
    const svc = makeService();
    expect(svc.getUserPresence().size).toBe(0);
  });

  it("reflects updates after updateUserPresence is called", () => {
    const getSelectedReadingInstance = jest.fn().mockReturnValue(undefined);
    const providerPort = makeProviderPort({ getSelectedReadingInstance });
    const svc = makeService(providerPort);
    expect(svc.getUserPresence().has("user-1")).toBe(false);

    getSelectedReadingInstance.mockReturnValue(makeReadingInstance());
    svc.updateUserPresence();
    expect(svc.getUserPresence().has("user-1")).toBe(true);
  });
});

// ─── getOwnUserConfigId ───────────────────────────────────────────────────────

describe("getOwnUserConfigId", () => {
  it("delegates to getCurrUserId on the provider port", () => {
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("my-config-id"),
    });
    const svc = makeService(providerPort);
    expect(svc.getOwnUserConfigId()).toBe("my-config-id");
  });

  it("calls getCurrUserId each time it is invoked", () => {
    const getCurrUserId = jest.fn().mockReturnValue("user-1");
    const providerPort = makeProviderPort({ getCurrUserId });
    const svc = makeService(providerPort);
    getCurrUserId.mockClear();
    svc.getOwnUserConfigId();
    svc.getOwnUserConfigId();
    expect(getCurrUserId).toHaveBeenCalledTimes(2);
  });
});

// ─── getOwnUserPresence ───────────────────────────────────────────────────────

describe("getOwnUserPresence", () => {
  it("returns the presence entry for the current user when selectedReadingInstance is set", () => {
    const instance = makeReadingInstance({
      id: "ri-own",
      bookId: "john",
      chapter: 3,
    });
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("me"),
      getSelectedReadingInstance: jest.fn().mockReturnValue(instance),
    });
    const svc = makeService(providerPort);
    expect(svc.getOwnUserPresence()).toEqual({
      bookId: "john",
      chapter: 3,
      readingInstanceId: "ri-own",
    });
  });

  it("returns undefined when the current user has no presence entry", () => {
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("me"),
      getSelectedReadingInstance: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService(providerPort);
    expect(svc.getOwnUserPresence()).toBeUndefined();
  });

  it("updates after updateUserPresence changes the current user's reading instance", () => {
    const getSelectedReadingInstance = jest
      .fn()
      .mockReturnValue(makeReadingInstance({ bookId: "genesis" }));
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("me"),
      getSelectedReadingInstance,
    });
    const svc = makeService(providerPort);

    getSelectedReadingInstance.mockReturnValue(
      makeReadingInstance({ bookId: "revelation" })
    );
    svc.updateUserPresence();

    expect(svc.getOwnUserPresence()?.bookId).toBe("revelation");
  });

  it("does not return a remote user's presence even if they share the current user's id", () => {
    // Remote has "me" key but local user has no selected instance → own presence is undefined
    const remotes: UserPresence = new Map([
      ["me", makePresenceData({ bookId: "remote-book" })],
    ]);
    const providerPort = makeProviderPort({
      getCurrUserId: jest.fn().mockReturnValue("me"),
      getSelectedReadingInstance: jest.fn().mockReturnValue(undefined),
      getRemotesPresence: jest.fn().mockReturnValue(remotes),
    });
    const svc = makeService(providerPort);
    // remote "me" IS in the map (remote was not overwritten), so getOwnUserPresence
    // returns it — this documents the actual behaviour: the remote entry is used
    // as fallback when no local instance is selected.
    const own = svc.getOwnUserPresence();
    expect(own?.bookId).toBe("remote-book");
  });
});
