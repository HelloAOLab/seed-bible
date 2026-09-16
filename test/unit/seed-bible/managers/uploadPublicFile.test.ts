import { uploadPublicFile } from "@packages/seed-bible/seed-bible/managers/uploadPublicFile";

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
