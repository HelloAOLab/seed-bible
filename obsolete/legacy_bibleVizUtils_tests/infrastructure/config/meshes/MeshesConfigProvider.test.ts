import { MeshesConfigProvider } from "bibleVizUtils.infrastructure.config.meshes.MeshesConfigProvider";
import { MeshesUrls } from "bibleVizUtils.infrastructure.config.meshes.urls";

const makeProvider = () => new MeshesConfigProvider();

// ─── getMeshUrl ───────────────────────────────────────────────────────────────

describe("getMeshUrl", () => {
  it("returns the TextFile URL", () => {
    expect(makeProvider().getMeshUrl("TextFile")).toBe(MeshesUrls.TextFile);
  });

  it("returns a string for the TextFile key", () => {
    expect(typeof makeProvider().getMeshUrl("TextFile")).toBe("string");
  });

  it("returns a non-empty string", () => {
    expect(makeProvider().getMeshUrl("TextFile").length).toBeGreaterThan(0);
  });

  it("returns the same reference on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getMeshUrl("TextFile")).toBe(
      provider.getMeshUrl("TextFile")
    );
  });

  it("covers all keys defined in MeshesUrls", () => {
    const provider = makeProvider();
    for (const key of Object.keys(MeshesUrls) as Array<
      keyof typeof MeshesUrls
    >) {
      expect(provider.getMeshUrl(key)).toBe(MeshesUrls[key]);
    }
  });

  it("all values are non-empty strings", () => {
    const provider = makeProvider();
    for (const key of Object.keys(MeshesUrls) as Array<
      keyof typeof MeshesUrls
    >) {
      expect(typeof provider.getMeshUrl(key)).toBe("string");
      expect((provider.getMeshUrl(key) as string).length).toBeGreaterThan(0);
    }
  });
});
