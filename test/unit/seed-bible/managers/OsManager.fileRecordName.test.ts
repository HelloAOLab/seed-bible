import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

describe("CasualOSManager.getFileRecordName()", () => {
  let os: ReturnType<typeof CasualOSManager>;
  let getFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    os = CasualOSManager();
    getFile = vi.fn();
    // The records client is a proxy, so the SDK method is assigned, not spied on.
    (os.client as unknown as { getFile: unknown }).getFile = getFile;
  });

  it("names the record a file in the server's storage was uploaded to", async () => {
    getFile.mockResolvedValue({
      success: true,
      requestUrl: "https://filesbucket.s3.amazonaws.com/user%201/abc.js",
      requestMethod: "GET",
      requestHeaders: {},
    });

    expect(
      await os.getFileRecordName(
        "https://filesbucket.s3.amazonaws.com/user%201/abc.js"
      )
    ).toBe("user 1");
    expect(getFile).toHaveBeenCalledWith({
      fileUrl: "https://filesbucket.s3.amazonaws.com/user%201/abc.js",
    });
  });

  it("is null for a URL the server doesn't store", async () => {
    getFile.mockResolvedValue({
      success: false,
      errorCode: "unacceptable_url",
      errorMessage: "The URL does not match an expected format.",
    });

    expect(
      await os.getFileRecordName("https://ext.example.com/user-1/abc.js")
    ).toBeNull();
  });
});
