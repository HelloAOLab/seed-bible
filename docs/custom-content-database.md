# Custom Content Database for Customizations — Design

Status: **Proposal** · Owner: TBD · Last updated: 2026-10-28

## 1. Summary

**Short answer:** a Customization owner pastes links to their content (videos, articles, podcasts). Seed Bible fetches each link's title, description and thumbnail, asks the AI which **categories** it belongs to and which **Bible verses** it covers, and lets the owner review the suggestions. Once approved, the content is written into **one record per Bible chapter** (for example, "everything about John 3"). A Discover provider then answers "what's in this chapter?" with a single record read, no searching required.

Before: the only way to put your own content into Discover was to write an extension with a hand-built JSON file, like `default-content-extension` does with `discoveredContent.json`.

After: a ministry that sets up a Customization can paste 200 YouTube links into the Customization editor, review what the AI tagged, press Publish, and everyone who opens their customization link sees that content in Discover on the right chapters, filterable by the ministry's own categories.

Owners with a website full of content don't even need the links: they enter the site's address, and Seed Bible finds its pages in the Common Crawl web archive and imports the ones they pick (§5.7).

## 2. Goals and non-goals

**Goals**

- Owners build a content library from links, without writing code or JSON.
- Owners can import a whole website by its address, using the pages Common Crawl has archived.
- Categories and relevant verses are suggested automatically, and the owner can correct them.
- Content is stored per chapter so the reader fetches exactly one small record when a chapter opens.
- Anyone viewing the Customization (signed in or not) sees the content in Discover.
- Reuse what already exists: Customization records, `DiscoverManager`, `os.client.aiChat`, the reference parsers.

**Non-goals (v1)**

- Several people editing the same library (only the Customization owner edits).
- Hosting the content itself. We store links and metadata; the video or article stays where it is.
- Full-text search across the library (the chapter index is for lookup by chapter, not search).
- Translating category names into other languages (they're shown as the owner typed them).

## 3. How it fits into today's code

| Existing piece                                                                                                | What we use it for                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CustomizationsManager` + `SeedBibleCustomization` record                                                     | The library belongs to a Customization. The Customization record gets a small pointer to its library; the active Customization decides which library Discover reads.              |
| `OsManager` (`recordData`, `getData`, `listAllDataByMarker`, `eraseData`)                                     | All storage. Records live in the owner's record (`recordName` = owner's user id), the same place the Customization itself lives.                                                  |
| The `publicRead:` marker convention (`CUSTOMIZATION_MARKER`)                                                  | Chapter records must be readable by any viewer of the customization link, so they use a `publicRead:` marker just like the Customization record does.                             |
| `os.client.aiChat` (as used in `packages/transcription/infer.tsx`)                                            | Category and verse suggestions. The AI key stays on the CasualOS server.                                                                                                          |
| `extractExplicitRefs` (`packages/transcription/explicit.tsx`), `parseVerseReference*`, `verseReferenceBounds` | Turning "John 3:16-18" text into `{book: "JHN", chapter: 3, verse: 16, endVerse: 18}`, and rejecting impossible references (e.g. "John 30") the AI might produce.                 |
| `DiscoverManager.registerDiscoverProvider` / `registerContentType`                                            | Showing the content. Each category becomes a Discover content type, so category filter chips come for free.                                                                       |
| `resolveLinkMedia` + `PlaylistLinkContent`                                                                    | Deciding whether a link is an embeddable video (YouTube/Vimeo), a video file, or a plain link, and opening it in a modal — the same thing `default-content-extension` does today. |
| `os.getLinkPreview` + `managers/linkPreview.ts`                                                               | Fetching each link's title, description and image. It's the records server's link preview API that playlists and reading plans already use (see §5.2).                            |
| `server/index.ts` (Express)                                                                                   | A new site-import job endpoint for Common Crawl lookups (§5.7). Single links don't need it; only whole-site imports do.                                                           |

## 4. Data model

### 4.1 Where things are stored

Everything lives in the **owner's CasualOS record** (the same `recordName` as the Customization). There are three kinds of records, distinguished by address prefix. `{libraryId}` is a uuid.

| Record           | Address                                   | Marker                               | Who reads it                                         |
| ---------------- | ----------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Library manifest | `content.{libraryId}`                     | `publicRead:seedBibleContentLibrary` | Every viewer, once, when the Customization activates |
| Item (the truth) | `content.{libraryId}.item.{itemId}`       | `seedBibleContentItem` (private)     | Only the owner, while editing                        |
| Chapter index    | `content.{libraryId}.ch.{BOOK}.{chapter}` | `publicRead:seedBibleContentChapter` | Every viewer, once per chapter they open             |

**Why two copies of each item (item record + chapter entries)?** Items are what the owner edits; chapter records are what readers read. Keeping the full item separate means:

- The reader never downloads things it doesn't need (owner notes, AI confidence, review state, the raw fetched metadata).
- The chapter records can always be **rebuilt from the items** if something goes wrong. Items are the source of truth; chapter records are a derived index, like a book's index pages.

### 4.2 The Customization pointer

`SeedBibleCustomization` gets one optional field:

```ts
/** The content library shown in Discover while this customization is active. */
contentLibraryId?: string;
```

It's optional so every existing Customization record keeps parsing. The library lives in the same record as the Customization, so `{recordName, contentLibraryId}` is enough to find it — the same `recordName` the `?customization={recordName}.{id}` link already carries.

### 4.3 Library manifest

```ts
interface ContentLibraryManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  /** Author given to new items, since link previews don't include one. */
  defaultAuthor?: string;
  /** The owner's categories. AI suggestions are limited to these. */
  categories: ContentCategory[];
  /**
   * Every chapter that has at least one published item, as "BOOK.chapter"
   * keys with a count, e.g. { "JHN.3": 4, "GEN.1": 12 }. Lets Discover skip
   * the network entirely for chapters with no content, and lets the editor
   * show coverage ("content on 214 of 1,189 chapters").
   */
  chapters: Record<string, number>;
  updatedAt: number;
}

interface ContentCategory {
  id: string; // stable slug, survives renames
  name: string; // "Archaeology", "Sermons", "Kids"
  description?: string; // helps the AI pick it correctly
  hiddenByDefault?: boolean; // maps straight onto DiscoverContentTypeDefinition
  priority?: number;
}
```

Size check: 1,189 chapter keys × ~12 bytes ≈ 15 KB in the worst case. Fine to load once.

### 4.4 Item (source of truth, private)

```ts
interface ContentItem {
  id: string;
  url: string;
  status: "pending" | "needs_review" | "published" | "failed";
  /** What the metadata fetch found. Kept so re-classification doesn't refetch. */
  fetched?: {
    preview: LinkPreview | null; // from os.getLinkPreview (managers/linkPreview.ts)
    mediaKind: "embed" | "video" | "link"; // from resolveLinkMedia
    fetchedAt: number;
  };
  /**
   * What the owner sees and can edit. Starts from `fetched.preview`; `author`
   * starts from the manifest's `defaultAuthor`.
   */
  title: string;
  description: string;
  image?: string;
  author?: string;
  /** First is the primary category — it decides which Discover section the item lands in. */
  categoryIds: string[];
  references: ContentReference[];
  /** Why the item failed, for the editor to show. */
  error?: string;
  createdAt: number;
  updatedAt: number;
}

interface ContentReference {
  book: string; // USFM id, "JHN"
  chapter: number;
  endChapter?: number;
  verse?: number; // absent = whole chapter
  endVerse?: number;
  source: "explicit" | "ai" | "owner";
  /** AI confidence 0–1; owner-added references are 1. */
  confidence: number;
}
```

`source` matters for review: references the owner typed are never overwritten by a later "re-classify", and the editor can show AI-suggested ones differently.

### 4.5 Chapter index record (public, what Discover reads)

```ts
interface ContentChapterRecord {
  schemaVersion: 1;
  libraryId: string;
  book: string;
  chapter: number;
  updatedAt: number;
  entries: ContentChapterEntry[];
}

interface ContentChapterEntry {
  itemId: string;
  url: string;
  mediaKind: "embed" | "video" | "link";
  title: string;
  description: string; // trimmed to ~300 characters
  image?: string;
  author?: string;
  categoryIds: string[];
  /**
   * The verses of *this* chapter the item covers. Empty = the whole chapter.
   * Matches DiscoverContentResult.verses, so selecting a verse in the reader
   * narrows Discover to the items about it.
   */
  verses: number[];
  /** Display label for the full reference, e.g. "Matthew 26:20–30". */
  reference: {
    book: string;
    chapter: number;
    endChapter?: number;
    verse?: number;
    endVerse?: number;
  };
}
```

**Splitting references across chapters.** A reference that spans chapters (e.g. Acts 1:13–2:4) produces an entry in **each** chapter it touches, with `verses` clipped to that chapter. A whole-chapter reference (`ACT 2`) produces `verses: []`. An item with five references in five chapters appears in five chapter records.

**Size.** One entry is roughly 600 bytes. A heavily covered chapter (say 150 items on John 3) is ~90 KB. Before building, confirm the records server's per-record data limit. If a chapter would exceed a safe budget (proposal: 200 KB), split it into `…ch.JHN.3`, `…ch.JHN.3.p2`, … and record the page count in `manifest.chapters` (e.g. `{"JHN.3": {"count": 310, "pages": 2}}`). We don't expect to need this in v1, but the manifest shape should allow it.

## 5. The ingest pipeline

Here is what happens after the owner pastes links:

```
 paste links ──► 1. normalize & dedupe ──► 2. fetch metadata ──► 3. find references
                                                                     │
       publish ◄── 5. owner review ◄── 4. AI classify (categories + more verses)
          │
          ▼
 6. write item records ──► 7. rebuild affected chapter records ──► 8. update manifest
```

Steps 1–4 run in the owner's browser, a few items at a time (proposal: 3 in parallel) so a 200-link paste doesn't hammer anything. Each item's progress is visible in the editor (`pending` → `needs_review` or `failed`). Items are saved as soon as they're classified, so closing the tab mid-import loses nothing — reopening resumes the `pending` ones.

### 5.1 Normalize and dedupe

- Accept one URL per line, or a CSV with columns `url, title, categories, references` for owners who already have a spreadsheet. Any column the CSV fills in is treated as owner-provided and skips the matching automatic step.
- Normalize before comparing (lowercase host, strip `www.`, drop tracking params like `utm_*`, map `youtu.be/ID` and `youtube.com/watch?v=ID` to the same key). A link already in the library is skipped with a note, not duplicated.
- Reject non-`http(s)` URLs.

### 5.2 Fetch metadata

Use the records server's existing link preview API, `os.getLinkPreview(url, locale)` in `OsManager`. Playlists and reading plans already use it for their link items, so it already handles the hard parts: the CasualOS server fetches the page (browsers can't read most other sites directly), so we add no fetcher or endpoint of our own, and `toLinkPreview` trims the result and drops unsafe image URLs. Successful lookups are cached for the page load.

It returns `{ title, description, imageUrl, imageAlt, siteName }` from the page's Open Graph tags (the `og:` tags sites publish for link previews). Two gaps to plan around:

- **No author field.** For a YouTube video, `siteName` is "YouTube", not the channel. So the item's `author` starts empty, and the library manifest gets an optional `defaultAuthor` (most libraries are one ministry's own content, e.g. "Expedition Bible") that new items inherit. The owner can override it per item.
- **Descriptions are short.** Open Graph descriptions are usually a summary, capped at 1,000 characters by `toLinkPreview`. A YouTube video's full description, which often lists the passages covered, isn't available. Step 3 therefore finds fewer explicit references than it would with the full text, and the AI does more of the work. For pasted links, if that turns out to matter in practice, the fix belongs in the CasualOS link preview API (e.g. an optional longer description). Pages imported from a whole site (§5.7) don't have this gap: their full text comes from the Common Crawl archive.

Imports run a few items at a time (§5) rather than all at once, so a 200-link paste doesn't flood the preview API.

If the fetch fails, the item isn't lost: it goes to `needs_review` with an empty title and the owner fills it in by hand.

### 5.3 Find references the page states explicitly

Before asking the AI, run the existing deterministic parser (`extractExplicitRefs`) over the title and description. If a YouTube description says "Today we study Romans 8:28–39", that's a certain reference — `source: "explicit"`, `confidence: 1`. This is cheap, exact, and gives the AI a strong hint.

`extractExplicitRefs` lives in the `transcription` shared package; since core would now need it too, it should move to a shared package both can import (e.g. `seed-bible-utils`, or a new `bible-references` package), per the "shared code goes in a shared package" rule.

### 5.4 AI classification

One `os.client.aiChat` call per item, following the pattern already in `packages/transcription/infer.tsx`. The model receives:

- the item's title, description, author and site name,
- the explicit references from step 3,
- the library's category list (id, name, description).

It must answer with JSON only:

```json
{
  "categoryIds": ["archaeology", "gospels"],
  "references": [
    { "reference": "Matthew 26:20-30", "confidence": 0.92, "role": "primary" },
    { "reference": "Acts 2", "confidence": 0.7, "role": "mentioned" }
  ],
  "suggestedCategories": ["Holy Week"]
}
```

Rules in the prompt and in code:

- **Categories are limited to the owner's list.** Any id not in the list is dropped. The model may propose new names in `suggestedCategories`; the editor shows them as one-click "add this category" chips, never adds them silently. This keeps the taxonomy the owner's, not the AI's.
- **Every reference is re-parsed and bounds-checked** with our own parser and `isVerseReferenceInBounds`. Anything that doesn't parse or doesn't exist is dropped. The model never writes book ids directly.
- **Confidence threshold:** references under 0.5 are dropped; 0.5–0.75 are kept but flagged for review in the editor. Explicit references from step 3 always win over an AI duplicate.
- Cap at ~10 references per item, keeping the highest-confidence ones, so a vague "overview of the whole Bible" video doesn't land in 300 chapters. The owner can still add more by hand.
- Malformed JSON → one retry, then `needs_review` with whatever step 3 found.

### 5.5 Owner review

New items arrive as `needs_review`. The editor (§7) shows each with its thumbnail, title, categories and references as editable chips; low-confidence references are visually marked. The owner can approve items one at a time or "Publish all reviewed". An optional per-library setting **"Publish automatically when confidence is high"** lets owners with large imports skip review for items where every reference is ≥ 0.75 or explicit.

### 5.6 Publish: write items, rebuild chapters, update manifest

1. Save the item record with `status: "published"`.
2. Work out the **affected chapters** = chapters the item touched before this edit ∪ chapters it touches now. (Both matter: an edit that moves an item from John 3 to John 4 must remove it from John 3.)
3. For each affected chapter, rebuild the chapter record **from all published items in memory** (the editor has already loaded every item via `listAllDataByMarker`). If the rebuilt record has no entries, erase it.
4. Update `manifest.chapters` counts and save the manifest.

Writes go through one queue per library and are batched: publishing 200 items rebuilds each affected chapter once, not 200 times. Rebuilding from items (rather than patching chapter records in place) means a half-finished publish can always be repaired by a **"Rebuild index"** action that regenerates every chapter record from the items.

Deleting an item = erase its item record, then rebuild its chapters. Deleting a category = remove its id from every item (items left with no category fall back to an "Other" section), then rebuild.

### 5.7 Importing a whole website from Common Crawl

**Short answer:** instead of pasting links one by one, the owner types in a site, for example `gracecommunity.org/sermons/`. We look the site up in [Common Crawl](https://commoncrawl.org), a free public archive of web pages, to list every page it has saved from that site. The owner picks which pages to import. For those pages we pull the saved HTML from the archive and send each one through the same pipeline as a pasted link (steps 3–6).

Before: a ministry with 400 sermon pages has to collect and paste 400 links. And each item only gets the page's short link-preview summary, so verses are found mostly by the AI guessing (§5.2).

After: the owner enters one address, sees "Found 412 pages under /sermons/", unticks the ones they don't want, and imports. Each item is classified using the **full page text**, so a sermon page that says "Text: John 10:1–18" halfway down is picked up exactly, by the parser, instead of being guessed.

> **To confirm before building.** This session's network couldn't reach commoncrawl.org, so the Common Crawl details below (endpoint names, query parameters, response fields, rate limits, terms) are from prior knowledge, not checked against current docs. Check each one against the live index server and the Common Crawl docs first.

#### How Common Crawl is organized (the parts we use)

- Common Crawl publishes a new **crawl** every month or two, each with an id like `CC-MAIN-2025-38`. The list of crawls is at `https://index.commoncrawl.org/collinfo.json`.
- Each crawl has a **URL index** (a "CDX" server, the lookup service for "which pages did you save from this site?"): `https://index.commoncrawl.org/{crawlId}-index?url={site}/*&output=json`. It returns one JSON line per saved page, with the page's `url`, `timestamp`, HTTP `status`, `mime` type, `digest` (a fingerprint of the content), and where the page is stored: `filename`, `offset` and `length`. Big sites are split into pages of results: `showNumPages=true` says how many, and `page=N` fetches each one.
- The page itself is stored inside a large **WARC file** (the web archive format) at `https://data.commoncrawl.org/{filename}`. We never download the whole file: an HTTP **range request** for bytes `offset` to `offset + length - 1` returns just that one page, as a gzip-compressed WARC record. Unzipped, it holds the HTTP response headers followed by the page's HTML.
- For very large lookups there is also a **columnar index** (the same index as Parquet files, queryable with SQL tools such as Amazon Athena or DuckDB). It isn't needed for one ministry's site; noted in case we ever import at a much larger scale.

#### Why this runs on our server, not in the browser

The link preview API (§5.2) works one URL at a time and returns only Open Graph tags, so it can't list a site's pages or return full text. That means this feature needs a fetcher of our own, and it has to live on the Seed Bible server (`server/index.ts`) for three reasons:

1. **Politeness and rate limits.** Common Crawl's index server is a shared, free service and asks heavy users to go slowly. Only a server can enforce one queue for all our users; a hundred owners' browsers each querying in parallel can't.
2. **The browser may not be allowed to read it.** We don't know whether the index and data hosts send the headers that let a web page read them (CORS). A server doesn't need them.
3. **The work is heavy for a phone.** Unzipping WARC records and stripping HTML for hundreds of pages belongs on a server.

The server does only the Common Crawl part, and hands back plain extracted documents. Classifying, reviewing and saving stay in the browser exactly as for pasted links. That keeps AI calls and record writes under the owner's own CasualOS session, as everywhere else in this design.

#### The flow

```
 owner enters site ──► A. list pages (index) ──► B. owner picks pages ──► C. fetch & extract (WARC)
                                                                                  │
                                    steps 3–6 of §5 (refs, AI, review, publish) ◄─┘
```

**A. List the site's pages.** `POST /api/site-import` with `{ site, include?, exclude? }` starts a job and returns its id; the editor checks on it with `GET /api/site-import/{id}`.

- Query the **latest 3 crawls**, because each crawl only samples a site and a page missing from one is often in another. Keep only `status` 200 with `mime` `text/html`.
- Merge the results: one entry per normalized URL (same rules as §5.1), keeping the **newest capture**. Captures with identical `digest` (the same content under two URLs) are collapsed.
- Apply the owner's path filters. Include patterns like `/sermons/*`, exclude patterns like `/tag/*` or `/page/*`. Sensible defaults drop listing and archive pages (`/tag/`, `/category/`, `/page/N`, `/feed`, `?replytocom=`), which are noise for verse lookup.
- Drop any URL already in the library.
- Cap a job at 2,000 pages (a number to tune). The owner can narrow the filters if they hit it.

**B. The owner picks.** Before any page is downloaded, the editor shows the list grouped by path (`/sermons/` 412 · `/blog/` 96 · `/events/` 40), with each page's title when the index has one and the date it was captured. The owner ticks folders or individual pages. This step matters: it stops "import my whole site" from filling the library with contact pages and event announcements.

**C. Fetch and extract.** For each chosen page, the server makes one range request, unzips the record and pulls out:

- `title`, `description`, `image`: the same Open Graph tags the link preview reads, falling back to `<title>` and the first `<img>` in the main content.
- **Main text:** the article body with menus, footers and sidebars removed (a "readability"-style extractor), capped at 20,000 characters.
- **Embedded media:** a YouTube or Vimeo `<iframe>` on the page. Sermon pages often wrap a video. The item keeps the **page** as its `url` (that's what the owner imported) and stores the video as `mediaUrl`, so Discover can open the video player directly (`resolveLinkMedia`).
- **Author and date** when the page states them (`article:author`, `article:published_time`, JSON-LD). This fills the author gap from §5.2 for most sites.

The browser then picks up each extracted document and runs the normal pipeline:

- **Step 3** (explicit references) runs over the **full text**. This is where most of the gain comes from.
- **Step 4** (AI) receives the title, description and the first ~4,000 characters of text, not the whole page. That keeps the cost per item close to a pasted link's.

#### What gets stored

Full page text is used during classification and then **discarded**. Only the usual summary fields are saved, so the library holds links and short descriptions, the same as for pasted links. Two additions to the data model:

```ts
// ContentItem (§4.4) gains:
mediaUrl?: string; // video embedded in the page, opened instead of the page itself
origin?:
  | { kind: "paste" | "csv" }
  | { kind: "site"; sourceId: string; crawlId: string; capturedAt: string };

// ContentLibraryManifest (§4.3) gains:
siteSources?: {
  id: string;
  site: string; // "gracecommunity.org/sermons/"
  include: string[];
  exclude: string[];
  lastImportedAt: number;
  newestCrawlId: string; // lets "Check for new pages" look only at newer crawls
}[];
```

`siteSources` turns this into a repeatable action. **"Check for new pages"** re-runs step A against crawls newer than `newestCrawlId` and offers only URLs not already in the library.

#### Limits to tell owners about plainly

- **Not every page is there, and the archive lags.** Common Crawl samples sites and crawls every month or two, so last Sunday's sermon may not be in it yet, and some pages never are. The import screen says how many pages were found and when they were captured, and pasting links (§5.1) remains the way to add anything missing.
- **Sites that block crawlers aren't in it.** Common Crawl follows each site's `robots.txt` rules. If a site has opted out, the lookup finds nothing, and the editor says so instead of showing an empty list with no explanation.
- **Not for YouTube channels.** Video platforms build their pages with scripts and limit crawling, so the archive has little usable data for a channel. A channel import would need a different source (e.g. the YouTube Data API) and is out of scope here.
- **Pages can be stale.** A page may have changed since it was captured. Links always point at the live site, so readers see the current version; only our summary can be out of date.

#### Rights

Common Crawl provides copies of pages, but the content still belongs to each site's owner. We keep only what a link preview would: a title, a short description, an image URL and the link back to the live page. Full text is never stored or shown. Because the expected use is a ministry importing **its own** site, the import screen asks the owner to confirm they own the site or have permission to list its content, the same responsibility they take on when pasting links.

#### Server safeguards

- Requires a valid CasualOS session (see open question 6).
- Only ever contacts the Common Crawl hosts. The owner's input is used as a **search pattern** in the index query, never fetched directly, so this endpoint can't be used to make our server reach arbitrary or internal addresses.
- **One global queue to the index server:** a single request at a time, waiting between pages, backing off and retrying on 503 or 429 errors. Each job is also capped per owner.
- **Range requests run a few at a time** (proposal: 4). Each response is limited to its `length` and the extracted text is capped.
- **Index results are cached for a day per crawl and site,** so two owners importing the same site, or an owner retrying, don't query Common Crawl twice.
- Jobs are short-lived: results are dropped once the browser has collected them, or after 24 hours.

## 6. Reading: the Discover provider

### 6.1 Where it's registered

Core (`CustomContentManager`, §8) registers it, in an `effect` on `customizations.activeCustomization`:

- Active Customization has a `contentLibraryId` → load the manifest, register one Discover content type per category, register the provider.
- Customization changes or is left → unregister everything (the cleanup functions `registerDiscoverProvider`/`registerContentType` return).

Why core rather than an extension: the library is part of the Customization (edited in the Customization editor, stored next to it), and extensions can't depend on core-owned data that may not exist. The provider is ~60 lines; it doesn't justify a separate package. (Alternative considered: a built-in `custom-content-extension` so the owner could switch it off in the Customization's extension list. Not needed — an owner who doesn't want it just doesn't create a library.)

### 6.2 What `discover({ book, chapter })` does

```ts
discover: async ({ book, chapter }) => {
  const key = `${book}.${chapter}`;
  if (!manifest.chapters[key]) return []; // no network for empty chapters
  const result = await os.getData(recordName, `content.${libraryId}.ch.${key}`);
  if (!result.success || !result.data) return []; // never break other providers
  const parsed = contentChapterRecordSchema.safeParse(result.data);
  if (!parsed.success) return [];
  return parsed.data.entries.map((entry) => ({
    type: "content",
    contentType: `custom-content:${libraryId}:${entry.categoryIds[0] ?? "other"}`,
    verses: entry.verses,
    title: entry.title,
    description: entry.description,
    reference: entry.reference,
    author: entry.author,
    image: entry.image,
    onClick: () => openContentModal(entry), // PlaylistLinkContent, like default-content-extension
  }));
};
```

- **One read per chapter, at most.** And zero reads for chapters the manifest says are empty. `DiscoverManager` already caches each provider's answer per chapter for the session, so returning to a chapter is free.
- **Categories → filter chips.** Each category is registered as a content type (`title: category.name`, `hiddenByDefault`, `priority` from the category). The primary category (first in `categoryIds`) decides the section, so an item never appears twice in the same chapter. Secondary categories are shown as small tags on the card.
- **Verse narrowing** works automatically through `verses`: selecting verse 16 in John 3 shows only items about John 3:16 (plus whole-chapter items).
- **Errors return `[]`** and log a warning, so a missing or corrupt chapter record never takes down cross-references or other providers.

### 6.3 Freshness

The provider reads whatever's published. An owner who publishes while a viewer has the app open won't see a change on that viewer's screen until the next session, or until they leave the 50-chapter Discover cache. That's acceptable for curated content. The owner's own app re-registers the provider after every publish (a new provider object clears that provider's cache in `DiscoverManager`), so the owner sees their changes immediately.

## 7. Editor UI

A new **"Content"** section in `CustomizationEditPane`, next to Branding and Extensions:

1. **Empty state:** "Add your videos, articles and podcasts to Discover" + **Create content library** (creates the manifest and sets `contentLibraryId`).
2. **Categories:** a short editable list (name + optional description). Suggest the owner starts with 3–8.
3. **Add content:** two tabs. _Paste links_ is a textarea (one link per line) or a CSV upload, with an **Import** button. _Import a website_ is a site address, optional include/exclude paths and a **Find pages** button. It leads to the page picker grouped by folder (§5.7 step B), and then lists saved sites with **Check for new pages**.
4. **Items list:** filter tabs _Needs review · Published · Failed_. Each row: thumbnail, title, author, category chips, reference chips (low-confidence ones outlined), Edit / Re-classify / Delete. Bulk "Publish reviewed".
5. **Coverage:** "Content on 214 of 1,189 chapters" with a link to see which books have none — useful for ministries filling gaps.
6. **Maintenance:** "Rebuild index" (§5.6) for recovery.

All new strings go into `en.json` only.

## 8. Code layout

| File                                                         | Contents                                                                                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `managers/CustomContentManager.tsx`                          | Signals for the library, items and import progress; create/delete library; import queue; publish/rebuild; registers the Discover provider. Receives `os`, `login`, `customizations`, `discover`.                |
| `managers/customContent/schema.ts`                           | zod schemas + types for manifest, item, chapter record (parsed on every read, like `customizationSchema`).                                                                                                      |
| `managers/customContent/chapterIndex.ts`                     | Pure functions: split references into per-chapter entries, compute affected chapters, build a chapter record from items. Most of the unit tests live here.                                                      |
| `managers/customContent/classify.ts`                         | Prompt, `aiChat` call, response parsing and validation.                                                                                                                                                         |
| `managers/customContent/linkMetadata.ts`                     | URL normalization and dedupe; wraps `os.getLinkPreview` + `resolveLinkMedia` into an item's `fetched` field.                                                                                                    |
| `managers/customContent/siteImport.ts`                       | Starts and checks site-import jobs, and feeds extracted documents into the import queue.                                                                                                                        |
| `server/siteImport/` (+ routes in `server/index.ts`)         | `commonCrawl.ts` (crawl list, paged index queries, the shared polite queue, cache), `warc.ts` (range fetch, unzip, WARC/HTTP parse), `extract.ts` (metadata, main text, embedded media), `jobs.ts` (job state). |
| `components/CustomizationEditPane/ContentLibrarySection.tsx` | The editor UI.                                                                                                                                                                                                  |
| `CustomizationsManager.tsx`                                  | Add optional `contentLibraryId` to the schema and type.                                                                                                                                                         |

## 9. Testing plan

Following the repo's testing rules (mock only `OsManager`/CasualOS, test behavior):

- **`chapterIndex`** (pure, no mocks): a cross-chapter range lands in both chapters with correctly clipped verses; a whole-chapter reference gives `verses: []`; moving an item from John 3 to John 4 lists both as affected and removes it from John 3; an empty rebuilt chapter is erased; one item with two categories appears once.
- **`classify`**: category ids not in the library are dropped; impossible references ("John 30:1") are dropped; explicit references win over AI duplicates; malformed AI output retries once then falls back; owner-sourced references survive re-classify.
- **`linkMetadata`** (mock `os.getLinkPreview`): URL normalization dedupes `youtu.be` / `youtube.com/watch` / tracking params; a preview that fails or returns null yields `needs_review` with an empty title, not a lost item; new items inherit the manifest's `defaultAuthor`.
- **Discover provider** (mock `os.getData`): manifest says empty → no `getData` call; missing record or failed read → `[]` and other providers still answer; results carry the right `contentType` and `verses`; switching Customization unregisters the provider and its content types.
- **Site import (server)**, with recorded index responses and a small WARC fixture, no live network: pages across index result pages are all collected; the newest capture wins and identical `digest`s collapse; include/exclude and default noise filters apply; URLs already in the library are skipped; a WARC record parses to the right HTML, including non-UTF-8 pages; extraction finds the title, main text and an embedded YouTube iframe; a 503 from the index is retried with backoff, not reported as "no pages"; a site with zero captures returns a clear "not in the archive" result; the job cap is enforced.
- **Site import (client)**: extracted documents go through steps 3–6 like pasted links; full text is never written to a record; explicit references found deep in the body text are picked up.
- **Signed-out viewer** opening a customization link sees the content (public-read markers are correct).

## 10. Rollout

1. **Phase 1 — storage + reading.** Schemas, chapter index builder, Discover provider, and a minimal editor where the owner enters title/URL/categories/references by hand. Proves the per-chapter lookup end to end, with no AI work.
2. **Phase 2 — automatic metadata.** Fill items from `os.getLinkPreview`; bulk paste and CSV import.
3. **Phase 3 — AI classification and review.** `aiChat` classification, review queue, confidence flags, auto-publish setting.
4. **Phase 4 — polish.** Coverage view, rebuild index, chapter-record paging if real libraries need it.
5. **Phase 5 — whole-site import.** The Common Crawl job endpoint, page picker, full-text extraction and "Check for new pages". It comes after Phase 3 because its main gain, better verse detection from full text, only pays off once classification exists.

## 11. Open questions

1. **Record size limit.** What is the CasualOS records server's per-record data limit for our deployment? It decides whether chapter paging (§4.5) is needed in v1.
2. **AI cost and limits.** `aiChat` usage is metered per user on the records server. A 500-link import is 500 calls — is that within an owner's allowance, or do we need a batch prompt (several items per call) from the start?
3. **Shared libraries.** Should two Customizations be able to point at the same library (e.g. one ministry with several branded customizations)? The pointer design allows it as long as both are in the same record; cross-record sharing would need the pointer to carry a `recordName` too.
4. **Collaborators.** Ministries often have a team. CasualOS record permissions could grant others write access to the owner's record — worth a follow-up design once v1 is in use.
5. **Moderation.** Content is chosen by the owner and shown only inside their Customization, so v1 does no moderation. Should a library ever be shown outside its Customization (e.g. a public directory), that would need revisiting.
6. **Server authentication.** How should `server/index.ts` verify that a site-import request comes from a signed-in CasualOS user? Can it validate the session key with the records server, or do we need a token issued for the purpose?
7. **Common Crawl terms and load.** Confirm the current terms of use and the guidance on request rates for the index server and `data.commoncrawl.org`, and whether our expected volume (a few thousand range requests per import) is welcome or should go through the columnar index instead.
8. **Running jobs on the server.** Is the long-running host (`server/index.ts` / `Dockerfile`) the right place for these background jobs, or should they run as a separate worker so a large import can't slow page rendering?
