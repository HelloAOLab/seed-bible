import {
  createFriendsManager,
  FRIEND_REQUEST_LIFETIME_MS,
  FRIENDS_PERMISSION,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import {
  fail,
  fakeSharedPermissions,
  ME,
} from "../testUtils/fakeSharedPermissions";
import { effect, signal, type Signal } from "@preact/signals";
import { stubPageVisibility } from "../testUtils/pageVisibility";

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

  let created: FriendsManager[] = [];
  const create = (): FriendsManager => {
    const friends = createFriendsManager(os, login);
    created.push(friends);
    return friends;
  };
  afterEach(() => {
    for (const friends of created) {
      friends.dispose();
    }
    created = [];
  });

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
      getPublicProfile: vi.fn(async (id: string) => ({
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
          {
            userId: "ada",
            name: "Ada",
            pictureUrl: null,
            location: null,
            description: null,
          },
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

    // Everything that reads friends' content (Today's reading history, say)
    // reads it again when the friends list changes, and the lists refresh
    // every time the app comes back into focus.
    it("doesn't report a change when a refresh finds the same friends", async () => {
      server.friendsWith("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friends.value.map((f) => f.name)).toEqual(["Ada"])
      );
      let changes = 0;
      const stopWatching = effect(() => {
        void friends.friendIds.value;
        void friends.friends.value;
        changes++;
      });

      try {
        await friends.refresh();
        expect(changes).toBe(1);

        server.friendsWith("bob");
        await friends.refresh();
        expect(friends.friendIds.value).toEqual(["ada", "bob"]);
        expect(changes).toBeGreaterThan(1);
      } finally {
        stopWatching();
      }
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
    // Without the lists, the duplicate checks see nobody: a request to an
    // existing friend, or to someone who already asked, would go out anyway.
    it("won't send while the friends lists can't be loaded", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      server.friendsWith("ada");
      server.spies.listRecords.mockRejectedValue(new Error("offline"));
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.sendRequest({ userId: "ada" })).rejects.toThrow(
        "Couldn't load the friends lists"
      );
      expect(server.rows.map((r) => r.status)).toEqual(["accepted"]);
    });

    it("won't accept while the friends lists can't be loaded", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const request = server.requestFrom("ada");
      server.spies.listRecords.mockRejectedValue(new Error("offline"));
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.acceptRequest(request.id)).rejects.toThrow(
        "Couldn't load the friends lists"
      );
      expect(request.status).toBe("requested");
    });

    it("reads the lists again before sending when the first load failed", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      server.friendsWith("ada");
      server.spies.listRecords.mockRejectedValueOnce(new Error("offline"));
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.sendRequest({ userId: "ada" })).resolves.toEqual({
        status: "already_friends",
      });
      expect(server.rows).toHaveLength(1);
    });

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

    it("still reports a request by email as sent when it can't check who it reached", async () => {
      server.emails.set("ada@example.com", "ada");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const friends = create();
      await loaded(friends, () => {});
      // Listing what the user has sent fails, however it's asked for.
      server.spies.findSent.mockRejectedValueOnce(new Error("offline"));
      server.spies.listSent.mockRejectedValueOnce(new Error("offline"));

      try {
        await expect(
          friends.sendRequest({ email: "ada@example.com" })
        ).resolves.toMatchObject({ status: "sent" });
        expect(server.rows).toMatchObject([
          { requestingUserId: ME, targetUserId: "ada", status: "requested" },
        ]);
      } finally {
        warn.mockRestore();
        error.mockRestore();
      }
    });

    it("still reports an existing friendship when taking back a request by email fails", async () => {
      server.friendsWith("ada");
      server.emails.set("ada@example.com", "ada");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const friends = create();
      await loaded(friends, () => {});
      server.spies.revoke.mockResolvedValueOnce(fail("server_error") as never);

      try {
        await expect(
          friends.sendRequest({ email: "ada@example.com" })
        ).resolves.toEqual({ status: "already_friends" });
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining("Couldn't take back friend request"),
          "server_error"
        );
      } finally {
        warn.mockRestore();
      }
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
        {
          userId: "ada",
          name: "Ada",
          pictureUrl: null,
          location: null,
          description: null,
        },
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

    it("accepting withdraws the request you'd also sent them", async () => {
      // Both people asked at once.
      const theirs = server.requestFrom("ada");
      const mine = server.requestTo("ada");
      const friends = create();
      await loaded(friends, () => {});

      await friends.acceptRequest(theirs.id);

      expect(theirs.status).toBe("accepted");
      expect(mine.status).toBe("revoked");
      expect(friends.friendIds.value).toEqual(["ada"]);
    });

    it("declining ends every request waiting from that person", async () => {
      // Sent from two devices before either saw the other.
      const older = server.requestFrom("ada");
      const newer = server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.incomingRequests.value).toMatchObject([{ id: newer.id }])
      );

      await friends.declineRequest(newer.id);

      expect(older.status).toBe("rejected");
      expect(newer.status).toBe("rejected");
      expect(friends.incomingRequests.value).toEqual([]);
    });

    it("cancelling withdraws every request you sent that person", async () => {
      const older = server.requestTo("ada");
      const newer = server.requestTo("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.outgoingRequests.value).toMatchObject([{ id: newer.id }])
      );

      await friends.cancelRequest(newer.id);

      expect(older.status).toBe("revoked");
      expect(newer.status).toBe("revoked");
      expect(friends.outgoingRequests.value).toEqual([]);
    });

    it("treats a request that's already gone as done", async () => {
      const request = server.requestFrom("ada", { status: "revoked" });
      const friends = create();
      await loaded(friends, () => {});

      await expect(friends.declineRequest(request.id)).resolves.toBeUndefined();
    });
  });

  describe("coming back to the app", () => {
    const START = Date.UTC(2026, 9, 5, 12);
    let page: ReturnType<typeof stubPageVisibility>;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(START);
      page = stubPageVisibility();
    });
    afterEach(() => {
      page.restore();
      vi.useRealTimers();
    });

    const listings = () => server.spies.listRecords.mock.calls.length;

    it("reads the lists again after more than 30 seconds away, not sooner", async () => {
      const friends = create();
      await loaded(friends, () => {});
      const before = listings();

      vi.setSystemTime(START + 10_000);
      page.leaveAndReturn();
      await Promise.resolve();
      expect(listings()).toBe(before);

      vi.setSystemTime(START + 31_000);
      page.leaveAndReturn();
      await vi.waitFor(() => expect(listings()).toBe(before + 1));
    });

    it("stops once disposed", async () => {
      const friends = create();
      await loaded(friends, () => {});
      const before = listings();

      friends.dispose();
      vi.setSystemTime(START + 31_000);
      page.leaveAndReturn();
      await Promise.resolve();

      expect(listings()).toBe(before);
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

    // Both people asked at once and one request was accepted, so the other is
    // still waiting. If it outlived the friendship, its recipient could accept
    // it and restore the friendship without the other person.
    it("declines a leftover request from them, without ever showing it", async () => {
      server.friendsWith("ada");
      const leftover = server.requestFrom("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toEqual(["ada"])
      );
      const shown: string[] = [];
      const stopWatching = effect(() => {
        for (const request of friends.incomingRequests.value) {
          shown.push(request.userId);
        }
      });

      await friends.unfriend("ada");
      stopWatching();

      expect(leftover.status).toBe("rejected");
      expect(shown).toEqual([]);
      expect(friends.incomingRequests.value).toEqual([]);
      expect(friends.friendIds.value).toEqual([]);
    });

    it("withdraws a leftover request you sent them", async () => {
      server.friendsWith("ada");
      const leftover = server.requestTo("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toEqual(["ada"])
      );

      await friends.unfriend("ada");

      expect(leftover.status).toBe("revoked");
      expect(friends.outgoingRequests.value).toEqual([]);
    });

    it("ends a leftover request that arrived after the lists were last read", async () => {
      server.friendsWith("ada");
      const friends = create();
      await loaded(friends, () =>
        expect(friends.friendIds.value).toEqual(["ada"])
      );
      const leftover = server.requestFrom("ada");

      await friends.unfriend("ada");

      expect(leftover.status).toBe("rejected");
      expect(friends.incomingRequests.value).toEqual([]);
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
