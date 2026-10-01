import {
  createFriendsManager,
  FRIEND_REQUEST_LIFETIME_MS,
  FRIENDS_PERMISSION,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SharedMarkerPermission } from "@casual-simulation/aux-common";
import type { SharedPermission } from "@casual-simulation/aux-records";
import { signal, type Signal } from "@preact/signals";

const ME = "me";
const DAY_MS = 24 * 60 * 60 * 1000;

type Failure = { success: false; errorCode: string; errorMessage: string };
const fail = (errorCode: string): Failure => ({
  success: false,
  errorCode,
  errorMessage: errorCode,
});

/**
 * An in-memory stand-in for the records server's shared permissions, applying
 * the same rules CasualOS does (see `SharedPermissionsController`): only the
 * target can accept or reject, accepting an accepted request is a no-op
 * success, expired requests keep `status: "requested"`, and the listings
 * return every status.
 */
function fakeSharedPermissions(os: CasualOSManager, me: () => string | null) {
  const rows: SharedPermission[] = [];
  const emails = new Map<string, string>();
  let nextId = 1;

  const addRow = (
    overrides: Partial<SharedPermission> & {
      requestingUserId: string;
      targetUserId: string;
    }
  ): SharedPermission => {
    const now = Date.now();
    const row: SharedPermission = {
      id: `sp-${nextId++}`,
      recordName: overrides.requestingUserId,
      permission: FRIENDS_PERMISSION,
      status: "requested",
      createdAtMs: now + nextId,
      updatedAtMs: now,
      expireTimeMs: now + FRIEND_REQUEST_LIFETIME_MS,
      recipientRecordName: null,
      recipientUserId: null,
      requestingPermissionAssignmentId: null,
      recipientPermissionAssignmentId: null,
      ...overrides,
    };
    rows.push(row);
    return row;
  };

  const otherParty = (row: SharedPermission, userId: string) =>
    row.requestingUserId === userId
      ? row.recipientUserId
      : row.requestingUserId;

  const spies = {
    request: vi.spyOn(os, "requestSharedPermission").mockImplementation((async (
      _recordName: string,
      permission: SharedMarkerPermission,
      target: { userId: string } | { email: string },
      options?: { expireTimeMs?: number }
    ) => {
      const userId = me();
      if (!userId) return fail("not_logged_in");
      const targetUserId =
        "userId" in target ? target.userId : emails.get(target.email);
      if (!targetUserId) return fail("user_not_found");
      const row = addRow({
        requestingUserId: userId,
        targetUserId,
        permission,
        expireTimeMs: options?.expireTimeMs ?? Date.now() + DAY_MS,
      });
      return { success: true, sharedPermissionId: row.id };
    }) as never),
    accept: vi.spyOn(os, "acceptSharedPermission").mockImplementation((async (
      id: string,
      recordName: string
    ) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return fail("not_found");
      if (row.status === "accepted") return { success: true };
      if (row.status !== "requested") return fail("invalid_request");
      if (row.targetUserId && row.targetUserId !== me())
        return fail("not_authorized");
      if (row.expireTimeMs !== null && Date.now() >= row.expireTimeMs)
        return fail("shared_permission_expired");
      Object.assign(row, {
        status: "accepted",
        expireTimeMs: null,
        recipientUserId: me(),
        recipientRecordName: recordName,
      });
      return { success: true };
    }) as never),
    reject: vi.spyOn(os, "rejectSharedPermission").mockImplementation((async (
      id: string
    ) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return fail("not_found");
      if (row.status !== "requested") return fail("invalid_request");
      if (row.targetUserId !== me()) return fail("not_authorized");
      row.status = "rejected";
      return { success: true };
    }) as never),
    revoke: vi.spyOn(os, "revokeSharedPermission").mockImplementation((async (
      id: string
    ) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return fail("not_found");
      if (row.status === "rejected" || row.status === "revoked")
        return fail("invalid_request");
      const isParty =
        row.requestingUserId === me() ||
        (row.status === "accepted" && row.recipientUserId === me());
      if (!isParty) return fail("not_authorized");
      row.status = "revoked";
      return { success: true };
    }) as never),
    listRecords: vi
      .spyOn(os, "listAllSharedRecords")
      .mockImplementation(async () => {
        const userId = me()!;
        return rows
          .filter(
            (r) =>
              r.status === "accepted" &&
              (r.requestingUserId === userId || r.recipientUserId === userId)
          )
          .map((r) => ({
            recordName: otherParty(r, userId)!,
            ownerUserId: otherParty(r, userId)!,
            sharedPermissionId: r.id,
            permission: r.permission,
          }));
      }),
    listRequested: vi
      .spyOn(os, "listAllRequestedSharedPermissions")
      .mockImplementation(async () =>
        rows.filter((r) => r.targetUserId === me())
      ),
    listSent: vi
      .spyOn(os, "listAllSentSharedPermissions")
      .mockImplementation(async () =>
        rows.filter((r) => r.requestingUserId === me())
      ),
  };

  return {
    rows,
    emails,
    spies,
    /** Someone else asking the signed-in user to be friends. */
    requestFrom: (
      userId: string,
      overrides: Omit<
        Partial<SharedPermission>,
        "requestingUserId" | "targetUserId"
      > = {}
    ) => addRow({ requestingUserId: userId, targetUserId: ME, ...overrides }),
    /** The signed-in user asking `userId` to be friends. */
    requestTo: (userId: string) =>
      addRow({ requestingUserId: ME, targetUserId: userId }),
    /** An accepted friendship between the signed-in user and `userId`. */
    friendsWith: (userId: string) =>
      addRow({
        requestingUserId: userId,
        targetUserId: ME,
        status: "accepted",
        expireTimeMs: null,
        recipientUserId: ME,
        recipientRecordName: ME,
      }),
  };
}

describe("FriendsManager", () => {
  let os: CasualOSManager;
  let userId: Signal<string | null>;
  let login: LoginManager;
  let server: ReturnType<typeof fakeSharedPermissions>;

  const names: Record<string, string> = {
    ada: "Ada",
    bob: "Bob",
    cal: "Cal",
  };

  const create = (): FriendsManager => createFriendsManager(os, login);

  /** Waits for the sign-in refresh (and the profile loads it starts) to land. */
  const loaded = async (friends: FriendsManager, check: () => void) => {
    await vi.waitFor(() => {
      expect(friends.isLoading.value).toBe(false);
      check();
    });
  };

  beforeEach(() => {
    os = CasualOSManager();
    userId = signal<string | null>(ME);
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getUserProfile: vi.fn(async (id: string) => ({
        name: names[id] ?? "",
        pictureUrl: null,
      })),
    } as unknown as LoginManager;
    server = fakeSharedPermissions(os, () => userId.peek());
  });

  describe("loading", () => {
    it("lists friends and pending requests with their names once signed in", async () => {
      server.friendsWith("ada");
      server.requestFrom("bob");
      const sent = server.requestTo("cal");

      const friends = create();

      await loaded(friends, () => {
        expect(friends.friends.value).toEqual([
          { userId: "ada", name: "Ada", pictureUrl: null },
        ]);
        expect(friends.incomingRequests.value).toMatchObject([
          { userId: "bob", name: "Bob" },
        ]);
        expect(friends.outgoingRequests.value).toMatchObject([
          { id: sent.id, userId: "cal", name: "Cal" },
        ]);
      });
    });

    it("leaves out requests that were answered, expired, or aren't friend requests", async () => {
      server.requestFrom("ada", { status: "rejected" });
      server.requestFrom("bob", { expireTimeMs: Date.now() - 1 });
      server.requestFrom("cal", {
        permission: { ...FRIENDS_PERMISSION, marker: "somethingElse" },
      });

      const friends = create();

      await loaded(friends, () => {
        expect(server.spies.listRequested).toHaveBeenCalled();
        expect(friends.incomingRequests.value).toEqual([]);
      });
    });

    it("shows a person once when they're connected more than once", async () => {
      server.friendsWith("ada");
      server.friendsWith("ada");

      const friends = create();

      await loaded(friends, () => {
        expect(friends.friendIds.value).toEqual(["ada"]);
      });
    });

    it("hides a pending request from someone who is already a friend", async () => {
      // Both people asked at once and one of the requests was accepted.
      server.friendsWith("ada");
      server.requestFrom("ada");

      const friends = create();

      await loaded(friends, () => {
        expect(friends.friendIds.value).toEqual(["ada"]);
        expect(friends.incomingRequests.value).toEqual([]);
      });
    });

    it("is empty and makes no requests while signed out", async () => {
      userId.value = null;
      server.friendsWith("ada");

      const friends = create();
      await Promise.resolve();

      expect(friends.friends.value).toEqual([]);
      expect(server.spies.listRecords).not.toHaveBeenCalled();
    });

    it("clears everything on sign-out", async () => {
      server.friendsWith("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toEqual(["ada"])
      );

      userId.value = null;

      expect(friends.friends.value).toEqual([]);
    });

    it("drops a response for an account that was switched away from", async () => {
      server.friendsWith("ada");
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const listRecords = server.spies.listRecords.getMockImplementation()!;
      server.spies.listRecords.mockImplementationOnce(async () => {
        const records = await listRecords();
        await gate;
        return records;
      });

      const friends = create();
      userId.value = "someone-else";
      release();

      await loaded(friends, () => {
        expect(server.spies.listRecords).toHaveBeenCalledTimes(2);
      });
      // Ada is a friend of `me`, not of the account signed in now.
      expect(friends.friendIds.value).toEqual([]);
    });

    it("keeps what it had when a refresh fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      server.friendsWith("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toEqual(["ada"])
      );

      server.spies.listRecords.mockRejectedValueOnce(new Error("offline"));
      await friends.refresh();

      expect(friends.friendIds.value).toEqual(["ada"]);
    });
  });

  describe("sendRequest()", () => {
    it("sends a request that waits seven days for an answer", async () => {
      const friends = create();
      await loaded(friends, () => {});

      const result = await friends.sendRequest({ userId: "ada" });

      expect(result).toMatchObject({ status: "sent" });
      const sent = server.rows.find((r) => r.targetUserId === "ada")!;
      expect(sent.permission).toEqual(FRIENDS_PERMISSION);
      expect(sent.expireTimeMs! - Date.now()).toBeGreaterThan(
        FRIEND_REQUEST_LIFETIME_MS - 60_000
      );
      expect(friends.outgoingRequests.value).toMatchObject([
        { userId: "ada", id: sent.id },
      ]);
    });

    it("won't send a request to yourself", async () => {
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.sendRequest({ userId: ME })).resolves.toEqual({
        status: "self",
      });
      expect(server.rows).toEqual([]);
    });

    it("reports an existing friendship instead of asking again", async () => {
      server.friendsWith("ada");
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.sendRequest({ userId: "ada" })).resolves.toEqual({
        status: "already_friends",
      });
      expect(server.rows).toHaveLength(1);
    });

    it("reports a request that's already waiting instead of sending another", async () => {
      const friends = create();
      await loaded(friends, () => {});
      const first = await friends.sendRequest({ userId: "ada" });

      const second = await friends.sendRequest({ userId: "ada" });

      expect(second).toEqual({
        status: "already_requested",
        requestId: first.status === "sent" ? first.requestId : "",
      });
      expect(server.rows).toHaveLength(1);
    });

    it("accepts their request when they already asked", async () => {
      server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.sendRequest({ userId: "ada" })).resolves.toEqual({
        status: "accepted",
      });
      expect(friends.friendIds.value).toEqual(["ada"]);
      expect(friends.incomingRequests.value).toEqual([]);
      // Accepting theirs means no second request was created.
      expect(server.rows).toHaveLength(1);
    });

    it("sends by email", async () => {
      server.emails.set("ada@example.com", "ada");
      const friends = create();
      await loaded(friends, () => {});

      const result = await friends.sendRequest({ email: "ada@example.com" });

      expect(result).toMatchObject({ status: "sent" });
      expect(friends.outgoingRequests.value).toMatchObject([{ userId: "ada" }]);
    });

    it("reports an email with no account", async () => {
      const friends = create();
      await loaded(friends, () => {});

      await expect(
        friends.sendRequest({ email: "nobody@example.com" })
      ).resolves.toEqual({ status: "user_not_found" });
    });

    it("takes back a request by email that turns out to be for an existing friend", async () => {
      server.friendsWith("ada");
      server.emails.set("ada@example.com", "ada");
      const friends = create();
      await loaded(friends, () => {});

      await expect(
        friends.sendRequest({ email: "ada@example.com" })
      ).resolves.toEqual({ status: "already_friends" });
      const sentByMe = server.rows.filter((r) => r.requestingUserId === ME);
      expect(sentByMe.map((r) => r.status)).toEqual(["revoked"]);
      expect(friends.outgoingRequests.value).toEqual([]);
    });

    it("takes back a request by email to your own address", async () => {
      server.emails.set("me@example.com", ME);
      const friends = create();
      await loaded(friends, () => {});

      await expect(
        friends.sendRequest({ email: "me@example.com" })
      ).resolves.toEqual({ status: "self" });
      expect(server.rows.map((r) => r.status)).toEqual(["revoked"]);
    });

    it("asks the user to sign in first, and gives up if they don't", async () => {
      userId.value = null;
      const friends = create();

      await expect(friends.sendRequest({ userId: "ada" })).resolves.toEqual({
        status: "not_signed_in",
      });
      expect(login.login).toHaveBeenCalled();
      expect(server.rows).toEqual([]);
    });
  });

  describe("answering requests", () => {
    it("accepting makes them a friend", async () => {
      const request = server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.acceptRequest(request.id)).resolves.toEqual({
        success: true,
      });
      expect(friends.friends.value).toEqual([
        { userId: "ada", name: "Ada", pictureUrl: null },
      ]);
      expect(friends.incomingRequests.value).toEqual([]);
    });

    it("reports an expired request", async () => {
      const request = server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () => {});
      request.expireTimeMs = Date.now() - 1;

      await expect(friends.acceptRequest(request.id)).resolves.toEqual({
        success: false,
        reason: "expired",
      });
      expect(friends.friendIds.value).toEqual([]);
    });

    it("reports a request that was withdrawn", async () => {
      const request = server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () => {});
      request.status = "revoked";

      await expect(friends.acceptRequest(request.id)).resolves.toEqual({
        success: false,
        reason: "unavailable",
      });
      expect(friends.incomingRequests.value).toEqual([]);
    });

    it("declining removes the request without making them a friend", async () => {
      const request = server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () => {});

      await friends.declineRequest(request.id);

      expect(request.status).toBe("rejected");
      expect(friends.incomingRequests.value).toEqual([]);
      expect(friends.friendIds.value).toEqual([]);
    });

    it("cancelling withdraws a request you sent", async () => {
      const friends = create();
      await loaded(friends, () => {});
      const sent = await friends.sendRequest({ userId: "ada" });

      await friends.cancelRequest(sent.status === "sent" ? sent.requestId : "");

      expect(friends.outgoingRequests.value).toEqual([]);
      expect(server.rows[0]!.status).toBe("revoked");
    });

    it("treats a request that's already gone as done", async () => {
      const request = server.requestFrom("ada", { status: "revoked" });
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.declineRequest(request.id)).resolves.toBeUndefined();
    });
  });

  describe("unfriend()", () => {
    it("ends every connection with that person", async () => {
      const first = server.friendsWith("ada");
      const second = server.friendsWith("ada");
      server.friendsWith("bob");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toHaveLength(2)
      );

      await friends.unfriend("ada");

      expect(first.status).toBe("revoked");
      expect(second.status).toBe("revoked");
      expect(friends.friendIds.value).toEqual(["bob"]);
    });

    it("puts the friend back and throws when the server refuses", async () => {
      server.friendsWith("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toEqual(["ada"])
      );
      server.spies.revoke.mockResolvedValueOnce(fail("server_error") as never);

      await expect(friends.unfriend("ada")).rejects.toThrow("server_error");
      expect(friends.friendIds.value).toEqual(["ada"]);
    });
  });
});
