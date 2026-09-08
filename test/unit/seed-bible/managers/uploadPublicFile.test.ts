import {
  resolveCoverImageUpload,
  uploadCoverImageForUser,
  uploadPublicFile,
} from "@packages/seed-bible/seed-bible/managers/uploadPublicFile";

describe("uploadPublicFile", () => {
  it("records the file with public-read access and returns its URL", async () => {
    const recordFile = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/file.jpg",
    });
    const file = new File([new Uint8Array([1])], "cover.jpg", {
      type: "image/jpeg",
    });

    await expect(
      uploadPublicFile({ recordFile }, "user-1", file)
    ).resolves.toBe("https://example.com/file.jpg");
    expect(recordFile).toHaveBeenCalledWith("user-1", file, {
      mimeType: "image/jpeg",
      marker: "publicRead",
    });
  });

  it("throws when the records call fails", async () => {
    const recordFile = vi.fn().mockResolvedValue({ success: false });
    await expect(
      uploadPublicFile(
        { recordFile },
        "user-1",
        new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow("Failed to upload file");
  });
});

describe("uploadCoverImageForUser", () => {
  it("throws when signed out", async () => {
    const recordFile = vi.fn();
    await expect(
      uploadCoverImageForUser(
        { recordFile },
        null,
        new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow("Cannot upload a cover image while signed out.");
    expect(recordFile).not.toHaveBeenCalled();
  });
});

describe("resolveCoverImageUpload", () => {
  const file = new File([new Uint8Array([1])], "cover.jpg", {
    type: "image/jpeg",
  });

  it("uploads through os when a user id is present, even if the manager method is missing", async () => {
    const recordFile = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/hero.jpg",
    });

    await expect(
      resolveCoverImageUpload(file, {
        os: { recordFile },
        userId: "user-1",
      })
    ).resolves.toBe("https://example.com/hero.jpg");
    expect(recordFile).toHaveBeenCalledTimes(1);
  });

  it("falls back to the manager method when os or user id is missing", async () => {
    const upload = vi
      .fn()
      .mockResolvedValue("https://example.com/fallback.jpg");

    await expect(
      resolveCoverImageUpload(file, { upload, userId: null })
    ).resolves.toBe("https://example.com/fallback.jpg");
    expect(upload).toHaveBeenCalledWith(file);
  });

  it("throws a signed-out error when neither path is available", async () => {
    await expect(resolveCoverImageUpload(file, {})).rejects.toThrow(
      "Cannot upload a cover image while signed out."
    );
  });
});
