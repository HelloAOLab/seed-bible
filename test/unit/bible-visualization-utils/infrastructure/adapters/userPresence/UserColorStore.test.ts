import { UserColorStore } from "bibleVizUtils.infrastructure.adapters.userPresence.UserColorStore";

// ─── factories ────────────────────────────────────────────────────────────────

const makeEventPort = () => ({ emit: jest.fn() });

const makeStore = (eventPort = makeEventPort()) =>
  new UserColorStore(eventPort);

const makeUserData = (overrides: any = {}): any => ({
  configId: "config-1",
  authId: "auth-1",
  color: "#ff0000",
  ...overrides,
});

const makeUserIds = (overrides: any = {}): any => ({
  configId: "config-1",
  authId: "auth-1",
  ...overrides,
});

// ─── getUserDataByIds ─────────────────────────────────────────────────────────

describe("getUserDataByIds", () => {
  it("returns undefined when both configId and authId are absent", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    expect(
      store.getUserDataByIds({ configId: undefined, authId: undefined })
    ).toBeUndefined();
  });

  it("returns undefined when the store is empty", () => {
    expect(makeStore().getUserDataByIds(makeUserIds())).toBeUndefined();
  });

  it("finds a user by configId alone", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "cfg-x", authId: undefined }));
    expect(
      store.getUserDataByIds({ configId: "cfg-x", authId: undefined })
    ).toBeDefined();
  });

  it("finds a user by authId alone", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: undefined, authId: "auth-x" }));
    expect(
      store.getUserDataByIds({ configId: undefined, authId: "auth-x" })
    ).toBeDefined();
  });

  it("finds a user when either configId or authId matches", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "cfg-a", authId: "auth-a" }));
    expect(
      store.getUserDataByIds({ configId: "cfg-a", authId: undefined })
    ).toBeDefined();
    expect(
      store.getUserDataByIds({ configId: undefined, authId: "auth-a" })
    ).toBeDefined();
  });

  it("returns undefined when neither id matches any stored user", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    expect(
      store.getUserDataByIds({ configId: "unknown", authId: "unknown" })
    ).toBeUndefined();
  });

  it("returns the matching UserData object", () => {
    const store = makeStore();
    store.addUserColor(
      makeUserData({ configId: "cfg-1", authId: "auth-1", color: "#abc" })
    );
    const result = store.getUserDataByIds({
      configId: "cfg-1",
      authId: undefined,
    });
    expect(result?.color).toBe("#abc");
  });
});

// ─── addUserColor ─────────────────────────────────────────────────────────────

describe("addUserColor", () => {
  it("adds a new entry when no matching user exists", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    expect(store.listUsers()).toHaveLength(1);
  });

  it("does not duplicate when a matching user already exists", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "cfg-1", authId: "auth-1" }));
    store.addUserColor(makeUserData({ configId: "cfg-1", authId: "auth-1" }));
    expect(store.listUsers()).toHaveLength(1);
  });

  it("updates color on an existing entry", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "cfg-1", color: "#old" }));
    store.addUserColor(makeUserData({ configId: "cfg-1", color: "#new" }));
    expect(store.getUserColor({ configId: "cfg-1", authId: undefined })).toBe(
      "#new"
    );
  });

  it("fills in missing configId on an existing entry when a new one is provided", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: undefined, authId: "auth-1" }));
    store.addUserColor(
      makeUserData({ configId: "cfg-filled", authId: "auth-1" })
    );
    const entry = store.getUserDataByIds({
      configId: "cfg-filled",
      authId: undefined,
    });
    expect(entry?.configId).toBe("cfg-filled");
  });

  it("fills in missing authId on an existing entry when a new one is provided", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "cfg-1", authId: undefined }));
    store.addUserColor(
      makeUserData({ configId: "cfg-1", authId: "auth-filled" })
    );
    const entry = store.getUserDataByIds({
      configId: undefined,
      authId: "auth-filled",
    });
    expect(entry?.authId).toBe("auth-filled");
  });

  it("does not overwrite a pre-existing configId", () => {
    const store = makeStore();
    store.addUserColor(
      makeUserData({ configId: "cfg-original", authId: "auth-1" })
    );
    store.addUserColor(makeUserData({ configId: "cfg-new", authId: "auth-1" }));
    // The entry was found by authId match; configId already set → should not change
    const entry = store.getUserDataByIds({
      configId: undefined,
      authId: "auth-1",
    });
    expect(entry?.configId).toBe("cfg-original");
  });

  it("does not overwrite a pre-existing authId", () => {
    const store = makeStore();
    store.addUserColor(
      makeUserData({ configId: "cfg-1", authId: "auth-original" })
    );
    store.addUserColor(makeUserData({ configId: "cfg-1", authId: "auth-new" }));
    const entry = store.getUserDataByIds({
      configId: "cfg-1",
      authId: undefined,
    });
    expect(entry?.authId).toBe("auth-original");
  });

  it("stores the data as a copy — mutating the input does not affect the store", () => {
    const store = makeStore();
    const data = makeUserData({ color: "#original" });
    store.addUserColor(data);
    data.color = "#mutated";
    expect(store.getUserColor(makeUserIds())).toBe("#original");
  });

  it("emits UserColorStoreChanged when a new user is added", () => {
    const eventPort = makeEventPort();
    const store = makeStore(eventPort);
    store.addUserColor(makeUserData());
    expect(eventPort.emit).toHaveBeenCalledWith("UserColorStoreChanged");
  });

  it("emits UserColorStoreChanged when an existing user's color is updated", () => {
    const eventPort = makeEventPort();
    const store = makeStore(eventPort);
    store.addUserColor(makeUserData({ configId: "cfg-1" }));
    eventPort.emit.mockClear();
    store.addUserColor(makeUserData({ configId: "cfg-1", color: "#updated" }));
    expect(eventPort.emit).toHaveBeenCalledWith("UserColorStoreChanged");
  });
});

// ─── removeUserColor ──────────────────────────────────────────────────────────

describe("removeUserColor", () => {
  it("returns true when the user was found and removed", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    expect(store.removeUserColor(makeUserIds())).toBe(true);
  });

  it("removes the entry so it no longer appears in listUsers", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    store.removeUserColor(makeUserIds());
    expect(store.listUsers()).toHaveLength(0);
  });

  it("returns false when no matching user exists", () => {
    expect(makeStore().removeUserColor(makeUserIds())).toBe(false);
  });

  it("does not affect other entries when removing one", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "keep", authId: "keep-auth" }));
    store.addUserColor(
      makeUserData({ configId: "remove", authId: "remove-auth" })
    );
    store.removeUserColor({ configId: "remove", authId: undefined });
    expect(store.listUsers()).toHaveLength(1);
    expect(store.listUsers()[0].configId).toBe("keep");
  });

  it("returns false on a second removal attempt after the first succeeds", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    store.removeUserColor(makeUserIds());
    expect(store.removeUserColor(makeUserIds())).toBe(false);
  });

  it("emits UserColorStoreChanged when a user is removed", () => {
    const eventPort = makeEventPort();
    const store = makeStore(eventPort);
    store.addUserColor(makeUserData());
    eventPort.emit.mockClear();
    store.removeUserColor(makeUserIds());
    expect(eventPort.emit).toHaveBeenCalledWith("UserColorStoreChanged");
  });

  it("does not emit UserColorStoreChanged when no user was found", () => {
    const eventPort = makeEventPort();
    const store = makeStore(eventPort);
    store.removeUserColor(makeUserIds());
    expect(eventPort.emit).not.toHaveBeenCalled();
  });
});

// ─── getUserColor ─────────────────────────────────────────────────────────────

describe("getUserColor", () => {
  it("returns the color of a stored user", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ color: "#123456" }));
    expect(store.getUserColor(makeUserIds())).toBe("#123456");
  });

  it("returns undefined when no matching user exists", () => {
    expect(makeStore().getUserColor(makeUserIds())).toBeUndefined();
  });

  it("returns the updated color after addUserColor replaces it", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ color: "#old" }));
    store.addUserColor(makeUserData({ color: "#new" }));
    expect(store.getUserColor(makeUserIds())).toBe("#new");
  });

  it("returns undefined after the user has been removed", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    store.removeUserColor(makeUserIds());
    expect(store.getUserColor(makeUserIds())).toBeUndefined();
  });
});

// ─── listUsers ────────────────────────────────────────────────────────────────

describe("listUsers", () => {
  it("returns an empty array when the store is empty", () => {
    expect(makeStore().listUsers()).toEqual([]);
  });

  it("returns all stored users", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "a", authId: "a-auth" }));
    store.addUserColor(makeUserData({ configId: "b", authId: "b-auth" }));
    expect(store.listUsers()).toHaveLength(2);
  });

  it("returns shallow copies — mutating the result does not affect the store", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ color: "#original" }));
    store.listUsers()[0].color = "#mutated";
    expect(store.getUserColor(makeUserIds())).toBe("#original");
  });

  it("reflects additions made after the initial call", () => {
    const store = makeStore();
    store.addUserColor(makeUserData({ configId: "a", authId: "a-auth" }));
    const snap1 = store.listUsers();
    store.addUserColor(makeUserData({ configId: "b", authId: "b-auth" }));
    const snap2 = store.listUsers();
    expect(snap1).toHaveLength(1);
    expect(snap2).toHaveLength(2);
  });

  it("does not include removed users", () => {
    const store = makeStore();
    store.addUserColor(makeUserData());
    store.removeUserColor(makeUserIds());
    expect(store.listUsers()).toHaveLength(0);
  });
});
