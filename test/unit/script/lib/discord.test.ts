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
  it("titles the embed with the version and links it to the GitHub release", () => {
    const payload = buildReleaseEmbed({ ...BASE, notes: "Some notes." });
    const embed = payload.embeds[0];
    expect(embed?.title).toContain("v1.2.0");
    expect(embed?.url).toBe(BASE.releaseUrl);
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

  it("appends an ellipsis directly to the cut text to mark an intentional truncation", () => {
    const notes = "x".repeat(DISCORD_DESCRIPTION_LIMIT * 2);
    const payload = buildReleaseEmbed({ ...BASE, notes });
    const description = payload.embeds[0]?.description ?? "";
    // The ellipsis sits immediately after the last kept "x" — no separating
    // space or newline — so the cutoff reads as intentional, not a glitch.
    expect(description).toContain("xx…");
    expect(description).not.toMatch(/x\s+…/);
  });

  it("truncates without a releaseUrl by still marking the cutoff with an ellipsis", () => {
    const notes = "x".repeat(DISCORD_DESCRIPTION_LIMIT * 2);
    const payload = buildReleaseEmbed({
      version: BASE.version,
      siteUrl: BASE.siteUrl,
      notes,
    });
    const description = payload.embeds[0]?.description ?? "";
    expect(description.length).toBeLessThanOrEqual(DISCORD_DESCRIPTION_LIMIT);
    expect(description).toContain("xx…");
    expect(description).not.toContain("read the full release notes");
  });

  it("does not truncate notes that already fit", () => {
    const payload = buildReleaseEmbed({ ...BASE, notes: "Short and sweet." });
    const description = payload.embeds[0]?.description ?? "";
    expect(description).not.toContain("read the full release notes");
    expect(description.startsWith("Short and sweet.")).toBe(true);
  });

  it("strips markdown images and GitHub <img> tags from the description", () => {
    const notes = [
      "### 🌟 Highlights",
      "",
      "#### Bookmarks are back",
      "",
      "![Bookmark button](https://github.com/user-attachments/assets/aaa)",
      "",
      "Mark your place with up to five bookmarks.",
      "",
      "#### Scrub through narration",
      "",
      '<img width="640" height="480" alt="Scrubber" src="https://github.com/user-attachments/assets/bbb" />',
      "",
      "Drag to move through a chapter's audio.",
    ].join("\n");
    const description =
      buildReleaseEmbed({ ...BASE, notes }).embeds[0]?.description ?? "";

    expect(description).not.toContain("user-attachments");
    expect(description).not.toContain("![");
    expect(description).not.toContain("<img");
    expect(description).toContain(
      "**Bookmarks are back**\n\nMark your place with up to five bookmarks."
    );
    expect(description).not.toMatch(/\n{3,}/);
  });

  it("turns highlight titles into bold lines, since Discord can't render #### headings", () => {
    const notes = [
      "### 🌟 Highlights",
      "",
      "#### Bookmarks are back",
      "",
      "Mark your place.",
      "",
      "### ✨ Added",
      "",
      "- A new thing.",
    ].join("\n");
    const description =
      buildReleaseEmbed({ ...BASE, notes }).embeds[0]?.description ?? "";

    expect(description).toContain("**Bookmarks are back**\n\nMark your place.");
    expect(description).not.toContain("####");
    expect(description).toContain("### 🌟 Highlights");
    expect(description).toContain("### ✨ Added");
  });

  it("uses the first highlight's image as the embed image", () => {
    const notes = [
      "### 🌟 Highlights",
      "",
      "#### First",
      "",
      '<img alt="First" src="https://github.com/user-attachments/assets/first" />',
      "",
      "#### Second",
      "",
      "![Second](https://github.com/user-attachments/assets/second)",
    ].join("\n");
    const payload = buildReleaseEmbed({ ...BASE, notes });
    expect(payload.embeds[0]?.image).toEqual({
      url: "https://github.com/user-attachments/assets/first",
    });
  });

  it("skips highlight placeholders that haven't been replaced with an upload", () => {
    const notes = [
      "### 🌟 Highlights",
      "",
      "#### First",
      "",
      "![TODO-HIGHLIGHT-MEDIA: GIF of the bookmark button.](TODO)",
      "",
      "#### Second",
      "",
      "![Second](https://github.com/user-attachments/assets/second)",
    ].join("\n");
    const payload = buildReleaseEmbed({ ...BASE, notes });
    expect(payload.embeds[0]?.image).toEqual({
      url: "https://github.com/user-attachments/assets/second",
    });
    expect(payload.embeds[0]?.description).not.toContain(
      "TODO-HIGHLIGHT-MEDIA"
    );
  });

  it("has no embed image when only sections other than Highlights have images", () => {
    const notes = [
      "### ✨ Added",
      "",
      "- A new thing.",
      "",
      "![Screenshot](https://github.com/user-attachments/assets/added)",
    ].join("\n");
    const payload = buildReleaseEmbed({ ...BASE, notes });
    expect(payload.embeds[0]?.image).toBeUndefined();
    expect(payload.embeds[0]?.description).toContain("- A new thing.");
  });

  it("falls back to siteUrl for the title link when releaseUrl is not provided", () => {
    const payload = buildReleaseEmbed({
      version: BASE.version,
      siteUrl: BASE.siteUrl,
      notes: "Some notes.",
    });
    const embed = payload.embeds[0];
    expect(embed?.url).toBe("https://seedbible.org");
  });
});
