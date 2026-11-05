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

describe("CasualOSManager.readFile()", () => {
  let os: ReturnType<typeof CasualOSManager>;
  let getFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    os = CasualOSManager();
    getFile = vi.fn();
    (os.client as unknown as { getFile: unknown }).getFile = getFile;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads a stored file through the server's signed request, uncached", async () => {
    getFile.mockResolvedValue({
      success: true,
      requestUrl: "https://filesbucket.s3.amazonaws.com/user-1/abc.png?sig=1",
      requestMethod: "GET",
      requestHeaders: { "x-amz-date": "20261027", origin: "https://x" },
    });
    const fetchFile = vi.fn(
      async () =>
        new Response("png", { headers: { "content-type": "image/png" } })
    );
    vi.stubGlobal("fetch", fetchFile);

    const blob = await os.readFile(
      "https://filesbucket.s3.amazonaws.com/user-1/abc.png"
    );

    expect(await blob?.text()).toBe("png");
    expect(fetchFile).toHaveBeenCalledWith(
      "https://filesbucket.s3.amazonaws.com/user-1/abc.png?sig=1",
      {
        method: "GET",
        // Headers the browser won't let a page set are dropped.
        headers: { "x-amz-date": "20261027" },
        cache: "no-store",
      }
    );
  });

  it("is null for a URL the server doesn't store", async () => {
    getFile.mockResolvedValue({
      success: false,
      errorCode: "unacceptable_url",
      errorMessage: "The URL does not match an expected format.",
    });
    const fetchFile = vi.fn();
    vi.stubGlobal("fetch", fetchFile);

    expect(await os.readFile("https://example.com/a.jpg")).toBeNull();
    expect(fetchFile).not.toHaveBeenCalled();
  });

  it("fails when the file can't be read", async () => {
    getFile.mockResolvedValue({
      success: true,
      requestUrl: "https://filesbucket.s3.amazonaws.com/user-1/abc.png",
      requestMethod: "GET",
      requestHeaders: {},
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 }))
    );

    await expect(
      os.readFile("https://filesbucket.s3.amazonaws.com/user-1/abc.png")
    ).rejects.toThrow("403");
  });
});
