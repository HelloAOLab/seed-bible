import {
  FRIEND_REQUEST_LIFETIME_MS,
  FRIENDS_PERMISSION,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SharedMarkerPermission } from "@casual-simulation/aux-common";
import type { SharedPermission } from "@casual-simulation/aux-records";

/**
 * The signed-in user the fake answers as by default. A UUID, like every real
 * CasualOS user ID, since friend links refuse anything else.
 */
export const ME = "acdcacdc-0000-4000-8000-00000000beef";
const DAY_MS = 24 * 60 * 60 * 1000;

export type Failure = {
  success: false;
  errorCode: string;
  errorMessage: string;
};
export const fail = (errorCode: string): Failure => ({
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
export function fakeSharedPermissions(
  os: CasualOSManager,
  me: () => string | null
) {
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
