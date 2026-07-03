import type { Mock } from "vitest";
import { UserColorSyncService } from "../../../../../packages/seed-bible-utils/application/services/UserColorSyncService";
import type {
  UserColorStorePort,
  SessionProviderPort,
  UserDatabasePort,
} from "../../../../../packages/seed-bible-utils/domain/ports/session";

// GetRandomColor is imported via a relative path inside the service.
// Mocking the alias resolves to the same file, so the mock is shared.
vi.mock(
  "../../../../../packages/seed-bible-utils/domain/functions/colors",
  async () => ({
    ...(await vi.importActual<
      typeof import("../../../../../packages/seed-bible-utils/domain/functions/colors")
    >("../../../../../packages/seed-bible-utils/domain/functions/colors")),
    GetRandomColor: vi.fn().mockReturnValue("#random"),
  })
);

import { GetRandomColor } from "../../../../../packages/seed-bible-utils/domain/functions/colors";
const mockGetRandomColor = GetRandomColor as Mock;

afterEach(() => void vi.clearAllMocks());

// ─── factories ────────────────────────────────────────────────────────────────

const makeConnectedUser = (configId: string, authId: string) => ({
  configId,
  authId,
});

const makeSubscribedUser = (id: string) => ({ id });

const makeSessionProvider = (
  overrides: Partial<SessionProviderPort> = {}
): SessionProviderPort => ({
  getConnectedUsersConfigId: vi.fn().mockResolvedValue([]),
  getConnectedUsers: vi.fn().mockReturnValue([]),
  getUserColorById: vi.fn().mockReturnValue("#aabbcc"),
  getOwnUserConnectionId: vi.fn().mockReturnValue(""),
  ...overrides,
});

const makeUserDatabase = (
  overrides: Partial<UserDatabasePort> = {}
): UserDatabasePort => ({
  getSubscribedUsers: vi.fn().mockResolvedValue(null),
  ...overrides,
});

const makeColorStore = (
  overrides: Partial<UserColorStorePort> = {}
): UserColorStorePort => ({
  getUserColor: vi.fn().mockReturnValue(undefined),
  addUserColor: vi.fn(),
  removeUserColor: vi.fn().mockReturnValue(true),
  ...overrides,
});

const makeService = (
  overrides: {
    sessionProviderPort?: SessionProviderPort;
    userDatabasePort?: UserDatabasePort;
    userColorStorePort?: UserColorStorePort;
  } = {}
) =>
  new UserColorSyncService({
    sessionProviderPort: makeSessionProvider(),
    userDatabasePort: makeUserDatabase(),
    userColorStorePort: makeColorStore(),
    ...overrides,
  });

// ─── infrastructure ───────────────────────────────────────────────────────────

describe("syncUserColors — infrastructure", () => {
  it("calls getConnectedUsersConfigId and getSubscribedUsers", async () => {
    const sessionProviderPort = makeSessionProvider();
    const userDatabasePort = makeUserDatabase();
    await makeService({
      sessionProviderPort,
      userDatabasePort,
    }).syncUserColors();
    expect(sessionProviderPort.getConnectedUsersConfigId).toHaveBeenCalled();
    expect(userDatabasePort.getSubscribedUsers).toHaveBeenCalled();
  });

  it("calls getConnectedUsers after the parallel fetch resolves", async () => {
    const sessionProviderPort = makeSessionProvider();
    await makeService({ sessionProviderPort }).syncUserColors();
    expect(sessionProviderPort.getConnectedUsers).toHaveBeenCalled();
  });

  it("wraps any thrown error with the UserColorSyncService message", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(
      makeService({ sessionProviderPort }).syncUserColors()
    ).rejects.toThrow("Error updating color store at UserColorSyncService");
  });

  it("exposes the original error as the cause of the wrapped error", async () => {
    const original = new Error("root cause");
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockRejectedValue(original),
    });
    try {
      await makeService({ sessionProviderPort }).syncUserColors();
    } catch (e: any) {
      expect(e.cause).toBe(original);
    }
  });
});

// ─── loggedUsersInInstanceMap building ───────────────────────────────────────

describe("syncUserColors — loggedUsersInInstanceMap", () => {
  it("maps configId → authId for users that have both fields", async () => {
    // A user with configId=cfg1 and authId=auth1 must later trigger the
    // CASE 2 branch (user in instance) when cfg1 appears in configIds.
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi
        .fn()
        .mockReturnValue([makeConnectedUser("cfg1", "auth1")]),
      getUserColorById: vi.fn().mockReturnValue("#color1"),
    });
    const userColorStorePort = makeColorStore();
    await makeService({
      sessionProviderPort,
      userColorStorePort,
    }).syncUserColors();
    // getUserColorById should be called with authId (auth1) because authId ?? configId
    expect(sessionProviderPort.getUserColorById).toHaveBeenCalledWith("auth1");
  });

  it("ignores connected users that are missing configId", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi
        .fn()
        .mockReturnValue([{ configId: undefined, authId: "auth1" }]),
      getUserColorById: vi.fn().mockReturnValue("#c"),
    });
    const userColorStorePort = makeColorStore();
    await makeService({
      sessionProviderPort,
      userColorStorePort,
    }).syncUserColors();
    // authId is not resolved for cfg1, so getUserColorById uses configId fallback
    expect(sessionProviderPort.getUserColorById).toHaveBeenCalledWith("cfg1");
  });

  it("ignores connected users that are missing authId", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi
        .fn()
        .mockReturnValue([{ configId: "cfg1", authId: undefined }]),
      getUserColorById: vi.fn().mockReturnValue("#c"),
    });
    await makeService({ sessionProviderPort }).syncUserColors();
    expect(sessionProviderPort.getUserColorById).toHaveBeenCalledWith("cfg1");
  });
});

// ─── usersIdsToProcess from configIds ────────────────────────────────────────

describe("syncUserColors — configIds processing", () => {
  it("processes every configId even when there is no matching authId", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi
        .fn()
        .mockResolvedValue(["cfg1", "cfg2", "cfg3"]),
      getConnectedUsers: vi.fn().mockReturnValue([]),
      getUserColorById: vi.fn().mockReturnValue("#c"),
    });
    const userColorStorePort = makeColorStore();
    await makeService({
      sessionProviderPort,
      userColorStorePort,
    }).syncUserColors();
    expect(sessionProviderPort.getUserColorById).toHaveBeenCalledTimes(3);
  });

  it("marks authId as processed so the matching subscribedUser is skipped", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi
        .fn()
        .mockReturnValue([makeConnectedUser("cfg1", "auth1")]),
      getUserColorById: vi.fn().mockReturnValue("#c"),
    });
    const userDatabasePort = makeUserDatabase({
      getSubscribedUsers: vi
        .fn()
        .mockResolvedValue([makeSubscribedUser("auth1")]),
    });
    const userColorStorePort = makeColorStore();
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    // auth1 was processed via cfg1 (CASE 2) → the subscribed-user entry (CASE 1)
    // must be skipped, so addUserColor is only called once (from CASE 2, with configId).
    const case1Adds = (
      userColorStorePort.addUserColor as Mock
    ).mock.calls.filter(
      ([arg]) => arg.configId === undefined && arg.authId === "auth1"
    );
    expect(case1Adds).toHaveLength(0);
  });
});

// ─── subscribedUsers processing ──────────────────────────────────────────────

describe("syncUserColors — subscribedUsers processing", () => {
  it("adds unprocessed subscribedUsers to the queue with only authId", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue([]),
      getConnectedUsers: vi.fn().mockReturnValue([]),
    });
    const userDatabasePort = makeUserDatabase({
      getSubscribedUsers: vi
        .fn()
        .mockResolvedValue([makeSubscribedUser("auth-only")]),
    });
    const userColorStorePort = makeColorStore({
      getUserColor: vi.fn().mockReturnValue(undefined),
    });
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    // CASE 1 should fire → addUserColor with authId and a random color
    expect(userColorStorePort.addUserColor).toHaveBeenCalledWith(
      expect.objectContaining({ authId: "auth-only" })
    );
  });

  it("does nothing extra when subscribedUsers is null", async () => {
    const userDatabasePort = makeUserDatabase({
      getSubscribedUsers: vi.fn().mockResolvedValue(null),
    });
    const userColorStorePort = makeColorStore();
    await makeService({
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    expect(userColorStorePort.addUserColor).not.toHaveBeenCalled();
  });

  it("skips subscribedUsers whose authId was already processed via a configId", async () => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi
        .fn()
        .mockReturnValue([makeConnectedUser("cfg1", "linked-auth")]),
      getUserColorById: vi.fn().mockReturnValue("#c"),
    });
    const userDatabasePort = makeUserDatabase({
      getSubscribedUsers: vi
        .fn()
        .mockResolvedValue([makeSubscribedUser("linked-auth")]),
    });
    const userColorStorePort = makeColorStore();
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    // Only one addUserColor call from CASE 2 (not an extra one from CASE 1)
    const case1Calls = (
      userColorStorePort.addUserColor as Mock
    ).mock.calls.filter(
      ([arg]) => arg.configId === undefined && arg.authId === "linked-auth"
    );
    expect(case1Calls).toHaveLength(0);
  });
});

// ─── CASE 1: subscribed user not in instance ──────────────────────────────────

describe("syncUserColors — CASE 1 (subscribed, not in instance)", () => {
  const setupCase1 = (currColor: string | undefined = undefined) => {
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue([]),
      getConnectedUsers: vi.fn().mockReturnValue([]),
    });
    const userDatabasePort = makeUserDatabase({
      getSubscribedUsers: vi
        .fn()
        .mockResolvedValue([makeSubscribedUser("auth-sub")]),
    });
    const userColorStorePort = makeColorStore({
      getUserColor: vi.fn().mockReturnValue(currColor),
    });
    return { sessionProviderPort, userDatabasePort, userColorStorePort };
  };

  it("checks the store for an existing color keyed by authId", async () => {
    const { sessionProviderPort, userDatabasePort, userColorStorePort } =
      setupCase1();
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    expect(userColorStorePort.getUserColor).toHaveBeenCalledWith({
      authId: "auth-sub",
    });
  });

  it("calls addUserColor with a random color when no color is stored", async () => {
    const { sessionProviderPort, userDatabasePort, userColorStorePort } =
      setupCase1(undefined);
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    expect(userColorStorePort.addUserColor).toHaveBeenCalledWith(
      expect.objectContaining({ color: "#random", authId: "auth-sub" })
    );
  });

  it("calls GetRandomColor to generate the new color", async () => {
    const { sessionProviderPort, userDatabasePort, userColorStorePort } =
      setupCase1(undefined);
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    expect(mockGetRandomColor).toHaveBeenCalled();
  });

  it("does not call addUserColor when a color is already stored for the authId", async () => {
    const { sessionProviderPort, userDatabasePort, userColorStorePort } =
      setupCase1("#existing-color");
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    expect(userColorStorePort.addUserColor).not.toHaveBeenCalled();
  });

  it("does not call getUserColorById (session provider) in CASE 1", async () => {
    const { sessionProviderPort, userDatabasePort, userColorStorePort } =
      setupCase1();
    await makeService({
      sessionProviderPort,
      userDatabasePort,
      userColorStorePort,
    }).syncUserColors();
    expect(sessionProviderPort.getUserColorById).not.toHaveBeenCalled();
  });
});

// ─── CASE 2: user in instance ─────────────────────────────────────────────────

describe("syncUserColors — CASE 2 (user in instance)", () => {
  const setupCase2 = (
    opts: {
      authId?: string;
      instanceColor?: string | undefined;
      currConfigColor?: string | undefined;
      currAuthColor?: string | undefined;
    } = {}
  ) => {
    const {
      authId,
      instanceColor = "#instance-color",
      currConfigColor = undefined,
      currAuthColor = undefined,
    } = opts;

    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi
        .fn()
        .mockReturnValue(authId ? [makeConnectedUser("cfg1", authId)] : []),
      getUserColorById: vi.fn().mockReturnValue(instanceColor),
    });

    const userColorStorePort = makeColorStore({
      getUserColor: vi.fn().mockImplementation(({ configId, authId: aid }) => {
        if (configId === "cfg1") return currConfigColor;
        if (aid && aid === authId) return currAuthColor;
        return undefined;
      }),
    });

    return { sessionProviderPort, userColorStorePort };
  };

  it("calls getUserColorById with authId when authId is present", async () => {
    const { sessionProviderPort, userColorStorePort } = setupCase2({
      authId: "auth1",
    });
    await makeService({
      sessionProviderPort,
      userColorStorePort,
    }).syncUserColors();
    expect(sessionProviderPort.getUserColorById).toHaveBeenCalledWith("auth1");
  });

  it("calls getUserColorById with configId when authId is absent", async () => {
    const { sessionProviderPort, userColorStorePort } = setupCase2();
    await makeService({
      sessionProviderPort,
      userColorStorePort,
    }).syncUserColors();
    expect(sessionProviderPort.getUserColorById).toHaveBeenCalledWith("cfg1");
  });

  it("throws (wrapped) when getUserColorById returns undefined", async () => {
    // Cannot use setupCase2 here: JS destructuring defaults treat `undefined` as
    // absent, so `instanceColor: undefined` would still apply the "#instance-color"
    // default. Build the port manually so getUserColorById returns null/falsy.
    const sessionProviderPort = makeSessionProvider({
      getConnectedUsersConfigId: vi.fn().mockResolvedValue(["cfg1"]),
      getConnectedUsers: vi.fn().mockReturnValue([]),
      getUserColorById: vi.fn().mockReturnValue(null),
    });
    const userColorStorePort = makeColorStore();
    await expect(
      makeService({ sessionProviderPort, userColorStorePort }).syncUserColors()
    ).rejects.toThrow("Error updating color store at UserColorSyncService");
  });

  // Sub-case 2a: authId && currAuthColor && currConfigColor !== currAuthColor
  describe("sub-case 2a — auth/config color mismatch", () => {
    it("removes the old authId entry before adding the new one", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        authId: "auth1",
        instanceColor: "#new",
        currConfigColor: "#cfg-color",
        currAuthColor: "#auth-color", // different from currConfigColor
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.removeUserColor).toHaveBeenCalledWith({
        authId: "auth1",
      });
    });

    it("adds the new color with configId and authId after removing", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        authId: "auth1",
        instanceColor: "#new",
        currConfigColor: "#cfg-color",
        currAuthColor: "#auth-color",
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.addUserColor).toHaveBeenCalledWith({
        color: "#new",
        configId: "cfg1",
        authId: "auth1",
      });
    });

    it("does NOT enter sub-case 2a when currAuthColor matches currConfigColor", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        authId: "auth1",
        instanceColor: "#same",
        currConfigColor: "#same",
        currAuthColor: "#same",
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.removeUserColor).not.toHaveBeenCalled();
    });
  });

  // Sub-case 2b: !currConfigColor || color !== currConfigColor || (authId && !currAuthColor)
  describe("sub-case 2b — add without removing", () => {
    it("adds when there is no existing currConfigColor", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        instanceColor: "#new",
        currConfigColor: undefined,
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.addUserColor).toHaveBeenCalledWith(
        expect.objectContaining({ color: "#new", configId: "cfg1" })
      );
    });

    it("adds when the instance color differs from the stored config color", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        instanceColor: "#new",
        currConfigColor: "#old",
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.addUserColor).toHaveBeenCalledWith(
        expect.objectContaining({ color: "#new" })
      );
    });

    it("adds when authId exists but no auth color is stored yet", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        authId: "auth1",
        instanceColor: "#same",
        currConfigColor: "#same",
        currAuthColor: undefined, // missing auth color
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.addUserColor).toHaveBeenCalledWith(
        expect.objectContaining({ authId: "auth1" })
      );
    });

    it("does not call addUserColor when color matches and auth color is consistent", async () => {
      const { sessionProviderPort, userColorStorePort } = setupCase2({
        // no authId → (authId && !currAuthColor) is false
        instanceColor: "#same",
        currConfigColor: "#same",
      });
      await makeService({
        sessionProviderPort,
        userColorStorePort,
      }).syncUserColors();
      expect(userColorStorePort.addUserColor).not.toHaveBeenCalled();
      expect(userColorStorePort.removeUserColor).not.toHaveBeenCalled();
    });
  });
});
