import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";

describe("CasualOSManager.getLinkPreview()", () => {
  let os: ReturnType<typeof CasualOSManager>;
  let getLinkPreview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    os = CasualOSManager();
    getLinkPreview = vi.fn();
    // The records client is a proxy, so the SDK method is assigned, not spied on.
    (os.client as unknown as { getLinkPreview: unknown }).getLinkPreview =
      getLinkPreview;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the trimmed preview fields worth storing", async () => {
    getLinkPreview.mockResolvedValue({
      success: true,
      cachedUntilMs: 0,
      title: "  Title  ",
      description: "",
      imageUrl: "https://example.com/og.png",
      type: "website",
      meta: { "og:title": "Title" },
    });

    await expect(
      os.getLinkPreview("https://example.com", "en")
    ).resolves.toEqual({
      title: "Title",
      imageUrl: "https://example.com/og.png",
    });
    expect(getLinkPreview).toHaveBeenCalledWith({
      url: "https://example.com",
      locale: "en",
    });
  });

  it("returns null for a page with nothing to show", async () => {
    getLinkPreview.mockResolvedValue({
      success: true,
      cachedUntilMs: 0,
      siteName: "Example",
      meta: {},
    });

    await expect(os.getLinkPreview("https://example.com")).resolves.toBeNull();
  });

  it("reuses a successful preview instead of asking again", async () => {
    getLinkPreview.mockResolvedValue({
      success: true,
      cachedUntilMs: 0,
      title: "Title",
      meta: {},
    });

    await os.getLinkPreview("https://example.com", "en");
    await os.getLinkPreview("https://example.com", "en");
    // A different locale can get a different page, so it is its own entry.
    await os.getLinkPreview("https://example.com", "es");

    expect(getLinkPreview).toHaveBeenCalledTimes(2);
  });

  it("asks again after a failed lookup", async () => {
    getLinkPreview
      .mockResolvedValueOnce({
        success: false,
        errorCode: "site_rate_limited",
        errorMessage: "Too many requests.",
      })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        success: true,
        cachedUntilMs: 0,
        title: "Title",
        meta: {},
      });

    await expect(os.getLinkPreview("https://example.com")).resolves.toBeNull();
    await expect(os.getLinkPreview("https://example.com")).rejects.toThrow(
      "offline"
    );
    await expect(os.getLinkPreview("https://example.com")).resolves.toEqual({
      title: "Title",
    });
  });

  it("caps very long text fields", async () => {
    getLinkPreview.mockResolvedValue({
      success: true,
      cachedUntilMs: 0,
      description: "x".repeat(5000),
      meta: {},
    });

    const preview = await os.getLinkPreview("https://example.com");
    expect(preview!.description).toHaveLength(1000);
  });
});
