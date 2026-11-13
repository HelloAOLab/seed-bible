// @vitest-environment node
import { extractPage } from "../../../workers/content-import/src/commonCrawl/extract";
import {
  parseCaptures,
  parseCrawlList,
  pickCrawls,
  selectCandidates,
  surtPrefix,
} from "../../../workers/content-import/src/commonCrawl/cdx";
import { parseSiteAddress } from "@packages/seed-bible/seed-bible/managers/customContent/siteImport";

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
  it("lists crawls newest first, with their names, and picks the ones to look in", () => {
    // The shape of data.commoncrawl.org/crawl-data/index.html's rows.
    const crawls = parseCrawlList(`
      <tr>
        <td><a href="./CC-MAIN-2026-39/index.html">CC-MAIN-2026-39</a></td>
        <td><a href="https://commoncrawl.org/blog/x">September 2026</a></td>
      </tr>
      <tr>
        <td><a href="./CC-MAIN-2026-43/index.html">CC-MAIN-2026-43</a></td>
        <td><a href="https://commoncrawl.org/blog/y">October 2026</a></td>
      </tr>`);
    expect(crawls).toEqual([
      { id: "CC-MAIN-2026-43", name: "October 2026" },
      { id: "CC-MAIN-2026-39", name: "September 2026" },
    ]);
    expect(pickCrawls(crawls, 3, "CC-MAIN-2026-39").map((c) => c.id)).toEqual([
      "CC-MAIN-2026-43",
    ]);
  });

  it("finds a site's pages under the key Common Crawl files them by", () => {
    // Real keys, from Common Crawl's index for gracechurch.org.
    expect(surtPrefix(parseSiteAddress("www.GraceChurch.org/Sermons")!)).toBe(
      "org,gracechurch)/sermons/"
    );
    expect(surtPrefix(parseSiteAddress("gracechurch.org")!)).toBe(
      "org,gracechurch)/"
    );
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
