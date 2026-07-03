import { SessionProvider } from "../../../../../../packages/seed-bible-utils/infrastructure/adapters/session/SessionProvider";

// ─── factories ────────────────────────────────────────────────────────────────

const makeRemoteUser = (overrides: any = {}): any => ({
  connectionId: "remote-config-id",
  userId: "remote-auth-id",
  profile: null,
  ...overrides,
});

const makeTab = (users: any[] = []): any => ({
  sharedSession: {
    connectedUsers: { value: users },
  },
});

const makeTabWithoutSession = (): any => ({
  sharedSession: null,
});

const makeState = (overrides: any = {}): any => ({
  os: {
    connectionId: "config-bot-id",
  },
  login: {
    userId: { value: "local-auth-id" },
    profile: { value: null },
  },
  tabs: {
    tabs: { value: [] },
  },
  ...overrides,
});

const makeProvider = (
  state = makeState(),
  colors: string[] = ["#ff0000", "#00ff00", "#0000ff"],
  icons: string[] = ["home", "star", "face"]
) => new SessionProvider({ state, colors, icons });

// ─── getConnectedUsers ────────────────────────────────────────────────────────

describe("getConnectedUsers", () => {
  it("always includes the local user with configId equal to configBot.id", () => {
    const users = makeProvider().getConnectedUsers();
    expect(users.some((u) => u.configId === "config-bot-id")).toBe(true);
  });

  it("sets the local user's authId from state.login.userId.value", () => {
    const state = makeState({
      login: { userId: { value: "my-auth-id" }, profile: { value: null } },
    });
    const users = makeProvider(state).getConnectedUsers();
    const local = users.find((u) => u.configId === "config-bot-id");
    expect(local?.authId).toBe("my-auth-id");
  });

  it("sets the local user's authId to undefined when state.login.userId.value is null", () => {
    const state = makeState({
      login: { userId: { value: null }, profile: { value: null } },
    });
    const users = makeProvider(state).getConnectedUsers();
    const local = users.find((u) => u.configId === "config-bot-id");
    expect(local?.authId).toBeUndefined();
  });

  it("sets the local user's profile from state.login.profile.value", () => {
    const profile = { name: "Alice", avatarUrl: "" };
    const state = makeState({
      login: { userId: { value: null }, profile: { value: profile } },
    });
    const users = makeProvider(state).getConnectedUsers();
    const local = users.find((u) => u.configId === "config-bot-id");
    expect(local?.profile).toBe(profile);
  });

  it("sets the local user's profile to undefined when state.login.profile.value is null", () => {
    const users = makeProvider().getConnectedUsers();
    const local = users.find((u) => u.configId === "config-bot-id");
    expect(local?.profile).toBeUndefined();
  });

  it("returns only the local user when there are no tabs", () => {
    expect(makeProvider().getConnectedUsers()).toHaveLength(1);
  });

  it("skips tabs that have no sharedSession", () => {
    const state = makeState({
      tabs: { tabs: { value: [makeTabWithoutSession()] } },
    });
    expect(makeProvider(state).getConnectedUsers()).toHaveLength(1);
  });

  it("skips tabs whose connectedUsers array is empty", () => {
    const state = makeState({ tabs: { tabs: { value: [makeTab([])] } } });
    expect(makeProvider(state).getConnectedUsers()).toHaveLength(1);
  });

  it("includes a remote user from a tab's sharedSession", () => {
    const remote = makeRemoteUser({ connectionId: "remote-1" });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    const users = makeProvider(state).getConnectedUsers();
    expect(users.some((u) => u.configId === "remote-1")).toBe(true);
  });

  it("maps a remote user's connectionId to configId", () => {
    const remote = makeRemoteUser({ connectionId: "conn-42" });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    const users = makeProvider(state).getConnectedUsers();
    expect(users.find((u) => u.configId === "conn-42")).toBeDefined();
  });

  it("maps a remote user's userId to authId", () => {
    const remote = makeRemoteUser({
      connectionId: "conn-1",
      userId: "auth-99",
    });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    const users = makeProvider(state).getConnectedUsers();
    expect(users.find((u) => u.configId === "conn-1")?.authId).toBe("auth-99");
  });

  it("sets a remote user's authId to undefined when userId is null", () => {
    const remote = makeRemoteUser({ connectionId: "conn-1", userId: null });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    const users = makeProvider(state).getConnectedUsers();
    expect(users.find((u) => u.configId === "conn-1")?.authId).toBeUndefined();
  });

  it("includes users from multiple tabs", () => {
    const state = makeState({
      tabs: {
        tabs: {
          value: [
            makeTab([makeRemoteUser({ connectionId: "r1" })]),
            makeTab([makeRemoteUser({ connectionId: "r2" })]),
          ],
        },
      },
    });
    const users = makeProvider(state).getConnectedUsers();
    expect(users).toHaveLength(3); // local + r1 + r2
  });

  it("does not duplicate a user that appears in multiple tabs (first occurrence wins)", () => {
    const state = makeState({
      tabs: {
        tabs: {
          value: [
            makeTab([
              makeRemoteUser({ connectionId: "dup", userId: "auth-first" }),
            ]),
            makeTab([
              makeRemoteUser({ connectionId: "dup", userId: "auth-second" }),
            ]),
          ],
        },
      },
    });
    const users = makeProvider(state).getConnectedUsers();
    const dups = users.filter((u) => u.configId === "dup");
    expect(dups).toHaveLength(1);
    expect(dups[0]!.authId).toBe("auth-first");
  });

  it("does not include a remote user whose connectionId matches configBot.id", () => {
    // configBot.id is already the local user — a remote that shares this id is skipped
    const remote = makeRemoteUser({ connectionId: "config-bot-id" });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    const users = makeProvider(state).getConnectedUsers();
    const matches = users.filter((u) => u.configId === "config-bot-id");
    expect(matches).toHaveLength(1);
  });
});

// ─── getConnectedUsersConfigId ────────────────────────────────────────────────

describe("getConnectedUsersConfigId", () => {
  it("returns an array of configIds", () => {
    const ids = makeProvider().getConnectedUsersConfigId();
    expect(Array.isArray(ids)).toBe(true);
  });

  it("includes configBot.id as the local user's configId", () => {
    expect(makeProvider().getConnectedUsersConfigId()).toContain(
      "config-bot-id"
    );
  });

  it("includes remote users' connectionIds", () => {
    const remote = makeRemoteUser({ connectionId: "remote-abc" });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    expect(makeProvider(state).getConnectedUsersConfigId()).toContain(
      "remote-abc"
    );
  });

  it("returns one id per connected user", () => {
    const state = makeState({
      tabs: {
        tabs: {
          value: [
            makeTab([
              makeRemoteUser({ connectionId: "r1" }),
              makeRemoteUser({ connectionId: "r2" }),
            ]),
          ],
        },
      },
    });
    expect(makeProvider(state).getConnectedUsersConfigId()).toHaveLength(3);
  });
});

// ─── getUserColorById ─────────────────────────────────────────────────────────

describe("getUserColorById", () => {
  it("returns a string for any id", () => {
    expect(typeof makeProvider().getUserColorById("some-id")).toBe("string");
  });

  it("returns the same color for the same id on successive calls (deterministic)", () => {
    const provider = makeProvider();
    expect(provider.getUserColorById("abc")).toBe(
      provider.getUserColorById("abc")
    );
  });

  it("returns '#E5E7EB' when the colors array is empty", () => {
    const provider = makeProvider(makeState(), []);
    expect(provider.getUserColorById("any-id")).toBe("#E5E7EB");
  });

  it("always returns the single available color when colors has one entry", () => {
    const provider = makeProvider(makeState(), ["#unique"]);
    expect(provider.getUserColorById("id-1")).toBe("#unique");
    expect(provider.getUserColorById("id-2")).toBe("#unique");
    expect(provider.getUserColorById("id-3")).toBe("#unique");
  });

  it("returns a color from within the provided colors array", () => {
    const colors = ["#aaa", "#bbb", "#ccc"];
    const provider = makeProvider(makeState(), colors);
    const result = provider.getUserColorById("test-id");
    expect(colors).toContain(result);
  });

  it("may return different colors for different ids", () => {
    const colors = ["#111", "#222", "#333", "#444", "#555"];
    const provider = makeProvider(makeState(), colors);
    const results = new Set(
      [
        "alpha",
        "beta",
        "gamma",
        "delta",
        "epsilon",
        "zeta",
        "eta",
        "theta",
        "iota",
      ].map((id) => provider.getUserColorById(id))
    );
    expect(results.size).toBeGreaterThan(1);
  });
});

// ─── getAuthIdByConnectionId ──────────────────────────────────────────────────

describe("getAuthIdByConnectionId", () => {
  it("returns the local user's authId when queried with configBot.id", () => {
    const state = makeState({
      login: { userId: { value: "local-auth" }, profile: { value: null } },
    });
    expect(makeProvider(state).getAuthIdByConnectionId("config-bot-id")).toBe(
      "local-auth"
    );
  });

  it("returns a remote user's authId by their connectionId", () => {
    const remote = makeRemoteUser({ connectionId: "conn-x", userId: "auth-x" });
    const state = makeState({ tabs: { tabs: { value: [makeTab([remote])] } } });
    expect(makeProvider(state).getAuthIdByConnectionId("conn-x")).toBe(
      "auth-x"
    );
  });

  it("returns undefined when no user matches the id", () => {
    expect(
      makeProvider().getAuthIdByConnectionId("nonexistent")
    ).toBeUndefined();
  });

  it("returns undefined when the user exists but has no authId", () => {
    const state = makeState({
      login: { userId: { value: null }, profile: { value: null } },
    });
    expect(
      makeProvider(state).getAuthIdByConnectionId("config-bot-id")
    ).toBeUndefined();
  });

  it("returns the first match when multiple users share a connectionId (dedup is upstream)", () => {
    const state = makeState({
      tabs: {
        tabs: {
          value: [
            makeTab([
              makeRemoteUser({ connectionId: "shared", userId: "first-auth" }),
            ]),
          ],
        },
      },
    });
    expect(makeProvider(state).getAuthIdByConnectionId("shared")).toBe(
      "first-auth"
    );
  });
});
