# Custom domains for customizations — design

Status: proposal. Nothing here is built yet.

## The short version

A customization owner types a domain (say `bible.gracechurch.org`) into the
customization editor. Seed Bible gives them two DNS records to add: a **CNAME**
that sends the domain's traffic to Seed Bible, and a **TXT** record that proves
they control the domain. They click **Verify**. Once both checks pass, anyone
who visits `https://bible.gracechurch.org` gets Seed Bible with that
customization already applied, exactly as if they had opened the
`?customization=<userId>.<id>` share link.

Three new pieces make that work:

1. **A domain table** (DynamoDB recommended) whose main job is answering one
   question very fast: _"which customization does this hostname belong to?"_
2. **A small domains API** on the host server, used by the editor to add,
   verify, list and remove domains. It is the only thing that writes to the
   table.
3. **Hostname routing in `server/index.ts`**: before rendering, the host looks
   at the request's `Host` header. Seed Bible's own hostnames behave exactly as
   today. Any other hostname is looked up in the table (through an in-memory
   cache), and its customization is handed to the SSR render.

On top of that, something in front of the host has to get an HTTPS
certificate for every customer domain. That is an infrastructure choice, not a
code change, and is covered under [HTTPS certificates](#https-certificates).

**One blocker to check first:** CasualOS (`auth.seedbible.org`) only accepts
API calls from origins it has been told about. A page served from
`bible.gracechurch.org` is a new origin. Until we know how that check behaves,
we don't know whether sign-in, highlights and notes can work on a custom domain.
See [Sign-in and CasualOS origins](#sign-in-and-casualos-origins).

---

## How customizations work today (what we build on)

- A customization is a CasualOS **data record** stored in its owner's own
  record (`recordName` = the owner's user id), at the address
  `customization_<uuid>`, with the marker `publicRead:seedBibleCustomization`.
  So anyone can read it, and only the owner can write it.
- It is opened through a share link: `?customization=<recordName>.<id>`
  (`CustomizationsManager.loadByLocator`).
- During SSR, `CustomizationsManager` reads that query parameter from the
  request URL, fetches the record with `os.getData`, and the server embeds the
  result in the page (`<!-- CUSTOMIZATION_JSON -->`) so the browser doesn't
  fetch it again.
- The production host (`server/index.ts`) chooses what to serve **only from the
  path** (`/` → `main`, `/b/<branch>/...` → a branch). It never looks at the
  `Host` header.

So a custom domain only has to do one thing: **turn a hostname into a
customization locator** (`<recordName>.<id>`). Everything after that — loading
the record, applying the theme, logo and extension settings — already exists.
The customization record itself stays in CasualOS. The domain table stores a
pointer to it, never a copy.

---

## What the owner sees

1. **Add a domain.** In the customization editor, a new "Custom domain"
   section with a text field. The owner types `bible.gracechurch.org`.
2. **Set up DNS.** Seed Bible shows two records to copy into their DNS
   provider:

   | Type  | Name                               | Value                                 |
   | ----- | ---------------------------------- | ------------------------------------- |
   | CNAME | `bible.gracechurch.org`            | `domains.seedbible.org`               |
   | TXT   | `_seedbible.bible.gracechurch.org` | `seedbible-verify=k3J9…` (per domain) |

3. **Verify.** A "Verify" button. Status moves through _Waiting for DNS_ →
   _Issuing certificate_ → _Active_. If a check fails, the editor says which
   one and what it actually found ("The CNAME points to `ghs.google.com`, not
   `domains.seedbible.org`"). DNS can take minutes to hours, so pending domains
   are also re-checked in the background and the owner doesn't have to keep
   clicking.
4. **Use it.** Once active, the share panel offers
   `https://bible.gracechurch.org` instead of the long `?customization=` link.
5. **Remove it.** Removing the domain (or deleting the customization) stops
   serving it within about a minute.

**Subdomains only in v1** (`bible.gracechurch.org`, `www.gracechurch.org`, not
`gracechurch.org`). A bare domain can't have a CNAME, so it would need fixed IP
addresses (A records) for our edge, which depends on the HTTPS option chosen
below. Owners who want the bare domain can point `www` at us and have their
registrar redirect the bare domain to `www`, which nearly every registrar
offers.

---

## The domain table

### What it has to answer

These are all the lookups the feature needs, ordered by how often they run.
The table design follows directly from them.

| #   | Question                                                                   | Who asks                                              | How often                                | Needs                                                                   |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| L1  | Which customization is `bible.gracechurch.org`? (or: is it unknown?)       | Host server, on every page request to a custom domain | Constantly, but cached                   | Key lookup by hostname, a few ms                                        |
| L2  | May I issue an HTTPS certificate for this hostname?                        | The HTTPS edge, before asking Let's Encrypt           | Once per new hostname, plus random scans | Same as L1, and **must say no** to anything not verified                |
| L3  | Is this hostname already taken by someone else?                            | Domains API, when adding or verifying                 | Rare                                     | A uniqueness guarantee — two people must never both get the same domain |
| L4  | What domains does this customization (or this user) have, and their state? | Customization editor                                  | When the editor opens                    | Lookup by owner                                                         |
| L5  | Which domains are due for a DNS re-check?                                  | Background checker                                    | Every few minutes                        | Lookup by "next check time"                                             |
| L6  | Drop claims nobody ever verified                                           | Cleanup                                               | Daily                                    | Expiry                                                                  |

L1 is the only one on the hot path. Everything else is low-volume.

### Recommended: DynamoDB, one table

We're already on AWS (S3 for builds), the data is small (one row per domain),
and DynamoDB covers each lookup above directly:

- **L1/L2** — a get-by-key on the hostname, single-digit milliseconds.
- **L3** — conditional writes and transactions ("only write this if nobody owns
  it") make uniqueness a guarantee instead of a race.
- **L4/L5** — secondary indexes.
- **L6** — DynamoDB's built-in TTL deletes expired rows for free.

**Rows.** Each hostname has one partition, with two kinds of rows in it:

| `pk`                         | `sk`                 | Meaning                                                                                                                                                                                                                                          |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HOST#bible.gracechurch.org` | `ROUTE`              | **The live mapping.** At most one per hostname, because the key itself is unique. Only exists once verified. This is the row L1 reads.                                                                                                           |
| `HOST#bible.gracechurch.org` | `CLAIM#<recordName>` | **A request by one user** to own this hostname, with its own TXT token. Several users can have a pending claim on the same hostname at once, so someone who types in a domain they don't own can't block the real owner (no "domain squatting"). |

Fields:

| Field                                                                      | On                         | Notes                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hostname`                                                                 | both                       | Normalized: lowercase, trailing dot removed, IDNs in punycode (`new URL("https://" + input).hostname` does all three).                                                                                                                                |
| `recordName`, `customizationId`                                            | both                       | The locator. `recordName` is the owner's user id today; it stays a separate field so studio-owned customizations can be added later.                                                                                                                  |
| `verifyToken`                                                              | CLAIM                      | Random, 32+ bytes, base64url. Unique per claim, so one user's TXT record never verifies someone else's claim.                                                                                                                                         |
| `status`                                                                   | both                       | CLAIM: `pending` · `verifying`. ROUTE: `active` · `failing` (still served while we retry) · `suspended` (by us).                                                                                                                                      |
| `lastCheck`                                                                | both                       | `{ at, txt: "ok"/"missing"/"wrong", routing: "ok"/"wrong-target"/"unreachable", detail }` — what the editor shows.                                                                                                                                    |
| `nextCheckAt`                                                              | both                       | Drives L5. Removed from rows that need no further checks.                                                                                                                                                                                             |
| `failingSince`                                                             | ROUTE                      | Set when re-checks start failing; cleared on success.                                                                                                                                                                                                 |
| `expiresAt`                                                                | CLAIM                      | DynamoDB TTL. Unverified claims disappear after 7 days (L6).                                                                                                                                                                                          |
| `createdAt`, `verifiedAt`                                                  | both                       |                                                                                                                                                                                                                                                       |
| `gsi1pk` = `OWNER#<recordName>`, `gsi1sk` = `<customizationId>#<hostname>` | both                       | **Index 1, for L4.** Query `OWNER#<me>` for all of a user's domains, add `begins_with(<customizationId>#)` for one customization's.                                                                                                                   |
| `gsi2pk` = `CHECK`, `gsi2sk` = `nextCheckAt`                               | both, while a check is due | **Index 2, for L5.** Sparse: only rows with a check due are in it. "All rows with `nextCheckAt` ≤ now" is one query. A single `CHECK` partition is fine up to tens of thousands of domains; past that, split it across a few `CHECK#0..n` partitions. |

**Why a separate ROUTE row instead of a `verified` flag on the claim?** L1 has
to be one get-by-key with no filtering, and uniqueness has to come from the key
itself. With `ROUTE` as its own row keyed only by hostname, "one live owner per
hostname" can't be broken by any bug in the API code.

### How each operation touches the table

- **Add domain** — after validating the hostname (see [Rules](#rules-and-limits)):
  `PutItem CLAIM#<me>` with a fresh token and `expiresAt = now + 7d`. If the
  same user already has a claim, reuse its token so the DNS record they already
  added keeps working. If `ROUTE` already exists for _this_ customization,
  report "already active". If `ROUTE` belongs to someone else, still allow the
  claim (see takeovers below) but tell the user the domain is currently
  connected elsewhere.
- **Verify** — run the [checks](#verification-checks). On success, one
  `TransactWriteItems`:
  1. Put `ROUTE` (recordName, customizationId, `active`, `nextCheckAt = now + 24h`).
  2. Delete `CLAIM#<me>`.

  Condition on the `ROUTE` put: _either_ it doesn't exist, _or_ it already
  belongs to me, _or_ the TXT check just found **my** token and **not** the
  current owner's. That last case is a **takeover**: whoever's token is in DNS
  _right now_ controls the domain, which is exactly what happens when a domain
  is sold or a church changes who manages its website. The previous owner sees
  "This domain was claimed by someone who controls its DNS".

- **List (L4)** — `Query` index 1. The editor merges ROUTE and CLAIM rows into
  one list per customization.
- **Remove** — delete `ROUTE` (only if `recordName` = me) and any
  `CLAIM#<me>`. Then tell the host to drop its cache entry
  ([invalidation](#cache-invalidation)).
- **Customization deleted** — `CustomizationsManager.remove` calls the remove
  endpoint for every domain of that customization before erasing the record.
  As a backstop, the re-checker also notices a ROUTE whose customization record
  no longer exists and deletes it.
- **Re-check (L5)** — every 5 minutes, query index 2 for due rows and run the
  checks:
  - Pending claims: every 5 minutes for the first hour, then hourly, until
    they verify or expire.
  - Active routes: daily. On failure, set `status = failing` and keep serving
    (DNS hiccups happen). After **7 days** of continuous failure, delete the
    ROUTE. That frees the hostname, and stops us serving a customization on a
    domain the owner may have let lapse.

### Alternative: keep everything in S3 (no new database)

The host already reads branch pointers from S3 (`branches/<name>/current.json`),
so `domains/<hostname>.json` would fit the existing `ArtifactStore`, including
its `local` backend for tests. S3 conditional writes (`If-None-Match: *`,
`If-Match`) can enforce uniqueness of the route object.

The cost: S3 has no secondary indexes. L4 and L5 would need extra "index"
objects (`owners/<recordName>/<hostname>`, a pending list) kept in step by hand,
with no transactions, so they can drift from the real route objects. Reads are
also slower (~20–50 ms instead of a few ms), which the cache mostly hides.
Reasonable for a first version with a handful of domains; DynamoDB is the
better long-term home.

### Why not store it in CasualOS?

That's where customizations live, so it's tempting. But the mapping can't be
written by the customization owner — otherwise anyone could claim any
hostname — so it would have to sit in a Seed Bible service account's record,
written only by our server. Two things are missing for this job: listing by
anything other than address/marker (L4 by owner, L5 by due time), and, as far
as I know, a "write only if unchanged" operation for L3's uniqueness rule. It
would also put `auth.seedbible.org` on the critical path of every custom-domain
page load. (Worth confirming with the CasualOS team in case either exists.)

---

## Request routing in the host server

### Which hostnames are "ours"

New setting: `PRIMARY_HOSTS` (default `seedbible.org,www.seedbible.org,prod.seedbible.org,alpha.seedbible.org,localhost`).
A request for one of these behaves **exactly as today**, with no table lookup.
That keeps the main site's performance and failure modes unchanged.

The hostname comes from the `Host` header, or from `X-Forwarded-Host` only when
the request came through our own edge (`TRUST_PROXY=true`). It's normalized the
same way as stored hostnames, and the port is dropped.

### The lookup (L1) and its cache

```
resolveCustomDomain(hostname) → { recordName, customizationId } | null
```

- An **in-memory LRU cache** in the host process: up to ~10,000 entries,
  positive results kept 60 s, "not found" results kept 60 s as well.
- Caching "not found" matters: bots send requests with random `Host` headers
  constantly, and without it each one would cost a database read.
- **One request in flight per hostname**: concurrent cache misses for the
  same hostname share a single DynamoDB read, so a burst of traffic to a newly
  launched domain causes one read, not hundreds. (`BuildCache` already does
  this for builds, so the pattern is familiar.)
- **If DynamoDB fails**, serve the last known (stale) entry if we have one.
  With nothing cached, answer `503` with a short retry message — not the plain
  Seed Bible site, which would look broken to the domain owner's visitors.
- Only the `ROUTE` row is read, and only `status` `active` or `failing` counts
  as found.

This mirrors `resolvePointer`, which already does the same thing for branch
pointers with `POINTER_TTL_MS`.

### What changes in `dispatch`

For a custom (non-primary) hostname:

| Request                                       | Today                   | On a custom domain                                                                |
| --------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `GET /…` (any app page)                       | Root branch             | Root branch, rendered **with the domain's customization** (below)                 |
| Hostname not in the table                     | —                       | `404`, small static "This domain isn't connected to Seed Bible" page              |
| `/b/<branch>/…`                               | Branch preview          | `404` — preview builds stay on our own hostnames                                  |
| `/__invalidate`, `/__domains/*`               | Internal endpoints      | `404` — only on primary hostnames                                                 |
| `/.well-known/apple-app-site-association` etc | App-link files          | `404` — the native app only claims seedbible.org links                            |
| `/.well-known/seedbible-domain-check/<token>` | —                       | Answers the [routing check](#verification-checks) (only for pending/active hosts) |
| `/sw.js`, manifest, other assets              | Proxied to `ASSET_HOST` | Same                                                                              |
| `/healthz`                                    | `ok`                    | Same                                                                              |

### Handing the customization to the app

1. `renderAndRespond` gets a new field in the render config:
   `AppConfig.hostCustomization = "<recordName>.<customizationId>"` (plus
   `canonicalOrigin = "https://bible.gracechurch.org"`). The config is already
   injected into the page, so the browser sees the same value.
2. `CustomizationsManager` uses `hostCustomization` as its initial locator,
   **in place of** the `?customization=` query parameter. On a custom domain
   the domain always wins: a `?customization=` pointing at a different
   customization is ignored, so nobody can make `bible.gracechurch.org` show
   another church's branding by appending a query string.
3. The existing SSR path does the rest unchanged: fetch the record, render with
   it, seed the browser. The customization's logo already becomes the favicon.
4. If the record is gone (deleted, or the fetch fails), render plain Seed Bible
   for this request and let the background re-checker clean up the route.
5. The 5-second SSR wait for the customization (`SSR_INITIAL_CUSTOMIZATION_TIMEOUT_MS`)
   matters more here: every first visit to the domain depends on it. Worth a
   short-lived server-side cache of the customization record itself, keyed by
   locator, so a popular church domain doesn't fetch the same record from
   CasualOS on every page load.

### Links built inside the app

- Share links, invites and links saved into notes go through `toShareableUrl`.
  On a custom domain the page's own origin already works for everyone, so they
  naturally stay on the custom domain, and the `?customization=` parameter
  should be left off (the domain already implies it).
- `getShareLink` in the editor offers the active custom domain when there is
  one.
- `<link rel="canonical">` and Open Graph URLs use `canonicalOrigin`.

### Cache invalidation

When the domains API adds, removes or takes over a route, the host's 60-second
cache would otherwise keep serving the old answer for up to a minute. Extend
the existing `POST /__invalidate` with `?host=<hostname>`. If the API runs in
the same process as the cache, it simply clears the entry directly; with
several host instances, it calls `/__invalidate?host=` on each (the same way
the deploy workflow already pings the host). A minute's delay is acceptable,
so this is a nicety, not a correctness requirement.

---

## The domains API

Lives in the host server under `/__domains`, on primary hostnames only, in its
own module (`server/customDomains/`). All endpoints take the user's CasualOS
session key as `Authorization: Bearer <sessionKey>`.

| Endpoint                                        | Does                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /__domains?customizationId=…`              | L4 — this user's domains (all, or for one customization), with status and the DNS records to show |
| `POST /__domains` `{hostname, customizationId}` | Add (creates or reuses the CLAIM) and returns the DNS records                                     |
| `POST /__domains/<hostname>/verify`             | Run the checks now; returns per-check results                                                     |
| `DELETE /__domains/<hostname>`                  | Remove                                                                                            |
| `GET /__domains/tls-allowed?domain=…`           | L2 — for the HTTPS edge only (internal network or shared secret, not public)                      |

**Who is the caller?** The server never trusts a user id sent by the browser.
It sends the session key to CasualOS (e.g. `getUserInfo` called with that key)
and uses the user id CasualOS confirms. **Do they own the customization?**
Customizations live in their owner's record, so ownership is simply
`recordName === confirmed user id`, plus an `os.getData(recordName, customizationId)`
to confirm the record exists and parses. Supporting studio-owned
customizations later means checking studio membership here instead.

Why the host server and not a separate service: it is already the one
long-running process we operate, it needs the same table for routing, and the
API is tiny. If we'd rather keep the SSR host free of authenticated endpoints,
the same module can run as a Lambda behind `api.seedbible.org` with no design
change.

---

## Verification checks

All three must pass for a claim to become a route.

1. **Ownership (TXT).** `_seedbible.<hostname>` has a TXT value
   `seedbible-verify=<token>` matching this user's claim. Query a public
   resolver directly (e.g. Cloudflare's and Google's DNS-over-HTTPS), not the
   server's own resolver, which may cache stale answers. Proves the person
   controls the domain's DNS.
2. **Routing.** Traffic for the hostname actually reaches us. Checked over
   plain HTTP: request `http://<hostname>/.well-known/seedbible-domain-check/<token>`
   and expect our server to answer with that token. This is more reliable than
   reading the CNAME, because it also works when the owner's DNS provider
   hides CNAMEs (Cloudflare's "proxied" mode, CNAME flattening). If it fails,
   look up the CNAME anyway, purely so the error message can say what it found.
3. **Certificate.** After 1 and 2 pass, request
   `https://<hostname>/healthz` to make the edge issue the certificate right
   away, rather than leaving the first real visitor to wait for it. While that
   is in progress the editor shows _Issuing certificate_.

**Status machine**

```
           add                verify ok (txt + routing)         cert ok
  (none) ──────▶ CLAIM:pending ───────────────▶ CLAIM:verifying ─────────▶ ROUTE:active
                     │                                                    │      ▲
                     │ 7 days, never verified                re-check fails│      │ re-check ok
                     ▼                                                    ▼      │
                  (expired)                                         ROUTE:failing
                                                                          │
                                                       failing for 7 days │
                                                                          ▼
                                                                      (deleted)
```

The checker should keep the DNS and HTTP requests it makes tightly bounded:
short timeouts, no following redirects to other hosts, and only ever
contacting the hostname being checked, so the checker can't be turned into a
tool for probing other servers.

---

## HTTPS certificates

Every customer domain needs its own certificate, issued automatically. This
happens in front of the host server, not in it, and depends on how
seedbible.org is hosted today (not visible from this repository). Two good
options:

| Option                                              | How it works                                                                                                                                                                  | Good                                                                                        | Watch out for                                                                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Caddy with "on-demand TLS"** in front of the host | On the first HTTPS request for an unknown hostname, Caddy asks our `tls-allowed` endpoint (L2). If we say yes, it gets a Let's Encrypt certificate on the spot and caches it. | Works with any DNS setup; no third-party account; the "may I issue?" rule is our own table. | Certificates must be stored somewhere all Caddy instances share (S3, DynamoDB or Redis storage plugins). Bare domains need fixed IPs (an AWS Network Load Balancer or Global Accelerator; an Application Load Balancer's IPs change). |
| **Cloudflare for SaaS** ("custom hostnames")        | We call Cloudflare's API to register each verified hostname; Cloudflare issues the certificate and forwards traffic to the host with the original `Host` header.              | No certificate storage to run; DDoS protection and caching included.                        | Needs seedbible.org's DNS on Cloudflare; per-hostname pricing past the free allowance; bare domains need an Enterprise feature. Adds one step to verify: register the hostname with Cloudflare and wait for its status.               |

AWS's own options are worse fits: a load balancer holds a limited number of
certificates (25 by default), and requesting an ACM certificate per domain
means another DNS record for the owner to add. CloudFront's newer multi-tenant
"SaaS Manager" distributions are worth a look if we're already on CloudFront.

Whichever is chosen, **the edge must never issue a certificate for a hostname
that isn't in the table.** Otherwise anyone can point junk domains at us and
burn through Let's Encrypt's rate limits (300 new certificate orders per 3
hours per account).

---

## Sign-in and CasualOS origins

This is the biggest unknown and should be settled before building anything
else.

**What's at stake.** Pages on `bible.gracechurch.org` call
`auth.seedbible.org` (sign-in, highlights, notes, sessions, multiplayer),
`search.seedbible.org` (search) and `i.seedbible.org` (PostHog). Browsers
include the page's origin on those requests, and CasualOS checks it against a
list of allowed origins (separately for account endpoints and for data
endpoints, as far as I know). A custom domain isn't on that list.

**Why we shouldn't just add every verified domain to the list.** An allowed
origin is trusted to run sign-in. But the domain owner controls the domain's
DNS, not our code: the day they point it at their own server, that server is
an "allowed origin" running code we didn't write. The same applies to their
visitors' sign-in sessions.

**Recommended for v1: custom domains are read-only for accounts.**

- Reading, themes, the customization's extensions, search and anything that
  only reads public data work on the custom domain. (Needs confirming:
  public CasualOS reads and Typesense search must accept requests from any
  origin. The SSR render already fetches the customization server-side, where
  no browser origin is involved.)
- "Sign in", "Highlight", "Save" and similar actions open the same page on
  `seedbible.org?customization=<locator>`, where everything works and the
  customization is still applied.
- Sessions and settings stored in the browser are per-origin anyway, so a
  person's seedbible.org history and settings won't appear on the custom
  domain. That's expected, but worth telling customization owners.

**Later, if signed-in use on custom domains matters:** a sign-in handoff where
seedbible.org signs the person in and returns a short-lived, single-use code to
the custom domain, which exchanges it for a session limited to that origin.
That needs support on the CasualOS side and is its own design.

---

## Rules and limits

- **Hostnames we refuse:** anything under `seedbible.org` (or our other
  domains); IP addresses; `localhost` and other single-label names; wildcard
  names; names that are themselves a public suffix (`co.uk`, `github.io` — use
  the `tldts` or `psl` package); anything over 253 characters.
- **Per user:** at most 5 domains (claims + routes), so a script can't fill the
  table.
- **Per customization:** several domains are fine (`bible.x.org` and
  `www.bible.x.org`). Later: mark one as primary and redirect the others to it.
- **Rate limits:** verify at most once per 10 seconds per claim; adding a
  domain at most 20 times per user per day.
- **Suspension:** an admin can set a ROUTE to `suspended` (e.g. abuse). The
  host treats it as not found, and the TLS check says no.

---

## Smaller details

- **PostHog:** `customization_id` is already a property; also record that the
  visitor arrived through a custom domain (the domain itself is already in
  PostHog's `$host`).
- **Service worker and PWA:** `sw.js` and the manifest are proxied per origin,
  so they work. The installed app's name and icon could come from the
  customization (a per-request manifest) — nice-to-have.
- **Telemetry:** add `seedbible.custom_domain.lookups` (hit/miss/negative/error)
  next to the existing cache metrics, and label request spans with
  `custom_domain=true` rather than the hostname (unbounded cardinality, like
  branch names).
- **Translations:** new editor strings go in `en.json` only.

---

## Suggested build order

1. **Decide** the two open infrastructure questions: how CasualOS's origin
   check treats custom origins, and which HTTPS option to use.
2. **Table + routing, no UI:** create the table, add hostname routing and the
   `hostCustomization` config, and add one route by hand. Proves a customer
   domain serves a customization end to end.
3. **Domains API + verification + background checker.**
4. **Editor UI:** the "Custom domain" section, DNS instructions, live status.
5. **Polish:** share links, canonical URLs, sign-in handoff to seedbible.org,
   per-domain manifest.

## Testing

- Hostname routing: primary hosts never touch the table; unknown host → 404;
  `?customization=` can't override a domain's customization; `/b/…` and
  internal endpoints are unreachable on custom hosts; the cache serves stale
  data when the table read fails.
- Domains API: someone else's session can't add a domain to my customization;
  two users claiming the same hostname both get claims, only the one whose
  token is in DNS gets the route; takeover replaces the old owner; removing a
  route clears it from the cache.
- Verification: mock DNS and HTTP at the boundary (the resolver and `fetch`),
  covering missing TXT, wrong TXT, hidden CNAME but working HTTP check, and
  timeouts.
- Table access through a small interface with an in-memory implementation for
  unit tests, like `ArtifactStore`'s `local` backend; one integration test
  against DynamoDB Local for the conditional writes.
