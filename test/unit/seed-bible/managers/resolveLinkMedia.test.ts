import { resolveLinkMedia } from "@packages/seed-bible/seed-bible/managers/resolveLinkMedia";

describe("resolveLinkMedia", () => {
  it("treats direct video files as videos", () => {
    for (const url of [
      "https://example.com/clip.mp4",
      "https://example.com/path/movie.webm",
      "https://cdn.example.com/a.MOV",
      "https://example.com/video.mp4?token=abc#t=10",
    ]) {
      expect(resolveLinkMedia(url)).toEqual({ kind: "video", url });
    }
  });

  it("rewrites YouTube watch URLs to embed URLs", () => {
    expect(
      resolveLinkMedia("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toEqual({
      kind: "embed",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  it("rewrites youtu.be short links to embed URLs", () => {
    expect(resolveLinkMedia("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      kind: "embed",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });

  it("rewrites YouTube shorts to embed URLs", () => {
    expect(resolveLinkMedia("https://www.youtube.com/shorts/abc123")).toEqual({
      kind: "embed",
      url: "https://www.youtube.com/embed/abc123",
    });
  });

  it("carries a start time onto the YouTube embed URL", () => {
    expect(resolveLinkMedia("https://youtu.be/dQw4w9WgXcQ?t=90")).toEqual({
      kind: "embed",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ?start=90",
    });
    expect(
      resolveLinkMedia("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s")
    ).toEqual({
      kind: "embed",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ?start=90",
    });
  });

  it("rewrites Vimeo URLs to the player embed URL", () => {
    expect(resolveLinkMedia("https://vimeo.com/123456789")).toEqual({
      kind: "embed",
      url: "https://player.vimeo.com/video/123456789",
    });
  });

  it("keeps a Vimeo player URL as an embed", () => {
    expect(
      resolveLinkMedia("https://player.vimeo.com/video/123456789")
    ).toEqual({
      kind: "embed",
      url: "https://player.vimeo.com/video/123456789",
    });
  });

  it("falls back to a plain link for other URLs", () => {
    for (const url of [
      "https://example.com/article",
      "https://youtube.com/",
      "https://vimeo.com/channels/staffpicks",
    ]) {
      expect(resolveLinkMedia(url)).toEqual({ kind: "link", url });
    }
  });

  it("falls back to a plain link for unparseable input", () => {
    expect(resolveLinkMedia("not a url")).toEqual({
      kind: "link",
      url: "not a url",
    });
  });
});
