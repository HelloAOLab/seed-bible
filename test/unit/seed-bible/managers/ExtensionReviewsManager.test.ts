import { signal, type Signal } from "@preact/signals";
import { createExtensionReviewsManager } from "@packages/seed-bible/seed-bible/managers/ExtensionReviewsManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

const RECORD = "seed-bible-reviews";
const VERSE_ART = "https://ext.example.com/verse-art/#ext.verse-art";

async function waitForCondition(check: () => boolean, timeoutMs = 1000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitForCondition timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("ExtensionReviewsManager", () => {
  let os: CasualOSManager;
  let getData: ReturnType<typeof vi.fn>;
  let recordData: ReturnType<typeof vi.fn>;
  let listPermissions: ReturnType<typeof vi.fn>;
  let userId: Signal<string | null>;

  beforeEach(() => {
    os = CasualOSManager();
    getData = vi.fn().mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "The data was not found.",
    });
    recordData = vi.fn().mockResolvedValue({ success: true });
    listPermissions = vi.fn().mockResolvedValue({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "You are not authorized to perform this action.",
    });
    // The records client is a proxy, so the SDK methods are assigned, not spied on.
    Object.assign(os.client, { getData, recordData, listPermissions });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    userId = signal<string | null>(null);
  });

  const create = (recordName: string | null = RECORD) =>
    createExtensionReviewsManager(os, { userId }, recordName);

  describe("reading", () => {
    it("reads an extension's verification from the record, at its full id", async () => {
      getData.mockResolvedValue({
        success: true,
        data: {
          verified: true,
          verifiedAtMs: 3,
          publicNotes: "Published by the Verse Art team.",
          updatedAtMs: 5,
        },
      });
      const reviews = create();

      expect(await reviews.load(VERSE_ART)).toEqual({
        verified: true,
        verifiedAtMs: 3,
        publicNotes: "Published by the Verse Art team.",
        updatedAtMs: 5,
      });
      expect(getData).toHaveBeenCalledWith({
        recordName: RECORD,
        address: VERSE_ART,
      });
      expect(reviews.reviews.value[VERSE_ART]).toMatchObject({
        verified: true,
      });
    });

    it("asks only once per extension, even for overlapping lookups", async () => {
      const reviews = create();

      await Promise.all([reviews.load(VERSE_ART), reviews.load(VERSE_ART)]);
      await reviews.load(VERSE_ART);

      expect(getData).toHaveBeenCalledTimes(1);
    });

    it("counts an extension the record says nothing about as unverified", async () => {
      const reviews = create();

      expect(await reviews.load(VERSE_ART)).toBeNull();
      expect(reviews.reviews.value).toEqual({ [VERSE_ART]: null });
    });

    it("ignores fields of the wrong type", async () => {
      getData.mockResolvedValue({
        success: true,
        data: { verified: "yes", verifiedAtMs: "today", publicNotes: 7 },
      });
      const reviews = create();

      expect(await reviews.load(VERSE_ART)).toEqual({ verified: false });
    });

    it("tries again later when the record couldn't be read", async () => {
      getData.mockRejectedValueOnce(new Error("offline"));
      const reviews = create();

      expect(await reviews.load(VERSE_ART)).toBeNull();
      expect(reviews.reviews.value).toEqual({});

      getData.mockResolvedValueOnce({
        success: true,
        data: { verified: true },
      });
      expect(await reviews.load(VERSE_ART)).toMatchObject({ verified: true });
    });

    it("reads nothing when the build has no reviews record", async () => {
      const reviews = create(null);

      expect(await reviews.load(VERSE_ART)).toBeNull();
      expect(getData).not.toHaveBeenCalled();
    });

    it("doesn't ask about an id too long to be a record address", async () => {
      const reviews = create();

      expect(await reviews.load(`https://x/#${"a".repeat(600)}`)).toBeNull();
      expect(getData).not.toHaveBeenCalled();
    });
  });

  describe("who can verify extensions", () => {
    it("is nobody while signed out", async () => {
      listPermissions.mockResolvedValue({ success: true });
      const reviews = create();

      await Promise.resolve();
      expect(reviews.canManage.value).toBe(false);
      expect(listPermissions).not.toHaveBeenCalled();
    });

    it("is a signed-in admin of the reviews record", async () => {
      listPermissions.mockResolvedValue({ success: true });
      const reviews = create();

      userId.value = "admin-1";

      await waitForCondition(() => reviews.canManage.value);
      expect(listPermissions).toHaveBeenCalledWith({ recordName: RECORD });
    });

    it("isn't someone the record refuses", async () => {
      const reviews = create();

      userId.value = "user-1";
      await waitForCondition(() => listPermissions.mock.calls.length > 0);
      await Promise.resolve();

      expect(reviews.canManage.value).toBe(false);
    });

    it("stops being the admin once they sign out", async () => {
      listPermissions.mockResolvedValue({ success: true });
      const reviews = create();
      userId.value = "admin-1";
      await waitForCondition(() => reviews.canManage.value);

      userId.value = null;

      expect(reviews.canManage.value).toBe(false);
    });

    it("ignores an answer about an account that's since signed out", async () => {
      let answer!: (result: { success: boolean }) => void;
      listPermissions.mockReturnValueOnce(
        new Promise((resolve) => (answer = resolve))
      );
      const reviews = create();
      userId.value = "admin-1";
      userId.value = null;

      answer({ success: true });
      await Promise.resolve();
      await Promise.resolve();

      expect(reviews.canManage.value).toBe(false);
    });
  });

  describe("internal notes", () => {
    it("are read from a private entry beside the public one", async () => {
      getData.mockResolvedValue({
        success: true,
        data: { internalNotes: "Checked the publisher's domain." },
      });
      const reviews = create();

      expect(await reviews.loadInternalNotes(VERSE_ART)).toBe(
        "Checked the publisher's domain."
      );
      expect(getData).toHaveBeenCalledWith({
        recordName: RECORD,
        address: `internal/${VERSE_ART}`,
      });
    });

    it("are empty for an extension nobody has written any for", async () => {
      const reviews = create();

      expect(await reviews.loadInternalNotes(VERSE_ART)).toBe("");
    });

    it("are null when the record won't let them be read", async () => {
      getData.mockResolvedValue({
        success: false,
        errorCode: "not_authorized",
      });
      const reviews = create();

      expect(await reviews.loadInternalNotes(VERSE_ART)).toBeNull();
    });
  });

  describe("verifying an extension", () => {
    const DETAILS = {
      verifiedAtMs: Date.UTC(2026, 10, 1),
      publicNotes: "  Published by the Verse Art team.  ",
      internalNotes: "Checked the publisher's domain.",
    };

    it("saves the public details for everyone and the internal notes privately", async () => {
      userId.value = "admin-1";
      const reviews = create();

      expect(await reviews.verify(VERSE_ART, DETAILS)).toBe(true);

      expect(recordData).toHaveBeenCalledWith({
        recordKey: RECORD,
        address: VERSE_ART,
        data: {
          verified: true,
          verifiedAtMs: DETAILS.verifiedAtMs,
          publicNotes: "Published by the Verse Art team.",
          updatedBy: "admin-1",
          updatedAtMs: expect.any(Number),
        },
        markers: ["publicRead"],
      });
      expect(recordData).toHaveBeenCalledWith({
        recordKey: RECORD,
        address: `internal/${VERSE_ART}`,
        data: expect.objectContaining({
          internalNotes: "Checked the publisher's domain.",
        }),
        markers: ["private"],
      });
      // The internal notes never reach the public entry.
      const publicWrite = recordData.mock.calls.find(
        ([request]) => request.address === VERSE_ART
      )![0];
      expect(JSON.stringify(publicWrite.data)).not.toContain("domain");
      expect(await reviews.load(VERSE_ART)).toMatchObject({
        verified: true,
        verifiedAtMs: DETAILS.verifiedAtMs,
      });
      expect(getData).not.toHaveBeenCalled();
    });

    it("leaves out public notes that are only spaces", async () => {
      const reviews = create();

      await reviews.verify(VERSE_ART, { ...DETAILS, publicNotes: "   " });

      expect(reviews.reviews.value[VERSE_ART]).not.toHaveProperty(
        "publicNotes"
      );
    });

    it("doesn't mark it verified when the internal notes are refused", async () => {
      recordData.mockImplementation(async (request: { address: string }) =>
        request.address.startsWith("internal/")
          ? { success: false, errorCode: "not_authorized" }
          : { success: true }
      );
      const reviews = create();

      expect(await reviews.verify(VERSE_ART, DETAILS)).toBe(false);
      expect(recordData).not.toHaveBeenCalledWith(
        expect.objectContaining({ address: VERSE_ART })
      );
      expect(reviews.reviews.value[VERSE_ART]).toBeUndefined();
    });

    it("keeps the old verification when the record refuses the change", async () => {
      getData.mockResolvedValue({
        success: true,
        data: { verified: true, verifiedAtMs: 1 },
      });
      recordData.mockImplementation(async (request: { address: string }) =>
        request.address === VERSE_ART
          ? { success: false, errorCode: "not_authorized" }
          : { success: true }
      );
      const reviews = create();
      await reviews.load(VERSE_ART);

      expect(await reviews.verify(VERSE_ART, DETAILS)).toBe(false);
      expect(reviews.reviews.value[VERSE_ART]).toEqual({
        verified: true,
        verifiedAtMs: 1,
      });
    });

    it("isn't overwritten by a lookup that was already under way", async () => {
      let answer!: (result: unknown) => void;
      getData.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
      const reviews = create();
      const loading = reviews.load(VERSE_ART);

      await reviews.verify(VERSE_ART, DETAILS);
      answer({ success: false, errorCode: "data_not_found" });

      expect(await loading).toMatchObject({ verified: true });
      expect(reviews.reviews.value[VERSE_ART]).toMatchObject({
        verified: true,
      });
    });

    it("can't be saved without a reviews record", async () => {
      const reviews = create(null);

      expect(await reviews.verify(VERSE_ART, DETAILS)).toBe(false);
      expect(recordData).not.toHaveBeenCalled();
    });

    it("can be taken away, leaving the internal notes alone", async () => {
      const reviews = create();
      await reviews.verify(VERSE_ART, DETAILS);
      recordData.mockClear();

      expect(await reviews.unverify(VERSE_ART)).toBe(true);

      expect(recordData).toHaveBeenCalledTimes(1);
      expect(recordData).toHaveBeenCalledWith({
        recordKey: RECORD,
        address: VERSE_ART,
        data: expect.objectContaining({ verified: false }),
        markers: ["publicRead"],
      });
      expect(reviews.reviews.value[VERSE_ART]).toMatchObject({
        verified: false,
      });
    });
  });
});
