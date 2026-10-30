// @vitest-environment node
import { extractPage } from "../../../workers/content-import/src/commonCrawl/extract";
import {
  parseCaptures,
  parseCollections,
  pickCrawls,
  selectCandidates,
} from "../../../workers/content-import/src/commonCrawl/cdx";

const PAGE = "https://g.org/sermons/door";

describe("extractPage", () => {
  it("takes the main text without menus, footers or scripts", () => {
    const page = extractPage(
      `<html><head><title>I Am the Door &amp; the Gate</title></head><body>
        <header>Grace Community</header><nav>Romans 1</nav>
        <div><p>Today: John 10:7&#8211;9.</p><script>var x = "Psalm 1";</script></div>
        <footer>Isaiah 40:8</footer></body></html>`,
      PAGE
    );
    expect(page.title).toBe("I Am the Door & the Gate");
    expect(page.text).toBe("Today: John 10:7–9.");
    // No description of its own: the start of the text stands in.
    expect(page.description).toBe("Today: John 10:7–9.");
  });

  it("decodes accented letters however the page writes them", () => {
    const page = extractPage(
      "<title>Grace en Espa&ntilde;ol &middot; Espa&#xF1;ol &Eacute;glise</title>",
      PAGE
    );
    expect(page.title).toBe("Grace en Español · Español Église");
  });

  it("finds an embedded Vimeo video and the author named in the page", () => {
    const page = extractPage(
      `<meta name="author" content="Pastor Dana">
       <iframe src="//player.vimeo.com/video/123456?h=abc"></iframe>
       <iframe src="https://example.org/widget"></iframe>`,
      PAGE
    );
    expect(page).toMatchObject({
      author: "Pastor Dana",
      mediaUrl: "https://vimeo.com/123456",
    });
  });

  it("ignores a profile link given as the author, and unsafe images", () => {
    const page = extractPage(
      `<meta property="article:author" content="https://facebook.com/dana">
       <meta property="og:image" content="javascript:alert(1)">`,
      PAGE
    );
    expect(page.author).toBeUndefined();
    expect(page.image).toBeUndefined();
  });
});

describe("the index's answers", () => {
  it("lists crawls newest first and picks the ones to look in", () => {
    const crawls = parseCollections([
      { id: "CC-MAIN-2026-22", name: "May" },
      {
        id: "CC-MAIN-2026-38",
        name: "Sept",
        "cdx-api": "https://evil.example/x",
      },
      { id: "not-a-crawl" },
    ]);
    expect(crawls.map((c) => c.id)).toEqual([
      "CC-MAIN-2026-38",
      "CC-MAIN-2026-22",
    ]);
    // An index elsewhere than Common Crawl's own host is never used.
    expect(crawls[0]!.cdxApi).toBe(
      "https://index.commoncrawl.org/CC-MAIN-2026-38-index"
    );
    expect(pickCrawls(crawls, 3, "CC-MAIN-2026-22").map((c) => c.id)).toEqual([
      "CC-MAIN-2026-38",
    ]);
  });

  it("keeps the newest capture of a page and one page per content", () => {
    const line = (url: string, timestamp: string, digest: string) =>
      JSON.stringify({
        url,
        timestamp,
        digest,
        status: 200,
        mime: "text/html",
        filename: "crawl-data/CC/x.warc.gz",
        offset: 1,
        length: 2,
      });
    const captures = parseCaptures(
      [
        line("https://g.org/a", "20260101000000", "A1"),
        line("https://www.g.org/a/", "20260301000000", "A2"),
        line("https://g.org/b", "20260101000000", "A2"),
        line("https://g.org/c", "20260101000000", "C"),
        "not json",
        JSON.stringify({
          url: "https://g.org/d",
          status: "200",
          filename: "../etc/passwd",
        }),
      ].join("\n")
    );
    expect(captures).toHaveLength(4);
    const kept = selectCandidates(captures, {
      crawlId: "CC",
      sourceId: "s",
      include: [],
      exclude: [],
    });
    expect(kept.map((c) => [c.url, c.capturedAt])).toEqual([
      ["https://www.g.org/a/", "20260301000000"],
      ["https://g.org/c", "20260101000000"],
    ]);
  });
});
