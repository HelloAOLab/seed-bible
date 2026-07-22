import {
  buildReleaseEmbed,
  DISCORD_DESCRIPTION_LIMIT,
} from "../../../../script/lib/discord";

const BASE = {
  version: "1.2.0",
  siteUrl: "https://seedbible.org",
  releaseUrl: "https://github.com/HelloAOLab/seed-bible/releases/tag/v1.2.0",
};

describe("buildReleaseEmbed", () => {
  it("titles the embed with the version and links it to the site", () => {
    const payload = buildReleaseEmbed({ ...BASE, notes: "Some notes." });
    const embed = payload.embeds[0];
    expect(embed?.title).toContain("v1.2.0");
    expect(embed?.url).toBe("https://seedbible.org");
    expect(payload.username).toBe("Seed Bible");
  });

  it("includes the notes and a direct site link in the description", () => {
    const payload = buildReleaseEmbed({
      ...BASE,
      notes: "### ✨ Added\n\n- A new thing.",
    });
    const description = payload.embeds[0]?.description ?? "";
    expect(description).toContain("- A new thing.");
    expect(description).toContain("https://seedbible.org");
  });

  it("suppresses mentions so notes can't ping the channel", () => {
    const payload = buildReleaseEmbed({
      ...BASE,
      notes: "Thanks @everyone for testing.",
    });
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it("truncates long notes to fit Discord's limit and links to full notes", () => {
    const notes = "x".repeat(DISCORD_DESCRIPTION_LIMIT * 2);
    const payload = buildReleaseEmbed({ ...BASE, notes });
    const description = payload.embeds[0]?.description ?? "";
    expect(description.length).toBeLessThanOrEqual(DISCORD_DESCRIPTION_LIMIT);
    expect(description).toContain(BASE.releaseUrl);
    expect(description).toContain("https://seedbible.org");
  });

  it("does not truncate notes that already fit", () => {
    const payload = buildReleaseEmbed({ ...BASE, notes: "Short and sweet." });
    const description = payload.embeds[0]?.description ?? "";
    expect(description).not.toContain("read the full release notes");
    expect(description.startsWith("Short and sweet.")).toBe(true);
  });
});
