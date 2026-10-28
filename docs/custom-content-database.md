# Custom Content Database for Customizations — Design

Status: **Proposal** · Owner: TBD · Last updated: 2026-10-29

## 1. Summary

**Short answer:** a Customization owner pastes links to their content (videos, articles, podcasts). Seed Bible fetches each link's title, description and thumbnail, asks the AI which **categories** it belongs to and which **Bible verses** it covers, and lets the owner review the suggestions. Each Customization's content lives in **its own CasualOS record**, separate from the owner's personal record. Imports run on **Cloudflare Workers** as a queue, so a batch of thousands of links keeps going after the owner closes the editor. Once approved, the content is written into **one entry per Bible chapter** (for example, "everything about John 3"). A Discover provider then answers "what's in this chapter?" with a single record read, no searching required.

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

| Existing piece                                                                                                | What we use it for                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CustomizationsManager` + `SeedBibleCustomization` record                                                     | The library belongs to a Customization. The Customization record gets a small pointer to its library; the active Customization decides which library Discover reads.                                |
| `OsManager` (`recordData`, `getData`, `listAllDataByMarker`, `eraseData`)                                     | Reading and editing the library from the app. Each Customization's content lives in **its own record**, owned by the Customization's owner (§4.1), not in their personal record.                    |
| The `publicRead:` marker convention (`CUSTOMIZATION_MARKER`)                                                  | Chapter records must be readable by any viewer of the customization link, so they use a `publicRead:` marker just like the Customization record does.                                               |
| `aiChat` (as used in `packages/transcription/infer.tsx`)                                                      | Category and verse suggestions. The import worker calls it with the owner's session key, so the AI key stays on the CasualOS server and usage counts against the owner, as it would in the browser. |
| `extractExplicitRefs` (`packages/transcription/explicit.tsx`), `parseVerseReference*`, `verseReferenceBounds` | Turning "John 3:16-18" text into `{book: "JHN", chapter: 3, verse: 16, endVerse: 18}`, and rejecting impossible references (e.g. "John 30") the AI might produce.                                   |
| `DiscoverManager.registerDiscoverProvider` / `registerContentType`                                            | Showing the content. Each category becomes a Discover content type, so category filter chips come for free.                                                                                         |
| `resolveLinkMedia` + `PlaylistLinkContent`                                                                    | Deciding whether a link is an embeddable video (YouTube/Vimeo), a video file, or a plain link, and opening it in a modal — the same thing `default-content-extension` does today.                   |
| `getLinkPreview` + `managers/linkPreview.ts`                                                                  | Fetching each link's title, description and image: the records server's link preview API that playlists and reading plans already use (see §5.2). The worker calls the same API.                    |
| `getUserInfo` (as used in `LoginManager`) and `FATAL_SESSION_ERROR_CODES` (`SessionGuard.ts`)                 | How the worker checks who is calling, and which errors mean the session is dead (§5.8).                                                                                                             |
| Cloudflare Workers, Queues, D1 and Durable Objects (new, `workers/content-import/`)                           | Running every import (pasted links, CSV, whole sites) as a queue, tracking jobs, and publishing (§5.8).                                                                                             |

## 4. Data model

### 4.1 Where things are stored

Each Customization's content gets **its own CasualOS record**, created when the owner presses "Create content library" and owned by them. Its name is generated, e.g. `seedbible-content-{uuid}`. The Customization record itself stays where it is today, in the owner's personal record (`recordName` = their user id).

Why a separate record rather than the owner's personal one:

- **No clutter.** A large library is thousands of entries. In the personal record they'd sit alongside the owner's private highlights, notes and other Customizations, mixing a public library with personal data.
- **Clean deletion.** Deleting a library means deleting one record, instead of hunting down every entry by address prefix.
- **Room to grow.** Permissions can be granted on this record alone. That makes team editing (open question 4) a matter of sharing one record, without giving anyone access to the owner's personal data. The import worker's access can also be limited to it.
- **Sharing between Customizations.** Two Customizations can point at the same library just by naming the same record (open question 3).

Inside the content record there are three kinds of data entry, distinguished by address:

| Record           | Address               | Marker                               | Who reads it                                         |
| ---------------- | --------------------- | ------------------------------------ | ---------------------------------------------------- |
| Library manifest | `manifest`            | `publicRead:seedBibleContentLibrary` | Every viewer, once, when the Customization activates |
| Item (the truth) | `item.{itemId}`       | `seedBibleContentItem` (private)     | The owner and the import worker                      |
| Chapter index    | `ch.{BOOK}.{chapter}` | `publicRead:seedBibleContentChapter` | Every viewer, once per chapter they open             |

**Why two copies of each item (item record + chapter entries)?** Items are what the owner edits; chapter records are what readers read. Keeping the full item separate means:

- The reader never downloads things it doesn't need (owner notes, AI confidence, review state, the raw fetched metadata).
- The chapter records can always be **rebuilt from the items** if something goes wrong. Items are the source of truth; chapter records are a derived index, like a book's index pages.

### 4.2 The Customization pointer

`SeedBibleCustomization` gets one optional field:

```ts
/** The record holding the content library shown in Discover while this customization is active. */
contentRecordName?: string;
```

It's optional so every existing Customization record keeps parsing. The record name alone is enough to find the library: a viewer who opened the `?customization={recordName}.{id}` link loads the Customization as today, then reads `manifest` from `contentRecordName`.

### 4.3 Library manifest

```ts
interface ContentLibraryManifest {
  schemaVersion: 1;
  name: string;
  /** The Customization this library was created for (its `recordName.id` locator). */
  customizationLocator: string;
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

Steps 2–4 run on the **import worker**, one queue message per link (§5.8). The browser only submits the links (step 1 runs in both places: the browser for instant feedback, the worker as the authority) and shows progress. Each item is written to the content record as soon as it's classified (`pending` → `needs_review` or `failed`). The import keeps running if the owner closes the editor, so a 5,000-link import works the same way as a 5-link one.

Steps 6–8 (publishing) also run on the worker, through one writer per library, so publishing a large batch doesn't depend on the owner's tab staying open either.

### 5.1 Normalize and dedupe

- Accept one URL per line, or a CSV with columns `url, title, categories, references` for owners who already have a spreadsheet. Any column the CSV fills in is treated as owner-provided and skips the matching automatic step.
- Normalize before comparing (lowercase host, strip `www.`, drop tracking params like `utm_*`, map `youtu.be/ID` and `youtube.com/watch?v=ID` to the same key). A link already in the library is skipped with a note, not duplicated.
- Reject non-`http(s)` URLs.

### 5.2 Fetch metadata

Use the records server's existing link preview API: the `getLinkPreview` procedure that `os.getLinkPreview(url, locale)` wraps in `OsManager`. Playlists and reading plans already use it for their link items. The worker calls the same procedure through the CasualOS SDK with the owner's session key, and trims the result with the same `toLinkPreview`, which drops unsafe image URLs. The CasualOS server does the page fetching, so for single links the worker needs no page fetcher of its own.

It returns `{ title, description, imageUrl, imageAlt, siteName }` from the page's Open Graph tags (the `og:` tags sites publish for link previews). Two gaps to plan around:

- **No author field.** For a YouTube video, `siteName` is "YouTube", not the channel. So the item's `author` starts empty, and the library manifest gets an optional `defaultAuthor` (most libraries are one ministry's own content, e.g. "Expedition Bible") that new items inherit. The owner can override it per item.
- **Descriptions are short.** Open Graph descriptions are usually a summary, capped at 1,000 characters by `toLinkPreview`. A YouTube video's full description, which often lists the passages covered, isn't available. Step 3 therefore finds fewer explicit references than it would with the full text, and the AI does more of the work. For pasted links, if that turns out to matter in practice, the fix belongs in the CasualOS link preview API (e.g. an optional longer description). Pages imported from a whole site (§5.7) don't have this gap: their full text comes from the Common Crawl archive.

The queue limits how many links are processed at once (§5.8), so a large import doesn't flood the preview API.

If the fetch fails, the item isn't lost: it goes to `needs_review` with an empty title and the owner fills it in by hand.

### 5.3 Find references the page states explicitly

Before asking the AI, run the existing deterministic parser (`extractExplicitRefs`) over the title and description. If a YouTube description says "Today we study Romans 8:28–39", that's a certain reference — `source: "explicit"`, `confidence: 1`. This is cheap, exact, and gives the AI a strong hint.

`extractExplicitRefs` lives in the `transcription` shared package; since core would now need it too, it should move to a shared package both can import (e.g. `seed-bible-utils`, or a new `bible-references` package), per the "shared code goes in a shared package" rule.

### 5.4 AI classification

One `aiChat` call per item, made by the worker with the owner's session key, following the pattern already in `packages/transcription/infer.tsx`. The model receives:

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

New items arrive as `needs_review`. The editor (§7) shows each with its thumbnail, title, categories and references as editable chips; low-confidence references are visually marked. The owner can approve items one at a time or "Publish all reviewed". An optional per-library setting **"Publish automatically when confidence is high"** lets owners with large imports skip review for items where every reference is ≥ 0.75 or explicit. The worker sends those items straight to the library writer (§5.6).

### 5.6 Publish: write items, rebuild chapters, update manifest

1. Save the item record with `status: "published"`.
2. Work out the **affected chapters** = chapters the item touched before this edit ∪ chapters it touches now. (Both matter: an edit that moves an item from John 3 to John 4 must remove it from John 3.)
3. For each affected chapter, rebuild the chapter record **from all published items** (the writer loads them from the content record with `listData`). If the rebuilt record has no entries, erase it.
4. Update `manifest.chapters` counts and save the manifest.

Publishing runs on the worker, in the library's **single writer** (a Durable Object per content record, §5.8). Both the owner's "Publish" button and auto-publish send item ids there, so chapter records never have two writers racing each other. Writes are batched: publishing 200 items rebuilds each affected chapter once, not 200 times. Rebuilding from items (rather than patching chapter records in place) means a half-finished publish can always be repaired by a **"Rebuild index"** action that regenerates every chapter record from the items.

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

#### Why this needs more than the link preview

The link preview API (§5.2) works one URL at a time and returns only Open Graph tags, so it can't list a site's pages or return full text. So site imports add a Common Crawl fetcher to the import worker (§5.8). It has to run there rather than in the browser for three reasons:

1. **Politeness and rate limits.** Common Crawl's index server is a shared, free service and asks heavy users to go slowly. Only something shared, like the worker, can enforce one queue for all our users; a hundred owners' browsers each querying in parallel can't.
2. **The browser may not be allowed to read it.** We don't know whether the index and data hosts send the headers that let a web page read them (CORS). A worker doesn't need them.
3. **The work is heavy for a phone.** Unzipping WARC records and stripping HTML for hundreds of pages doesn't belong in a browser tab.

Once a page is extracted it becomes an ordinary queue message, so classifying and saving work exactly as for a pasted link.

#### The flow

```
 owner enters site ──► A. list pages (index) ──► B. owner picks pages ──► C. fetch & extract (WARC)
                                                                                  │
                                    steps 3–6 of §5 (refs, AI, review, publish) ◄─┘
```

**A. List the site's pages.** `POST /site-imports` on the worker with `{ contentRecordName, site, include?, exclude? }` starts a lookup and returns its id. The editor checks on it with `GET /site-imports/{id}`. The listing runs as queue messages, one per index result page, each going through the shared Common Crawl gate (§5.8). The pages found are stored as `candidate` rows in the job's D1 table until the owner picks.

- Query the **latest 3 crawls**, because each crawl only samples a site and a page missing from one is often in another. Keep only `status` 200 with `mime` `text/html`.
- Merge the results: one entry per normalized URL (same rules as §5.1), keeping the **newest capture**. Captures with identical `digest` (the same content under two URLs) are collapsed.
- Apply the owner's path filters. Include patterns like `/sermons/*`, exclude patterns like `/tag/*` or `/page/*`. Sensible defaults drop listing and archive pages (`/tag/`, `/category/`, `/page/N`, `/feed`, `?replytocom=`), which are noise for verse lookup.
- Drop any URL already in the library.
- Cap a job at 2,000 pages (a number to tune). The owner can narrow the filters if they hit it.

**B. The owner picks.** Before any page is downloaded, the editor shows the list grouped by path (`/sermons/` 412 · `/blog/` 96 · `/events/` 40), with each page's title when the index has one and the date it was captured. The owner ticks folders or individual pages, and the chosen URLs are added to the import queue. This step matters: it stops "import my whole site" from filling the library with contact pages and event announcements.

**C. Fetch and extract.** Each queue message for a chosen page makes one range request, unzips the record and pulls out:

- `title`, `description`, `image`: the same Open Graph tags the link preview reads, falling back to `<title>` and the first `<img>` in the main content.
- **Main text:** the article body with menus, footers and sidebars removed (a "readability"-style extractor), capped at 20,000 characters.
- **Embedded media:** a YouTube or Vimeo `<iframe>` on the page. Sermon pages often wrap a video. The item keeps the **page** as its `url` (that's what the owner imported) and stores the video as `mediaUrl`, so Discover can open the video player directly (`resolveLinkMedia`).
- **Author and date** when the page states them (`article:author`, `article:published_time`, JSON-LD). This fills the author gap from §5.2 for most sites.

The same message then runs the normal pipeline on the extracted page:

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

#### Common Crawl safeguards

- Only ever contacts the Common Crawl hosts. The owner's input is used as a **search pattern** in the index query, never fetched directly, so the worker can't be used to reach arbitrary or internal addresses this way.
- **One global gate to the index server:** a single Durable Object (`CommonCrawlGate`) that every index query goes through, so there is one request at a time across all owners. It waits between result pages and backs off on 503 or 429 errors. Each job is also capped per owner.
- **Range requests are limited by the queue's concurrency** (proposal: 4 at a time for `data.commoncrawl.org`). Each response is limited to its `length` and the extracted text is capped.
- **Index results are cached for a day per crawl and site** (Workers KV), so two owners importing the same site, or an owner retrying, don't query Common Crawl twice.
- Page listings are kept only until the owner has picked, or for 24 hours.

### 5.8 The import worker (Cloudflare)

**Short answer:** imports and publishing run on Cloudflare Workers. The browser hands over a list of links along with the owner's CasualOS session key. The worker checks the key with CasualOS, puts one message per link on a **Cloudflare Queue**, and processes the links in the background, acting as the owner. The editor shows live progress, but nothing depends on it staying open.

Before (browser-only): a 2,000-link import meant keeping a tab open for an hour, and closing the laptop stopped it.

After: the owner presses Import, sees "Importing 0 of 2,000", and can close the tab. When they come back, the items are waiting in _Needs review_.

#### The pieces

```
 editor ──POST /imports──► API worker ──auth──► CasualOS getUserInfo
                              │
                              ├─► D1: import_jobs + import_items rows (progress, status, encrypted key)
                              └─► Queue "content-import": one message per link
                                        │
                                  queue consumer: claim slot ► link preview / Common Crawl ► refs ► aiChat ► write item
                                        │                                                              │
                                        ▼                                                              ▼
                                  D1 item row → done / failed                                content record (CasualOS)
 Publish / auto-publish ──► LibraryWriter (Durable Object, one per content record) ──► chapter entries + manifest
```

- **API worker:** a small HTTP API: `POST /imports`, `GET /imports/{id}`, `POST /imports/{id}/cancel`, `POST /imports/{id}/resume`, `POST /site-imports` (§5.7), `POST /publish`. It only accepts requests from the Seed Bible app's origins (CORS).
- **D1 database** (Cloudflare's SQL database) holds every import as rows (below). The editor polls `GET /imports/{id}` every few seconds for progress.
- **Queue `content-import`:** one message per link, carrying `{ jobId, itemId }`. It never carries the session key. The consumer takes messages in batches (proposal: 10) with a cap on how many batches run at once. That cap is the main lever for staying under the preview API, `aiChat` and Common Crawl limits.
- **Queue consumer:** for each message it claims a slot (below), then runs steps 2–4: link preview (or Common Crawl fetch and extract, §5.7), explicit references, `aiChat`. It then writes the item to the content record and marks the item's row `done` or `failed`.
- **`LibraryWriter` Durable Object** (one per content record): the only thing that writes chapter entries and the manifest (§5.6).
- **`CommonCrawlGate` Durable Object** (one, global): the polite single lane to the Common Crawl index (§5.7).

#### Why D1 for imports, and Durable Objects only for two jobs

A Durable Object (a small Cloudflare program that runs one request at a time, with its own storage) is shut down after a minute or two idle, and its storage stays until our code deletes it. So everything an import must remember would have to be saved and reloaded anyway, and every object would need its own cleanup alarm. For job tracking, that is a database row with extra machinery. D1 gives us the same guarantees more simply:

- **Safe concurrent updates.** SQL updates are atomic, so many queue messages finishing at once can't lose updates.
- **Constraints for free.** A unique index enforces "one running import per library".
- **Easy to inspect and clean up.** `SELECT * FROM import_jobs WHERE status = 'running'` shows every running import, and one scheduled job cleans up all of them. Leftovers can't hide in thousands of separate objects.

Durable Objects stay where running one thing at a time is the whole point:

- **`LibraryWriter`:** rebuilding chapter entries is a multi-step job that must never run twice at once for the same library. A Durable Object guarantees that. In D1 we'd be writing our own lock, with timeouts and crash recovery. It saves only the item ids waiting to be published, clearing them when done, so nothing lingers. A rebuild is repeatable (it starts from the items), so one interrupted by a restart is simply run again. The editor's "Rebuild index" is the backstop. It holds no session key: each publish request brings one, from the editor or, for auto-publish, from the import's row.
- **`CommonCrawlGate`:** spacing out requests to Common Crawl is a rate limiter, which a single object does naturally. It only remembers when the last request went out; if a restart loses that, at worst one request goes out a little early.

Both are idle most of the time and keep almost no data, so their lifetime needs no special handling.

#### The import tables

```sql
CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_record_name TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 'links' | 'site'
  status TEXT NOT NULL,          -- 'listing' | 'awaiting_pick' | 'running' | 'paused_signin'
                                 -- | 'cancelled' | 'done' | 'expired'
  session_key_enc BLOB,          -- encrypted; set to NULL as soon as the job stops
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL    -- created_at + 7 days
);

-- At most one active import per library.
CREATE UNIQUE INDEX one_active_import ON import_jobs (content_record_name)
  WHERE status IN ('listing', 'awaiting_pick', 'running', 'paused_signin');

CREATE TABLE import_items (
  job_id TEXT NOT NULL,
  item_id TEXT NOT NULL,         -- also the item's address in the content record
  url TEXT NOT NULL,
  origin TEXT NOT NULL,          -- JSON: paste / csv / site + crawl details
  state TEXT NOT NULL,           -- 'candidate' | 'queued' | 'running' | 'done' | 'failed'
  lease_until INTEGER,           -- set while 'running'
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  PRIMARY KEY (job_id, item_id)
);
CREATE INDEX import_items_by_state ON import_items (job_id, state);
```

- **Progress isn't stored as counters; it's counted from the rows:** `SELECT state, COUNT(*) FROM import_items WHERE job_id = ? GROUP BY state`. With nothing to keep in step, the numbers can't drift from what actually happened.
- **Fair sharing** (proposal: 3 links at a time per import) is one statement. Before working on an item, the consumer moves it from `queued` to `running` with a lease 10 minutes out, but only if fewer than 3 of the job's items hold an unexpired lease:

  ```sql
  UPDATE import_items SET state = 'running', lease_until = :leaseEnd, attempts = attempts + 1
  WHERE job_id = :job AND item_id = :item AND state = 'queued'
    AND (SELECT COUNT(*) FROM import_items
         WHERE job_id = :job AND state = 'running' AND lease_until > :now) < 3;
  ```

  If no row changed, the message is put back on the queue with a short delay. A consumer that crashes mid-link never releases its slot, but its lease runs out and the slot frees itself. That item is put back to `queued` by the cleanup job (below).

- **Pause and cancel** are a `status` change. The consumer reads the job's status before claiming a slot, so messages still waiting on the queue are dropped (cancelled) or put back (paused) instead of being worked on.
- **Finishing.** After marking an item, the consumer checks whether any `queued` or `running` items remain. If none do, it moves the job to `done` with a conditional `UPDATE … WHERE status = 'running'`, so only one consumer wins. The winner erases the key, writes a short summary to the content record's `importStatus` entry ("1,969 imported, 31 failed"), and leaves the rows for the cleanup job.

**D1's limit to keep in mind:** one database runs its writes one at a time. Each link costs about three small writes (claim, finish, and occasionally the finish check), so even hundreds of links a minute across all owners is light work. If we ever outgrow that, jobs can be spread over several databases by content record.

#### Authentication: the owner's session key, checked with CasualOS

The editor sends `Authorization: Bearer {sessionKey}`, the key the app already holds in `OsManager`. Before doing anything, the worker:

1. Parses the user id out of the key (CasualOS session keys carry it, as `OsManager.parsedSessionKey` already relies on).
2. Calls CasualOS `getUserInfo({ userId })` using that key, the same call `LoginManager` makes. Success proves the key is live and belongs to that user. Anything else is rejected with 401.
3. Checks that the user can write to the target content record by writing a small `importStatus` entry to it with the same key (the editor reads this entry to find a running import). If CasualOS refuses, the request is rejected with 403 before anything is queued. Every later write is also made **as the user** with their key, so CasualOS enforces permissions on each one; the worker never needs its own admin access to anyone's records.

**Handling the key carefully.** A session key is a full-account credential, so the worker treats it like a password:

- It is stored only in the job's `import_jobs` row, encrypted with a worker secret. It never goes in queue messages, logs or error reports.
- It is erased (set to `NULL`) the moment the job finishes or is cancelled. The cleanup job erases it from any job past `expires_at` (7 days), including one paused and never resumed.
- If CasualOS answers with one of `FATAL_SESSION_ERROR_CODES` (`session_expired`, `invalid_key`, `user_is_banned`), the job **pauses** (`paused_signin`); it never retries with a dead key. The editor then shows "Sign in again to continue this import", and `POST /imports/{id}/resume` supplies a fresh key. The same narrow list `SessionGuard.ts` uses applies here: a network blip or `server_error` is retried, not treated as a dead session.
- Signing out in the app revokes the session, so the worker's copy stops working too. That's the right outcome: signing out stops your imports.

A narrower credential would be better than a full session key. CasualOS **record keys** (`createRecordKey`, used today by `seed-bible-extension-scripts`) can grant access to a single record, so the worker could use one, scoped to the content record, for writes. `aiChat` and `getLinkPreview` still need the session, so this narrows what a leak would expose rather than removing the session key entirely. See open question 7.

#### Reliability for large batches

- **Retries.** A message that fails for a passing reason (a timeout, a 429 or 503, a server error) is retried with growing delays (Queue retry with delay). After 5 attempts it goes to a **dead-letter queue**, whose consumer marks the item `failed` with the reason, so nothing disappears silently.
- **Idempotent.** Each message carries its `itemId`, chosen when the job is created, so a retry overwrites the same item instead of creating a duplicate. A message for an item that's already `done` is acknowledged and skipped.
- **Never clobbers the owner.** If the owner edited an item while it was queued (its `updatedAt` in the content record is newer than the job's start), the consumer skips it.
- **Resumable.** The item rows say exactly what's left, so resuming re-queues only the `queued` items.
- **Fair.** Each job has its own slots (above), so one owner's 10,000-link import doesn't starve another owner's 20.
- **Limits.** Cap a single import (proposal: 10,000 links). The unique index allows only one active import per content record.

#### Cleanup

A scheduled worker (a Cron Trigger, proposal: every 15 minutes):

- Puts `running` items whose lease has expired back to `queued` and re-sends their messages.
- Expires jobs past `expires_at`: sets them to `expired`, erases the key, and writes the summary to `importStatus`.
- Deletes `candidate` rows the owner never picked, 24 hours after listing.
- Deletes finished jobs and their item rows 30 days after they end. The lasting record is the `importStatus` entry and the items themselves, both in the content record.

#### Deployment

The worker is its own project: `workers/content-import/`, with its own `wrangler` config. It sits outside `packages/*` so the extension bundler and the extension-boundary rules don't pick it up. It's deployed by a new job in `.github/workflows/cd.yml`, which needs a Cloudflare API token and the encryption secret as repository secrets. The app finds it through a build-time setting (e.g. `CONTENT_IMPORT_URL`), so staging and production each talk to their own worker.

Code both the app and the worker need, the schemas, chapter index builder, reference parsing and classification prompt, moves into a shared package, `packages/content-library/` (no `extension.json`). That way the browser's editing and the worker's publishing build chapter entries with the same code.

## 6. Reading: the Discover provider

### 6.1 Where it's registered

Core (`CustomContentManager`, §8) registers it, in an `effect` on `customizations.activeCustomization`:

- Active Customization has a `contentRecordName` → load its `manifest`, register one Discover content type per category, register the provider.
- Customization changes or is left → unregister everything (the cleanup functions `registerDiscoverProvider`/`registerContentType` return).

Why core rather than an extension: the library is part of the Customization (edited in the Customization editor, stored next to it), and extensions can't depend on core-owned data that may not exist. The provider is ~60 lines; it doesn't justify a separate package. (Alternative considered: a built-in `custom-content-extension` so the owner could switch it off in the Customization's extension list. Not needed — an owner who doesn't want it just doesn't create a library.)

### 6.2 What `discover({ book, chapter })` does

```ts
discover: async ({ book, chapter }) => {
  const key = `${book}.${chapter}`;
  if (!manifest.chapters[key]) return []; // no network for empty chapters
  const result = await os.getData(contentRecordName, `ch.${key}`);
  if (!result.success || !result.data) return []; // never break other providers
  const parsed = contentChapterRecordSchema.safeParse(result.data);
  if (!parsed.success) return [];
  return parsed.data.entries.map((entry) => ({
    type: "content",
    contentType: `custom-content:${contentRecordName}:${entry.categoryIds[0] ?? "other"}`,
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

The provider reads whatever's published. An owner who publishes while a viewer has the app open won't see a change on that viewer's screen until the next session, or until they leave the 50-chapter Discover cache. That's acceptable for curated content. The owner's own app re-registers the provider when the worker reports a publish finished (a new provider object clears that provider's cache in `DiscoverManager`), so the owner sees their changes as soon as they're live.

## 7. Editor UI

A new **"Content"** section in `CustomizationEditPane`, next to Branding and Extensions:

1. **Empty state:** "Add your videos, articles and podcasts to Discover" + **Create content library** (creates the content record and its manifest, then sets `contentRecordName`).
2. **Categories:** a short editable list (name + optional description). Suggest the owner starts with 3–8.
3. **Add content:** two tabs. _Paste links_ is a textarea (one link per line) or a CSV upload, with an **Import** button. _Import a website_ is a site address, optional include/exclude paths and a **Find pages** button. It leads to the page picker grouped by folder (§5.7 step B), and then lists saved sites with **Check for new pages**.
4. **Import progress:** read from the worker ("Importing 1,240 of 2,000 · 31 failed"), with Cancel, and a "Sign in again to continue" prompt if the job paused on an expired session. Closing the editor doesn't stop it.
5. **Items list:** filter tabs _Needs review · Published · Failed_. Each row: thumbnail, title, author, category chips, reference chips (low-confidence ones outlined), Edit / Re-classify / Delete. Bulk "Publish reviewed".
6. **Coverage:** "Content on 214 of 1,189 chapters" with a link to see which books have none — useful for ministries filling gaps.
7. **Maintenance:** "Rebuild index" (§5.6, runs on the worker) for recovery, and **Delete library**, which deletes the content record.

All new strings go into `en.json` only.

## 8. Code layout

| File                                                         | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `managers/CustomContentManager.tsx`                          | Signals for the library and items; create/delete the content record; item edits; talks to the import worker (start, progress, cancel, resume, publish); registers the Discover provider. Receives `os`, `login`, `customizations`, `discover`.                                                                                                                                                                                                            |
| `packages/content-library/` (shared, no `extension.json`)    | `schema.ts` (zod schemas for manifest, item, chapter entry), `chapterIndex.ts` (split references into chapters, affected chapters, build a chapter entry; most unit tests live here), `references.ts` (`extractExplicitRefs`, moved from `transcription`), `classify.ts` (prompt and response validation), `normalizeUrl.ts`. Used by both the app and the worker.                                                                                        |
| `managers/customContent/importClient.ts`                     | Typed client for the worker's HTTP API, sending the session key.                                                                                                                                                                                                                                                                                                                                                                                          |
| `workers/content-import/`                                    | `src/api.ts` (routes, CORS, session check), `src/jobs.ts` (D1 queries: create, claim slot, finish, progress), `migrations/` (D1 schema), `src/LibraryWriter.ts` and `src/CommonCrawlGate.ts` (Durable Objects), `src/consumer.ts` and `src/deadLetter.ts` (queue consumers), `src/cleanup.ts` (Cron Trigger), `src/linkMetadata.ts` (`getLinkPreview` + `resolveLinkMedia`), `src/commonCrawl/` (`index.ts`, `warc.ts`, `extract.ts`), `wrangler` config. |
| `components/CustomizationEditPane/ContentLibrarySection.tsx` | The editor UI.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CustomizationsManager.tsx`                                  | Add optional `contentRecordName` to the schema and type.                                                                                                                                                                                                                                                                                                                                                                                                  |

## 9. Testing plan

Following the repo's testing rules (mock only `OsManager`/CasualOS, test behavior):

- **`chapterIndex`** (pure, no mocks): a cross-chapter range lands in both chapters with correctly clipped verses; a whole-chapter reference gives `verses: []`; moving an item from John 3 to John 4 lists both as affected and removes it from John 3; an empty rebuilt chapter is erased; one item with two categories appears once.
- **`classify`**: category ids not in the library are dropped; impossible references ("John 30:1") are dropped; explicit references win over AI duplicates; malformed AI output retries once then falls back; owner-sourced references survive re-classify.
- **`linkMetadata`** (worker, mock the CasualOS client's `getLinkPreview`): URL normalization dedupes `youtu.be` / `youtube.com/watch` / tracking params; a preview that fails or returns null yields `needs_review` with an empty title, not a lost item; new items inherit the manifest's `defaultAuthor`.
- **Discover provider** (mock `os.getData`): manifest says empty → no `getData` call; missing record or failed read → `[]` and other providers still answer; results carry the right `contentType` and `verses`; switching Customization unregisters the provider and its content types.
- **Worker authentication and key handling** (CasualOS client mocked): a missing or malformed key → 401; `getUserInfo` failing → 401; a key for a user who can't write the content record → 403; the key never appears in a queue message or log line; a `session_expired` during processing pauses the job instead of retrying, and `resume` with a new key carries on from where it stopped; a `server_error` is retried, not treated as a dead session.
- **Worker queue and D1** (run in the Workers runtime with `@cloudflare/vitest-pool-workers`, which provides a real local D1): a retried message overwrites the same item, no duplicate; after 5 failures the item ends up `failed` with its reason; an item the owner edited after queueing is skipped; cancelling stops further messages; a fourth item can't claim a slot while three leases are live, and can once one expires; many items finishing at once mark the job `done` exactly once and write one summary; progress counts match the item rows; starting a second import for the same library is refused.
- **Cleanup**: expired leases go back to `queued`; a paused job past `expires_at` becomes `expired` with its key erased; old rows are deleted.
- **`LibraryWriter`**: concurrent publish requests for overlapping chapters produce the same chapter entries as running them one after another.
- **Site import (worker)**, with recorded index responses and a small WARC fixture, no live network: pages across index result pages are all collected; the newest capture wins and identical `digest`s collapse; include/exclude and default noise filters apply; URLs already in the library are skipped; a WARC record parses to the right HTML, including non-UTF-8 pages; extraction finds the title, main text and an embedded YouTube iframe; a 503 from the index is retried with backoff, not reported as "no pages"; a site with zero captures returns a clear "not in the archive" result; the job cap is enforced.
- **Site import (end to end)**: extracted pages go through steps 3–6 like pasted links; full text is never written to a record; explicit references found deep in the body text are picked up.
- **Signed-out viewer** opening a customization link sees the content (public-read markers on the content record are correct).
- **Separate record**: creating a library writes nothing into the owner's personal record except `contentRecordName` on the Customization; deleting the library removes the content record.

## 10. Rollout

1. **Phase 1 — storage + reading.** The content record, schemas, chapter index builder, Discover provider, and a minimal editor where the owner enters title/URL/categories/references by hand (publishing from the browser for now). Proves the per-chapter lookup end to end, with no AI work and no worker.
2. **Phase 2 — the import worker.** API worker with session-key authentication, the D1 job tables and cleanup trigger, the queue and dead-letter consumer, `LibraryWriter` (publishing moves to the worker), CD deployment. Items filled from `getLinkPreview`; bulk paste and CSV import.
3. **Phase 3 — AI classification and review.** `aiChat` classification, review queue, confidence flags, auto-publish setting.
4. **Phase 4 — polish.** Coverage view, rebuild index, chapter-record paging if real libraries need it.
5. **Phase 5 — whole-site import.** `CommonCrawlGate`, the site-import endpoint, page picker, full-text extraction and "Check for new pages". It comes after Phase 3 because its main gain, better verse detection from full text, only pays off once classification exists.

## 11. Open questions

1. **Record size limit.** What is the CasualOS records server's per-record data limit for our deployment? It decides whether chapter paging (§4.5) is needed in v1.
2. **AI cost and limits.** `aiChat` usage is metered per user on the records server. A 500-link import is 500 calls — is that within an owner's allowance, or do we need a batch prompt (several items per call) from the start?
3. **Shared libraries.** Should two Customizations be able to point at the same library (e.g. one ministry with several branded customizations)? With the content in its own record, this is just two Customizations naming the same `contentRecordName`. The open part is the editor: which Customization "owns" the library and what deleting one does to the other.
4. **Collaborators.** Ministries often have a team. Because each library is its own record, CasualOS permissions can grant a teammate write access to just that record. Worth a follow-up design once v1 is in use; the worker's permission check (§5.8) already works per record.
5. **Moderation.** Content is chosen by the owner and shown only inside their Customization, so v1 does no moderation. Should a library ever be shown outside its Customization (e.g. a public directory), that would need revisiting.
6. **Creating the content record.** Which CasualOS SDK call creates a new record owned by the user under a generated name, and are there limits on how many records one user may own? This decides whether "one record per Customization" needs a fallback for heavy users.
7. **A narrower credential for the worker.** Can CasualOS issue something scoped to one record for writes, e.g. a record key for the content record, so the worker holds less than a full session key? `aiChat` and `getLinkPreview` still need a session. Could CasualOS add a session limited to those procedures?
8. **Long-running imports and session lifetime.** How long do CasualOS sessions last? An import that outlives the session pauses and waits for the owner to sign in again (§5.8). If sessions are short, big imports will pause often.
9. **Cloudflare account and cost.** Which Cloudflare account hosts the worker, and is the expected volume (queue operations, D1 reads and writes, Durable Object requests, KV) inside the plan we want to pay for?
10. **Common Crawl terms and load.** Confirm the current terms of use and the guidance on request rates for the index server and `data.commoncrawl.org`, and whether our expected volume (a few thousand range requests per import) is welcome or should go through the columnar index instead.
