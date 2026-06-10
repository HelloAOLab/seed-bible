import {
  createAnnotationsManager,
  type Annotation,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

function createCommentAnnotation(
  overrides: Partial<Annotation> = {}
): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
    data: {
      type: "comment",
      html: "<p>Hello</p>",
    },
    ...overrides,
  };
}

describe("AnnotationsManager", () => {
  let recordDataMock: Mock;
  let eraseDataMock: Mock;
  let listDataByMarkerMock: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;

  beforeEach(() => {
    os = CasualOSManager();
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue({ success: true } as any);
    eraseDataMock = vi
      .spyOn(os, "eraseData")
      .mockResolvedValue({ success: true } as never);
    listDataByMarkerMock = vi
      .spyOn(os, "listDataByMarker")
      .mockResolvedValue({ success: true, items: [] } as never);

    login = {
      authBot: signal(null),
      userId: signal("user-1"),
      profile: signal(null),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      getUserProfile: vi.fn().mockResolvedValue({ name: "" }),
      uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("saveAnnotation() stores annotation using default marker", async () => {
    const manager = createAnnotationsManager(os, login);
    const annotation = createCommentAnnotation();

    const saved = await manager.saveAnnotation(annotation);

    expect(saved).toEqual(annotation);
    expect(recordDataMock).toHaveBeenCalledWith("user-1", "ann-1", annotation, {
      marker: "publicRead:annotations/GEN/1",
    });
  });

  it("saveAnnotation() supports custom record and marker group", async () => {
    const manager = createAnnotationsManager(os, login);
    const annotation = createCommentAnnotation({ id: "ann-2" });

    await manager.saveAnnotation(annotation, {
      recordName: "shared-record",
      group: "team_notes",
    });

    expect(recordDataMock).toHaveBeenCalledWith(
      "shared-record",
      "ann-2",
      annotation,
      {
        marker: "publicRead:team_notes/GEN/1",
      }
    );
  });

  it("saveAnnotation() logs in when no user is authenticated", async () => {
    login.userId.value = null;
    login.login.mockImplementation(async () => {
      login.userId.value = "user-after-login";
    });
    const manager = createAnnotationsManager(os, login);

    await manager.saveAnnotation(createCommentAnnotation());

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-after-login",
      "ann-1",
      expect.any(Object),
      {
        marker: "publicRead:annotations/GEN/1",
      }
    );
  });

  it("deleteAnnotation() deletes the record by annotation id", async () => {
    const manager = createAnnotationsManager(os, login);

    await manager.deleteAnnotation("ann-5");

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "ann-5");
  });

  it("deleteAnnotation() supports record names", async () => {
    const manager = createAnnotationsManager(os, login);

    await manager.deleteAnnotation("ann-5", {
      recordName: "shared-record",
    });

    expect(eraseDataMock).toHaveBeenCalledWith("shared-record", "ann-5");
  });

  it("listAnnotationsForChapter() paginates and sorts results", async () => {
    listDataByMarkerMock
      .mockResolvedValueOnce({
        success: true,
        items: [
          {
            address: "a1",
            data: createCommentAnnotation({ id: "b", order: 4 }),
          },
          {
            address: "a2",
            data: createCommentAnnotation({ id: "a", order: 1 }),
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        items: [
          {
            address: "a3",
            data: createCommentAnnotation({ id: "c" }),
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        items: [],
      });

    const manager = createAnnotationsManager(os, login);
    const annotations = await manager.listAnnotationsForChapter("GEN", 1);

    expect(listDataByMarkerMock).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "publicRead:annotations/GEN/1",
      undefined
    );
    expect(listDataByMarkerMock).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "publicRead:annotations/GEN/1",
      "a2"
    );
    expect(listDataByMarkerMock).toHaveBeenNthCalledWith(
      3,
      "user-1",
      "publicRead:annotations/GEN/1",
      "a3"
    );

    expect(annotations.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("listAnnotationsForChapter() skips invalid records", async () => {
    listDataByMarkerMock
      .mockResolvedValueOnce({
        success: true,
        items: [
          {
            address: "a1",
            data: createCommentAnnotation({ id: "valid" }),
          },
          {
            address: "a2",
            data: {
              id: "invalid",
              bookId: "GEN",
              chapterNumber: 1,
              data: {
                type: "unsupported",
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce({ success: true, items: [] });

    const manager = createAnnotationsManager(os, login);
    const annotations = await manager.listAnnotationsForChapter("GEN", 1);

    expect(annotations).toHaveLength(1);
    expect(annotations[0]?.id).toBe("valid");
  });

  it("operations throw when login cannot resolve a user record", async () => {
    login.userId.value = null;
    login.login.mockResolvedValue(undefined);
    const manager = createAnnotationsManager(os, login);

    await expect(
      manager.saveAnnotation(createCommentAnnotation())
    ).rejects.toThrow("Unable to resolve annotation record");
    await expect(manager.deleteAnnotation("ann-1")).rejects.toThrow(
      "Unable to resolve annotation record"
    );
    await expect(manager.listAnnotationsForChapter("GEN", 1)).rejects.toThrow(
      "Unable to resolve annotation record"
    );
  });

  it("save/delete/list throw when os call fails", async () => {
    recordDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });
    eraseDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "not_allowed",
    });
    listDataByMarkerMock.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });

    const manager = createAnnotationsManager(os, login);

    await expect(
      manager.saveAnnotation(createCommentAnnotation())
    ).rejects.toThrow("Error saving annotation: server_error");
    await expect(manager.deleteAnnotation("ann-1")).rejects.toThrow(
      "Error deleting annotation: not_allowed"
    );
    await expect(manager.listAnnotationsForChapter("GEN", 1)).rejects.toThrow(
      "Error listing annotations: server_error"
    );
  });
});
