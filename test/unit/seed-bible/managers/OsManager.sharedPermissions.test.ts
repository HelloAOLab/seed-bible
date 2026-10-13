import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

import type { SharedMarkerPermission } from "@casual-simulation/aux-common";

const FRIENDS_READ: SharedMarkerPermission = {
  marker: "friends",
  resourceKind: "data",
  action: "read",
  options: {},
  expireTimeMs: null,
};

describe("CasualOSManager shared permissions", () => {
  let os: ReturnType<typeof CasualOSManager>;

  beforeEach(() => {
    os = CasualOSManager();
  });

  /**
   * Stands in for one of the SDK's procedures. Assigned rather than spied on:
   * the records client is a proxy, so `vi.spyOn` finds no own property to
   * replace.
   */
  const stubProcedure = <TInput>(
    name: string,
    impl: (input: TInput) => unknown
  ) => {
    const fn = vi.fn(async (input: TInput) => impl(input));
    (os.client as unknown as Record<string, unknown>)[name] = fn;
    return fn;
  };

  describe("requestSharedPermission()", () => {
    it("targets a user by ID", async () => {
      const request = stubProcedure("requestSharedPermission", () => ({
        success: true,
        sharedPermissionId: "sp-1",
      }));

      const result = await os.requestSharedPermission(
        "user-1",
        FRIENDS_READ,
        { userId: "user-2" },
        { expireTimeMs: 1234 }
      );

      expect(result).toEqual({ success: true, sharedPermissionId: "sp-1" });
      expect(request).toHaveBeenCalledWith({
        recordName: "user-1",
        permission: FRIENDS_READ,
        targetUserId: "user-2",
        targetUserEmail: undefined,
        expireTimeMs: 1234,
      });
    });

    it("targets a user by email", async () => {
      const request = stubProcedure("requestSharedPermission", () => ({
        success: true,
        sharedPermissionId: "sp-1",
      }));

      await os.requestSharedPermission("user-1", FRIENDS_READ, {
        email: "ben@example.com",
      });

      expect(request).toHaveBeenCalledWith({
        recordName: "user-1",
        permission: FRIENDS_READ,
        targetUserId: undefined,
        targetUserEmail: "ben@example.com",
        expireTimeMs: undefined,
      });
    });

    it("returns the server's failure rather than throwing", async () => {
      stubProcedure("requestSharedPermission", () => ({
        success: false,
        errorCode: "user_not_found",
        errorMessage:
          "The user with the given email address could not be found.",
      }));

      const result = await os.requestSharedPermission("user-1", FRIENDS_READ, {
        email: "nobody@example.com",
      });

      expect(result).toMatchObject({
        success: false,
        errorCode: "user_not_found",
      });
    });
  });

  describe("answering a request", () => {
    it("accepts into the accepter's own record", async () => {
      const accept = stubProcedure("acceptSharedPermission", () => ({
        success: true,
      }));

      const result = await os.acceptSharedPermission("sp-1", "user-2");

      expect(result).toEqual({ success: true });
      expect(accept).toHaveBeenCalledWith({
        sharedPermissionId: "sp-1",
        recordName: "user-2",
      });
    });

    it("passes an expired request's failure through", async () => {
      stubProcedure("acceptSharedPermission", () => ({
        success: false,
        errorCode: "shared_permission_expired",
        errorMessage: "The shared permission request has expired.",
      }));

      const result = await os.acceptSharedPermission("sp-1", "user-2");

      expect(result).toMatchObject({
        success: false,
        errorCode: "shared_permission_expired",
      });
    });

    it("rejects and revokes by ID", async () => {
      const reject = stubProcedure("rejectSharedPermission", () => ({
        success: true,
      }));
      const revoke = stubProcedure("revokeSharedPermission", () => ({
        success: true,
      }));

      await os.rejectSharedPermission("sp-1");
      await os.revokeSharedPermission("sp-2");

      expect(reject).toHaveBeenCalledWith({ sharedPermissionId: "sp-1" });
      expect(revoke).toHaveBeenCalledWith({ sharedPermissionId: "sp-2" });
    });
  });

  describe("listing", () => {
    const sharedRecord = (id: string) => ({
      recordName: `owner-${id}`,
      ownerUserId: `owner-${id}`,
      sharedPermissionId: id,
      permission: FRIENDS_READ,
    });

    it("collects every page of shared records", async () => {
      const pages = [
        [sharedRecord("a"), sharedRecord("b")],
        [sharedRecord("c")],
      ];
      const list = stubProcedure<{ page: number }>(
        "listSharedRecords",
        ({ page }) => ({
          success: true,
          sharedRecords: pages[page] ?? [],
          totalCount: 3,
        })
      );

      const result = await os.listAllSharedRecords();

      expect(result.map((r) => r.sharedPermissionId)).toEqual(["a", "b", "c"]);
      // The total is reached on the second page, so there's no third request.
      expect(list.mock.calls.map(([input]) => input.page)).toEqual([0, 1]);
    });

    it("returns nothing when there are no shares", async () => {
      const list = stubProcedure("listSharedRecords", () => ({
        success: true,
        sharedRecords: [],
        totalCount: 0,
      }));

      await expect(os.listAllSharedRecords()).resolves.toEqual([]);
      expect(list).toHaveBeenCalledTimes(1);
    });

    describe("findSentSharedPermission()", () => {
      const sentPages = [["a", "b"], ["c", "d"], ["e"]].map((ids) =>
        ids.map((id) => ({ id, targetUserId: `target-${id}` }))
      );
      const stubSent = () =>
        stubProcedure<{ page: number }>(
          "listSentSharedPermissions",
          ({ page }) => ({
            success: true,
            sharedPermissions: sentPages[page] ?? [],
            totalCount: 5,
          })
        );

      it("stops at the page holding the request", async () => {
        const list = stubSent();

        const found = await os.findSentSharedPermission("c");

        expect(found).toMatchObject({ id: "c", targetUserId: "target-c" });
        expect(list.mock.calls.map(([input]) => input.page)).toEqual([0, 1]);
      });

      it("is null when no page holds it", async () => {
        const list = stubSent();

        await expect(os.findSentSharedPermission("z")).resolves.toBeNull();
        expect(list.mock.calls.map(([input]) => input.page)).toEqual([0, 1, 2]);
      });
    });

    it("stops at an empty page even if the total says there's more", async () => {
      // A revoke landing mid-listing shrinks the real count below the total
      // the first page reported.
      const list = stubProcedure<{ page: number }>(
        "listSharedRecords",
        ({ page }) => ({
          success: true,
          sharedRecords: page === 0 ? [sharedRecord("a")] : [],
          totalCount: 5,
        })
      );

      const result = await os.listAllSharedRecords();

      expect(result.map((r) => r.sharedPermissionId)).toEqual(["a"]);
      expect(list).toHaveBeenCalledTimes(2);
    });

    it("pages until an empty page when the server leaves out the total", async () => {
      const pages = [[sharedRecord("a")], [sharedRecord("b")]];
      const list = stubProcedure<{ page: number }>(
        "listSharedRecords",
        ({ page }) => ({ success: true, sharedRecords: pages[page] ?? [] })
      );

      const result = await os.listAllSharedRecords();

      expect(result.map((r) => r.sharedPermissionId)).toEqual(["a", "b"]);
      expect(list).toHaveBeenCalledTimes(3);
    });

    it("stops when the server ignores the page and leaves out the total", async () => {
      // Gives up after a few pages, so a loop that never stops fails
      // instead of running the test out of memory.
      let pages = 0;
      const list = stubProcedure("listSharedRecords", () =>
        ++pages > 10
          ? { success: false, errorCode: "too_many_pages" }
          : {
              success: true,
              sharedRecords: [sharedRecord("a"), sharedRecord("b")],
            }
      );

      const result = await os.listAllSharedRecords();

      expect(result.map((r) => r.sharedPermissionId)).toEqual(["a", "b"]);
      expect(list).toHaveBeenCalledTimes(2);
    });

    it("throws when a page fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      stubProcedure("listSharedRecords", () => ({
        success: false,
        errorCode: "server_error",
        errorMessage: "A server error occurred.",
      }));

      await expect(os.listAllSharedRecords()).rejects.toThrow("server_error");
      consoleError.mockRestore();
    });

    it("lists sent and requested permissions", async () => {
      const permission = (id: string) => ({
        id,
        recordName: "user-1",
        requestingUserId: "user-1",
        targetUserId: "user-2",
        permission: FRIENDS_READ,
        status: "requested",
      });
      stubProcedure("listSentSharedPermissions", () => ({
        success: true,
        sharedPermissions: [permission("sent")],
        totalCount: 1,
      }));
      stubProcedure("listRequestedSharedPermissions", () => ({
        success: true,
        sharedPermissions: [permission("incoming")],
        totalCount: 1,
      }));

      const sent = await os.listAllSentSharedPermissions();
      const requested = await os.listAllRequestedSharedPermissions();

      expect(sent.map((p) => p.id)).toEqual(["sent"]);
      expect(requested.map((p) => p.id)).toEqual(["incoming"]);
    });
  });
});
