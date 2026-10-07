# Seed Bible Roadmap

This is the order we plan to work in, and what each item means in practice. Items are listed by priority: the top of the list comes first. Only the first item blocks the wider rollout; everything after it can ship whenever it is ready.

Each item says where things stand today, what we want to build, what it depends on, and which GitHub issues hold the detail. When an item has unresolved design choices, they are listed under **Open questions** so they don't get lost.

_Last updated 2026-10-07_

## At a glance

✅ Done · 🚧 In progress · ⏳ Waiting on someone else · 💭 Planned, not started

| #   | Item                                                                                                 | Theme          | Depends on             | Status                    |
| --- | ---------------------------------------------------------------------------------------------------- | -------------- | ---------------------- | ------------------------- |
| 1   | [Customization + organization discovered content](#1-customization--organization-discovered-content) | Content        | — (**blocks rollout**) | 🚧 In progress            |
| 2   | [Friends, and seeing their data](#2-friends-and-seeing-their-data)                                   | Community      | —                      | ✅ Done — follow-ups open |
| 3   | [Today screen community section rework](#3-today-screen-community-section-rework)                    | Community      | 2                      | 💭 Planned                |
| 4   | [Public/private data split](#4-publicprivate-data-split)                                             | Privacy        | 2                      | 💭 Planned                |
| 5   | [Customization design improvements](#5-customization-design-improvements)                            | Customization  | 1                      | 💭 Planned                |
| 6   | [Bookmarks rework](#6-bookmarks-rework)                                                              | Reader         | —                      | 💭 Planned                |
| 7   | [Onboarding improvements](#7-onboarding-improvements)                                                | First run      | —                      | 🚧 In progress            |
| 8   | [Third-party extensions](#8-third-party-extensions)                                                  | Platform       | 9 (helps)              | 🚧 In progress            |
| 9   | [Technical docs](#9-technical-docs)                                                                  | Platform       | —                      | 💭 Planned                |
| 10  | [Sign in with YouVersion](#10-sign-in-with-youversion)                                               | Accounts       | Backend work           | ⏳ Waiting on backend     |
| 11  | [Settings redesign](#11-settings-redesign)                                                           | Settings       | —                      | 💭 Planned                |
| 12  | [Bonfire AI tool calling](#12-bonfire-ai-tool-calling)                                               | AI             | —                      | 💭 Planned                |
| 13  | [Rework reading history to use data records](#13-rework-reading-history-to-use-data-records)         | Privacy / data | Supports 4             | 💭 Planned                |
| 14  | [Circles (friend groups)](#14-circles-friend-groups)                                                 | Community      | 2, 4                   | 💭 Planned                |
| 15  | [Multiple accounts on a device](#15-multiple-accounts-on-a-device)                                   | Accounts       | —                      | 💭 Planned                |
| 16  | [MCP support](#16-mcp-support)                                                                       | AI / platform  | 12 (helps)             | 🚧 In progress            |

### How the items connect

Several items are really one long thread, built in steps:

- **Community thread (2 → 3 → 4 → 14).** Friends come first (2). The Today screen then shows what friends are doing (3). Once people are sharing with friends, they need control over _what_ is shared (4). Circles (14) refine that control from "all my friends" to "these particular friends".
- **Privacy depends on storage (13 → 4).** Making data truly private means changing how it is stored, not just what the app displays. Reading history is the hardest piece to change, which is why item 13 exists. See item 4 for why.
- **Customization thread (1 → 5).** Item 1 is about _what_ customizations can do (bring their own content). Item 5 is about making the editor pleasant to use.
- **AI thread (12 → 16).** Tool calling (12) lets an AI act inside the app. MCP (16) connects the in-app chat to outside tools today, and later could open the app itself to outside AI assistants.

---

## 1. Customization + organization discovered content

**Blocking for rollout.**

### Short version

Organizations (a church, a ministry, a partner like Apologist) need to be able to put their own content in front of their people in the Seed Bible, alongside the third-party content we already surface. Readers need to be able to choose which sources they see, or turn third-party content off altogether.

### Where things stand

- The **compact discover panel** now surfaces content for the current chapter: notes, playlists, reading plans, and content from extensions (for example Bible Project videos). Extensions register their own content types with `DiscoverManager.registerContentType`.
- **Customizations** already exist (`CustomizationsManager`). An organization can publish one with its own theme, variants, fonts, default extension settings and extension preferences.
- **Apologist partners can already bring their own content.** The Apologist extension runs each chapter through the organization's Apologist team and shows the matching articles, videos and episodes as discovered content ([#1831](https://github.com/HelloAOLab/seed-bible/issues/1831)). A customization can supply the team's settings for everyone who uses it, including the API key, which stays on our server thanks to sensitive extension settings ([#1836](https://github.com/HelloAOLab/seed-bible/issues/1836)). This is the first working example of organization content through a customization.
- What's still missing: organizations _without_ an Apologist team have no simple way to say "here is our content", and readers have no way to choose which content sources show up.

### What we want to build

- **Organization content through customizations.** A customization should be able to bring its own discovered content (videos, articles, studies, reading plans) so that people who use that customization see it in the compact discover panel.
- **Content source settings.** A settings page where readers enable or disable each content provider, plus a single switch to hide third-party content entirely. The Seed Bible ships with some sources on by default (for example the Bible Project). Designs exist in Figma (see [#1719](https://github.com/HelloAOLab/seed-bible/issues/1719)).
- **Finish the move to the compact discover panel.** Remove the old Discover pane ([#1864](https://github.com/HelloAOLab/seed-bible/issues/1864)). Playlist History has already moved to the profile ([#1863](https://github.com/HelloAOLab/seed-bible/issues/1863)). What's left before the pane can go is making the panel's "Create" button ask what kind of content to create, as the Discover pane does today.
- **Fix the panel's rough edges** so the rollout isn't judged on them:
  - "All" filter doesn't show all content ([#1915](https://github.com/HelloAOLab/seed-bible/issues/1915))
  - Panel sometimes doesn't appear ([#1917](https://github.com/HelloAOLab/seed-bible/issues/1917))
  - Filters cut off on desktop ([#1908](https://github.com/HelloAOLab/seed-bible/issues/1908))
  - Option to hide the panel completely ([#1868](https://github.com/HelloAOLab/seed-bible/issues/1868))
  - ~~Toggle should show when the user only has a reading plan~~ ([#1866](https://github.com/HelloAOLab/seed-bible/issues/1866), fixed)

### Open questions

- How does an organization supply content: by listing items directly in the customization, by pointing at a feed or API, or by shipping an extension that registers a content provider? The extension route now works end to end for Apologist teams (see above), but building a new extension still asks a lot of a non-developer.
- If a reader turns off a source that their organization's customization turned on, who wins? (Suggested default: the reader.)

### Related issues

[#1719](https://github.com/HelloAOLab/seed-bible/issues/1719), [#1864](https://github.com/HelloAOLab/seed-bible/issues/1864), [#1915](https://github.com/HelloAOLab/seed-bible/issues/1915), [#1917](https://github.com/HelloAOLab/seed-bible/issues/1917), [#1908](https://github.com/HelloAOLab/seed-bible/issues/1908), [#1868](https://github.com/HelloAOLab/seed-bible/issues/1868), [#1830](https://github.com/HelloAOLab/seed-bible/issues/1830) (cross references in the panel). Closed: [#1863](https://github.com/HelloAOLab/seed-bible/issues/1863), [#1866](https://github.com/HelloAOLab/seed-bible/issues/1866), [#1831](https://github.com/HelloAOLab/seed-bible/issues/1831) (Apologist as discovered content)

---

## 2. Friends, and seeing their data

### Short version

Two people become friends by one sending a request and the other accepting it. Friends can then see each other's reading history, playlists, reading plans and notes, and join each other's live sessions.

### Where things stand

The first version **is done** ([#1939](https://github.com/HelloAOLab/seed-bible/pull/1939)). It replaced an earlier attempt, [#1599](https://github.com/HelloAOLab/seed-bible/pull/1599), which used one-way "follows". We switched to mutual friendships because "you can see my stuff" should be something both people agree to.

What it includes:

- A **Friends screen** on the profile: incoming requests (accept/decline), your friends (remove), add a friend by user ID or link, and sent requests (copy link/cancel).
- A **profile card** that opens when you tap someone's picture or name.
- **Friend links**: `?addFriend=<userId>` and `?friendRequest=<requestId>`. Neither acts without asking.
- An **Add friend button** on each participant in a shared session.
- **Friends' content around the app**: friends' playlists and notes in Discover, friends' reading plans, friends' reading in the Today Community section and the scripture map timeline, and invitations to sessions friends are hosting.

How it works underneath: each friendship is a CasualOS **shared permission** (a grant that lets one account read another's records). Accepting a request creates it in both people's records, so it is always mutual, and either person removing it ends it for both. Requests go to a specific account and expire after 7 days.

### Known gaps and follow-ups

1. **Data isn't actually private to friends yet.** Everything is still stored readable by anyone. Today the friends list only decides _whose_ data the app shows you, not _who is able_ to read it. Fixing this is item 4.
2. **Make the profile card the place to manage a friendship**: send, accept, decline, cancel or remove from the card, so it can be opened from anywhere.
3. **Open the profile card from chat** by tapping a name.
4. **Add friends by email.** Built but switched off until the CasualOS server looks up emails within the Seed Bible's account space (casual-simulation/casualos#890).
5. **Notify people about new friend requests** with web push notifications, instead of waiting for the app to refresh.
6. **Live updates.** A friend's new note currently appears the next time you return to the app or chapter. Live updates would give each user a small shared document that their friends watch.
7. **Useful previews for friend links** ([#1964](https://github.com/HelloAOLab/seed-bible/issues/1964)). A shared friend link currently previews as a plain Genesis 1 link. The server should recognize it and show "Add {name} as a friend" with their profile picture.
8. **Invite friends to a shared session** ([#1965](https://github.com/HelloAOLab/seed-bible/issues/1965)). When starting a session, list your friends with an Invite button that sends each one a push notification. This needs the same push notifications as gap 5.

### Related issues

[#1846](https://github.com/HelloAOLab/seed-bible/issues/1846) (subscribe to other users), [#1964](https://github.com/HelloAOLab/seed-bible/issues/1964), [#1965](https://github.com/HelloAOLab/seed-bible/issues/1965), [#1939](https://github.com/HelloAOLab/seed-bible/pull/1939) (merged), [#1599](https://github.com/HelloAOLab/seed-bible/pull/1599) (closed, superseded)

---

## 3. Today screen community section rework

**Depends on:** item 2.

### Short version

Turn the Today screen's Community section into a feed of what your friends have been reading and writing, and give friend requests a home there.

### What we want to build

The feed is designed in Figma and specified in [#1848](https://github.com/HelloAOLab/seed-bible/issues/1848):

- **Filter pills:** "All", "Notes" (notes only), "Reading" (reading history only).
- **Time frame dropdown** replacing "See All": last 48 hours, last week, last month, all.
- **"Crossed paths" grouping.** When several people read the same chapter in the selected time frame, they share one entry, placed by the most recent of their reads. For example, if you and a friend both read John 2 this week, you see one line for both of you. This applies to every time frame except "all".
- **"Prominent chapters" grouping.** For one person, each day shows only the chapters they spent the most time in. If someone spent 30 minutes in John 2–5 and 5 minutes in Romans 3, the day shows "read John 2–5".
- **No Seed Bible release notes** in this section for now.

New in this roadmap:

- **A friend requests section.** Pending friend requests appear on the Today screen with Accept and Decline, so people see them without digging into their profile. This also gives item 2's requests a visible place before push notifications exist.

### Related issues

[#1848](https://github.com/HelloAOLab/seed-bible/issues/1848), [#1777](https://github.com/HelloAOLab/seed-bible/issues/1777) (earlier community section redesign, closed), [#1886](https://github.com/HelloAOLab/seed-bible/issues/1886) (reader flashes before the Today screen)

---

## 4. Public/private data split

**Depends on:** item 2. **Made easier by:** item 13.

### Short version

Notes become private by default. When writing or editing a note, the author can choose to share it. Ideally there are three levels:

| Level       | Who can read it        |
| ----------- | ---------------------- |
| **Private** | Only you (the default) |
| **Friends** | You and your friends   |
| **Public**  | Anyone                 |

### Why this is more than a dropdown

Today nearly all user data (notes, highlights, playlists, reading plans, reading history, saves) is stored with CasualOS's `publicRead` marker. A **marker** is a label on a record that decides who can read it; `publicRead` means anyone who knows your user ID can read it. Hiding a note in the app's UI wouldn't stop someone from reading it directly from the server. Real privacy means storing each item under the marker that matches its level:

- **Private** → a marker only the owner can read.
- **Friends** → the `friends` marker that #1939's shared permissions grant access to.
- **Public** → `publicRead`, as today.

Changing a note's level means moving it from one marker to another, not flipping a field.

### What we want to build

- A visibility picker in the note editor (private / friends / public), defaulting to private.
- Storage for notes split by marker, and reads that combine your own notes across all three.
- Friends' views (item 2) and the Today feed (item 3) read only what they're allowed to.
- A migration for existing notes. **Decision needed:** existing notes are currently readable by anyone. Do they become private (safer, but friends who could see them before will lose them) or keep their current reach (no surprises, but not private-by-default)? Suggested default: private, with a one-time notice.
- The same treatment, in later passes, for the other data types. Each needs its own sensible default; reading history, for example, may make sense as "friends" by default since the community feed depends on it.

### Open questions

- Which data types get a per-item choice (notes, playlists) and which get one account-wide setting (reading history, highlights)?
- Reading history is stored in CasualOS shared documents (see item 13), and a shared document's markers can't be changed after it's created. That's the main reason item 13 is on this list.

### Related issues

Follow-up 3 in [#1939](https://github.com/HelloAOLab/seed-bible/pull/1939). No dedicated issue yet.

---

## 5. Customization design improvements

**Builds on:** item 1.

### Short version

Make the customization editor look and work like the rest of the app, and fill the gaps authors keep running into.

### What we want to build

- **Redesign the customization editor.** It doesn't look good and doesn't follow the app's conventions ([#1903](https://github.com/HelloAOLab/seed-bible/issues/1903)).
- **A default variant for Light and one for Dark** ([#1859](https://github.com/HelloAOLab/seed-bible/issues/1859)). Today a customization has one default variant, and under the System theme the app ignores it and picks the first variant matching the device. So an author with "Night" and "Midnight" (default) variants sees dark devices get "Night".
- **Theming from a link or API** ([#1251](https://github.com/HelloAOLab/seed-bible/issues/1251), closed and folded into the wider "customization center" / whitelabeling work). A partner like Apologist should be able to send someone into a Seed Bible already themed with their brand colors in one click, without having to save a customization to their account.
- **Remove the orange from the dark theme** ([#1870](https://github.com/HelloAOLab/seed-bible/issues/1870)).

### Related issues

[#1903](https://github.com/HelloAOLab/seed-bible/issues/1903), [#1859](https://github.com/HelloAOLab/seed-bible/issues/1859), [#1870](https://github.com/HelloAOLab/seed-bible/issues/1870). Closed: [#1251](https://github.com/HelloAOLab/seed-bible/issues/1251)

---

## 6. Bookmarks rework

### Short version

Bookmarks go back to meaning what people expect: a marker for where you are, which you move as you read. Collecting passages is what Saves are for.

### Where things stand

The old bookmarks (categorized, chapter or verse) have already been moved to the new **Saves** system. That leaves "bookmark" free to be rebuilt.

### What we want to build

Fully specified in [#1658](https://github.com/HelloAOLab/seed-bible/issues/1658):

- **Flat, named, colored, book + chapter only.** For example "Reading plan" in blue and "Sermon prep" in green. No categories, no verse-level bookmarks.
- **Soft limit of 5 per account.** Bookmarks are markers you move, not a collection you grow. Over the limit, "create" is disabled, but nothing is ever deleted.
- **One flow for every bookmark.** Tapping the bookmark button always opens a modal listing your bookmarks; pick one, hit save, and it moves to the current chapter. With no bookmarks yet, the modal starts with a ready-made "My bookmark". Either way it's two taps.
- **The button shows what's here**: an outline when there are none, a filled icon in the bookmark's color for one, and a small fanned stack for several (up to three drawn).
- **Shown in the tab list** (a colored dot), **on the Today screen** (a flat strip), and **in a sidebar panel** for renaming, recoloring and deleting.
- **Stored separately** (address `readingBookmarks`) so it can never pick up saves by mistake.

Afterwards, once telemetry shows everyone has migrated, finish the Saves move by removing the old `bookmarks` record ([#1659](https://github.com/HelloAOLab/seed-bible/issues/1659)).

### Related issues

[#1658](https://github.com/HelloAOLab/seed-bible/issues/1658), [#1659](https://github.com/HelloAOLab/seed-bible/issues/1659)

---

## 7. Onboarding improvements

### Short version

New users are asked too many things at once. Cut the first-run experience down so people reach Scripture quickly and learn the rest as they go.

### Where things stand

A new visitor can meet, close together: the Welcome / Today screen, the guided tutorial, the install-the-app prompt, a sign-in prompt, and the sidebar and toolbar all competing for attention. [#1813](https://github.com/HelloAOLab/seed-bible/issues/1813) already made the tutorial optional ("Take a tour") and starts desktop with the sidebar collapsed, and the install prompt no longer shows on startup. [#1942](https://github.com/HelloAOLab/seed-bible/issues/1942) went further: choosing "No thanks" on the tour, or leaving it early, now goes straight to Scripture without the "Install App" and "Download Translation" prompts. The install prompt waits for the next visit instead, and never comes back on that device once dismissed. Even with that, it is still too much.

### What we want to build

- **An inventory of every first-run prompt** and when each fires, so we can decide which to drop, merge or delay.
- **One thing at a time.** At most one prompt per visit at first, with the others moved to the moment they become useful (for example, ask to install after a few visits, ask to sign in when someone first tries to save something).
- **No flashes.** Nothing should flash before the right screen shows ([#1886](https://github.com/HelloAOLab/seed-bible/issues/1886)).

### Open questions

- Which prompts must stay on first visit? Language choice is a likely candidate, since everything else depends on reading it.

### Related issues

[#1886](https://github.com/HelloAOLab/seed-bible/issues/1886). Closed: [#1813](https://github.com/HelloAOLab/seed-bible/issues/1813), [#1942](https://github.com/HelloAOLab/seed-bible/issues/1942), [#1436](https://github.com/HelloAOLab/seed-bible/issues/1436). No dedicated issue yet for this pass.

---

## 8. Third-party extensions

**Helped by:** item 9.

### Short version

Let developers outside our team build and publish extensions that anyone can install.

### Where things stand

The extension system already works and is used for all of our own extensions (audio reader, Bonfire, Apologist, locations, Twitch, and so on). Extensions can declare settings, register discovered content, add chat providers and more. But every extension today is written by us and lives in this repository.

### What we want to build

- **A way to publish and install extensions from outside this repo**, with versions and updates.
- **A trust model.** Extensions run in the same page as the app (loaded with `import(url)`), so an extension can read anything the app can. Before opening this up we need to decide how much to trust outside code: review before listing, a permission list the user approves at install time, sandboxing, or some mix. One known gap to close as part of this: an extension can currently send requests using _another_ extension's stored secrets. It can't read the secret itself, but it does get the responses ([#1943](https://github.com/HelloAOLab/seed-bible/issues/1943)).
- ~~**Secrets for extensions**~~ (done: [#1836](https://github.com/HelloAOLab/seed-bible/issues/1836)). Extensions can declare `sensitive` settings such as API keys. Our server holds the value and adds it to the extension's requests, so the key never reaches the browser. A customization can also supply these values for everyone who uses it.
- **A cleaner Extensions screen** ([#1482](https://github.com/HelloAOLab/seed-bible/issues/1482)). Hide library-only extensions (ones with no visible effect of their own) behind a `utility` flag, and stop saving extensions that only make sense for one visit. This matters more once anyone can publish.
- **Developer docs**, which is item 9.

### Related issues

[#1482](https://github.com/HelloAOLab/seed-bible/issues/1482), [#1943](https://github.com/HelloAOLab/seed-bible/issues/1943). Closed: [#1836](https://github.com/HelloAOLab/seed-bible/issues/1836), [#673](https://github.com/HelloAOLab/seed-bible/issues/673) (packages for extensions)

---

## 9. Technical docs

### Short version

Write documentation that lets a developer who has never seen the Seed Bible start building on it, and that we can use internally and publish externally ([#1261](https://github.com/HelloAOLab/seed-bible/issues/1261)).

### What we want to build

- **Getting started**: running the app locally, project layout, how the managers fit together.
- **Writing an extension**: the extension entry point, the `init(context)` lifecycle, settings, discovered content, chat providers, with the refresh example extension as a walkthrough.
- **Building a customization**: themes, variants, fonts and (after item 1) content.
- **Data and privacy model**: what's stored where and who can read it (especially after item 4).

This repository already has `README.md`, `DEVELOPERS.md`, `CLAUDE.md` and `packages/bonfire-extension/CUSTOMIZING.md`, which are a starting point.

### Related issues

[#1261](https://github.com/HelloAOLab/seed-bible/issues/1261)

---

## 10. Sign in with YouVersion

**Depends on:** backend work in CasualOS.

### Short version

Add "Sign in with YouVersion" next to the existing email sign-in, working the same way as other "sign in with…" options. Designs exist in Figma (linked in [#1252](https://github.com/HelloAOLab/seed-bible/issues/1252)).

### Where things stand

The work is mostly on the backend (CasualOS) side, which is mostly but not fully done. Once that lands, follow-up tasks like syncing highlights with YouVersion can be split out. Finishing it also needs an app registered on the YouVersion platform.

### Related issues

[#1252](https://github.com/HelloAOLab/seed-bible/issues/1252)

---

## 11. Settings redesign

### Short version

Settings have grown one option at a time. Reorganize them so they're easy to scan and hard to break.

### What we want to build

- **Remove the "All settings" section** from Display & Theme ([#1872](https://github.com/HelloAOLab/seed-bible/issues/1872)). It lets people get into strange configurations without knowing how to undo them, and customizations now cover that need. Keep one "Scripture Font" dropdown that applies to book titles, chapter headings and verse text.
- **Merge UI text size and Scripture text size** ([#1579](https://github.com/HelloAOLab/seed-bible/issues/1579)).
- **A home for the new settings** from other items: content sources (item 1), privacy defaults (item 4), and hiding the compact discover panel ([#1868](https://github.com/HelloAOLab/seed-bible/issues/1868)).
- **Account settings opens the profile editor** ([#1799](https://github.com/HelloAOLab/seed-bible/issues/1799)).

### Related issues

[#1872](https://github.com/HelloAOLab/seed-bible/issues/1872), [#1579](https://github.com/HelloAOLab/seed-bible/issues/1579), [#1868](https://github.com/HelloAOLab/seed-bible/issues/1868), [#1799](https://github.com/HelloAOLab/seed-bible/issues/1799), [#1435](https://github.com/HelloAOLab/seed-bible/issues/1435) (given/family name fields)

---

## 12. Bonfire AI tool calling

### Short version

Let the Bonfire AI take actions in the app, not just answer in text. For example, "make me a playlist on the Psalms of comfort" should actually build the playlist.

### Where things stand

The chat system already supports this. App features can hand the AI a set of **tools** (functions it may call), and the playlist editor already offers tools to add, edit, move and delete playlist items. Chat providers declare `supportsToolCalling`. The Apologist provider supports it; Bonfire doesn't yet, so those features are unavailable when chatting with Bonfire. The playlist editor's AI button now hides itself when no chat agent can edit playlists, instead of opening an empty chat ([#1920](https://github.com/HelloAOLab/seed-bible/issues/1920)). That fixes the symptom; Bonfire still can't do the work.

AI chat also now follows the open tab's translation, and can look up translations the app has, then ask before switching ([#1265](https://github.com/HelloAOLab/seed-bible/issues/1265)).

### What we want to build

- Tool calling support in the Bonfire provider.
- The other Bonfire improvements from [#1627](https://github.com/HelloAOLab/seed-bible/issues/1627): sources, follow-up suggestions, Markdown rendering, and links to HeyBonfire's terms and privacy policy.
- More tools over time, for example opening a passage.

### Related issues

[#1627](https://github.com/HelloAOLab/seed-bible/issues/1627). Closed: [#1920](https://github.com/HelloAOLab/seed-bible/issues/1920), [#1265](https://github.com/HelloAOLab/seed-bible/issues/1265)

---

## 13. Rework reading history to use data records

**Supports:** item 4.

### Short version

Move reading history out of CasualOS shared documents and into ordinary data records, like the rest of the app's data.

### Why

Reading history is currently stored in one **shared document** (a real-time, multi-device document, built on Yjs) per user per year (`ReadingHistoryManager`). That was chosen for live syncing, but it causes problems:

- **Privacy can't be changed later.** A shared document's marker is fixed when it's created. Existing reading history is under `publicRead` and can't be moved to a `friends` or private marker in place. That blocks item 4 for reading history.
- **Reading it is heavy.** To show a friend's reading on the Today screen (item 3), the app has to open a live connection to that friend's document for each year, instead of just fetching some records.
- **Slow failure.** Opening a document can hang when offline, so the code needs timeouts and fallbacks around every read.

Data records are a simple request/response read, can be given any marker, and match how notes, playlists and reading plans are already stored.

### What we want to build

- A record layout for reading history that supports the queries the Today feed and scripture map need (by time range and by chapter) without loading everything.
- A migration from the yearly documents, done in two halves like the Saves migration: write the new records and fall back to the old documents, then remove the old documents once telemetry shows everyone has moved.
- Keep the existing offline store, so reading is still recorded without a connection and synced later.

### Related issues

[#383](https://github.com/HelloAOLab/seed-bible/issues/383) (original reading history system, closed), [#133](https://github.com/HelloAOLab/seed-bible/issues/133) (reading history in the Bible Stack). No dedicated issue yet.

---

## 14. Circles (friend groups)

**Depends on:** items 2 and 4.

### Short version

Let people sort friends into groups ("Family", "Small group", "Sermon team"), like Google+ circles, and share notes and other content with particular circles instead of all friends.

### What we want to build

- Create, rename and delete circles, and add or remove friends. Circles are private to their owner; the people in a circle don't see what you named it.
- A fourth sharing level: alongside private, friends and public, choose one or more circles when sharing a note (and later playlists and reading plans).
- Filters on the Today feed (item 3) and Discover to show only a circle's activity.

### Why it comes after item 4

Sharing with a circle has to mean only that circle can read it, which needs a CasualOS marker per circle and a shared permission for each member. This is the same machinery item 4 sets up for "friends", applied to smaller groups.

### Open questions

- Is a circle only an organizing tool for the person who made it (Google+ style), or can it also be a shared group that everyone in it sees, like a church small group? The second overlaps with the "church / family" community ideas and may deserve its own item.
- How do circles relate to shared sessions? For example, could you start a session with a circle?

### Related issues

None yet. #1599's discussion mentions inviting people "to your circle" as a Today screen goal.

---

## 15. Multiple accounts on a device

### Short version

Let people sign in to more than one account on the same device and switch between them, without signing out and back in.

### Who it's for

A family sharing a tablet, or one person with a personal account and a ministry account.

### What we want to build

- A list of signed-in accounts and a quick switcher, probably from the profile menu.
- Each account's data (settings, open tabs, offline reading history, cached records) kept separate on the device, so switching never mixes them. Several managers already handle switching accounts carefully; this makes it something the user does on purpose.

### How this differs from multiple profiles

[#1660](https://github.com/HelloAOLab/seed-bible/issues/1660) proposes several **profiles inside one account** (Netflix style: one sign-in, several people). This item is several **accounts on one device**: separate sign-ins, separate everything. They solve overlapping problems. **Decision needed:** build one, the other, or both? Multiple accounts is the smaller change, because each account is already a complete identity.

### Related issues

[#1660](https://github.com/HelloAOLab/seed-bible/issues/1660) (multiple profiles on an account)

---

## 16. MCP support

**Helped by:** item 12.

### Short version

Let outside AI assistants (Claude, ChatGPT and others) work with the Seed Bible through the **Model Context Protocol (MCP)**, an open standard for connecting AI assistants to apps and data.

### What it could look like

There are two directions, and they're quite different:

- **Seed Bible as an MCP server.** Someone connects their own AI assistant to their Seed Bible account and asks it to "find my notes on grace", "add Romans 8 to my morning playlist", or "what did I read last week?". This reuses the same kinds of tools item 12 builds, offered to outside assistants.
- **Seed Bible as an MCP client.** The in-app chat (or an extension) connects to outside MCP servers to gain new abilities, such as a commentary library or a church's sermon archive.

### Where things stand

The client direction came first and is done ([#1670](https://github.com/HelloAOLab/seed-bible/pull/1670)). It's an optional **MCP extension** installed from Settings → Extensions. Its "AI Chat Settings" screen lets someone add an MCP server by URL (with an optional sign-in header), and that server's tools become available in AI chat. The server list is saved privately, since it can hold passwords or keys.

Its limits:

- **Only servers on the internet.** MCP servers that run on someone's own computer aren't supported, because the chat runs entirely in the browser and has no server of ours to relay through.
- **Only chat agents with tool calling can use them**, so not Bonfire until item 12 is done.

### What we want to build

- **The server direction**, building on item 12's tools.

### Open questions

- How does an outside assistant sign in, and what can it do on the user's behalf? This needs the same care as item 8's trust model, and must respect item 4's privacy levels.

### Related issues

[#1670](https://github.com/HelloAOLab/seed-bible/pull/1670) (MCP client extension, merged). No issue yet for the server direction.
