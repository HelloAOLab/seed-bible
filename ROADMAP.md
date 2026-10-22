# Seed Bible Roadmap

Seed Bible is a Bible reading and study app made for reading together. You can read alongside friends, join live shared reading sessions, and see content from churches and ministries right beside the chapter you're reading.

This roadmap shows what we're working on and what comes next. Each item explains what it is, why it matters, and where it stands today. The numbers are there to make items easy to refer to; they aren't a ranking. Only item 1 has to be finished before we bring Seed Bible to a wider audience. The rest will arrive as each piece is ready.

Want to help any of this happen sooner? [Here's how to get involved](#want-to-help).

_Last updated 2026-10-22_

## At a glance

✅ Done · 🚧 In progress · ⏳ Waiting on someone else · 💭 Planned, not started

| #   | Item                                                                            | Area                  | Status                  |
| --- | ------------------------------------------------------------------------------- | --------------------- | ----------------------- |
| 1   | [Content from churches and ministries](#1-content-from-churches-and-ministries) | Churches & ministries | 🚧 In progress          |
| 2   | [Reading with friends](#2-reading-with-friends)                                 | Community             | ✅ Done — more to come  |
| 3   | [A friends feed on the Today screen](#3-a-friends-feed-on-the-today-screen)     | Community             | ✅ Done — more to come  |
| 4   | [Private by default](#4-private-by-default)                                     | Privacy               | 💭 Planned              |
| 5   | [A better customization editor](#5-a-better-customization-editor)               | Churches & ministries | 🚧 In progress          |
| 6   | [Simpler bookmarks](#6-simpler-bookmarks)                                       | Reading               | ✅ Done — more to come  |
| 7   | [A gentler first visit](#7-a-gentler-first-visit)                               | First visit           | 🚧 In progress          |
| 8   | [Extensions from other developers](#8-extensions-from-other-developers)         | Developers            | 🚧 In progress          |
| 9   | [Developer documentation](#9-developer-documentation)                           | Developers            | 💭 Planned              |
| 10  | [Sign in with YouVersion](#10-sign-in-with-youversion)                          | Accounts              | ⏳ Waiting on a partner |
| 11  | [Simpler settings](#11-simpler-settings)                                        | Settings              | 💭 Planned              |
| 12  | [Bonfire AI that can take action](#12-bonfire-ai-that-can-take-action)          | AI                    | 💭 Planned              |
| 13  | [Groundwork for reading history](#13-groundwork-for-reading-history)            | Privacy               | 💭 Planned              |
| 14  | [Circles of friends](#14-circles-of-friends)                                    | Community             | 💭 Planned              |
| 15  | [Switching between accounts](#15-switching-between-accounts)                    | Accounts              | 💭 Planned              |
| 16  | [Connecting with other AI tools](#16-connecting-with-other-ai-tools)            | AI                    | 🚧 In progress          |
| 17  | [Better shared reading sessions](#17-better-shared-reading-sessions)            | Community             | 🚧 In progress          |
| 18  | [Playlists, rebuilt](#18-playlists-rebuilt)                                     | Study                 | 🚧 In progress          |
| 19  | [Content matched to the right verses](#19-content-matched-to-the-right-verses)  | Churches & ministries | 💭 Planned              |

### How the pieces fit together

Several items are steps along the same path:

- **Reading together (2 → 3 → 4 → 14).** Friends came first, and the Today screen now shows what your friends are reading and writing (3). As people share more, they need to choose _what_ they share (4). Circles (14) then let them share with some friends rather than all of them.
- **Privacy needs groundwork (13 → 4).** Making something truly private means changing how it's stored, not just hiding it on screen. Reading history is the hardest piece to change, so it has its own item (13).
- **Churches and ministries (1 → 5).** First, organizations need to be able to bring their own content (1). Then the tool they use to set up their own version of Seed Bible should get easier to use (5).
- **AI (12 → 16).** First, Bonfire catches up with Seed Bible's other AI chat and learns to take actions for you (12). Then Seed Bible connects with other AI tools people already use (16).
- **Playlists and AI (18, 12, 16).** Playlists are where much of the AI work pays off. AI chat can already build them (12), partners' AI will offer one at the end of a conversation (18), and outside AI tools will be able to make and share them (16).
- **Getting content to the right chapter (19 → 1).** Working out which verses a video or article is about (19) is what lets any organization's content appear beside the right chapter (1).

---

## 1. Content from churches and ministries

🚧 **In progress.** This is the one item we need before a wider launch.

Churches, ministries and partners want to put their own videos, articles and studies in front of their people, right beside the chapter being read. Readers, in turn, want to choose which sources they see.

Organizations do this through a **customization**: their own version of Seed Bible with their colors, logo, fonts and recommended features. Anyone who opens the organization's link reads in that version.

**Where it stands**

- While you read, a panel under the chapter shows related content: notes, playlists, reading plans, and videos from sources like the Bible Project.
- Organizations can already create a customization.
- Ministries that use Apologist can now have their own articles, videos and episodes appear for each chapter. They set it up once in their customization, and everyone using it sees that content. This is the first working example of an organization bringing its own content.
- A ministry can also share a link that turns its Apologist content on for whoever opens it, and readers can switch that content on or off in the add-on's settings.
- Readers who'd rather not see the panel at all can switch it off in Settings.

**What's next**

- A simple way for _any_ organization to add its content, not just Apologist users.
- A settings page where readers turn each source on or off. This is designed but not yet built.
- One look for this content. The full-screen view will match the panel under the chapter. (We had planned to retire the full-screen view, but it's staying.)
- On phones, show content for the verses you've selected right in the menu that opens when you select them, instead of only at the bottom of the chapter.
- Polish before launch: the "All" filter misses some content, and the panel occasionally doesn't appear. (Its filters getting cut off on wide screens is fixed.) Reminders to mark off reading-plan days, in the panel and as pop-up notices, also turned out to be more distracting than helpful, so they're coming out.

**Still deciding**

- What's the easiest way for an organization to supply content: a list in their customization, a link to a feed they already publish, or a small add-on? Add-ons work today, but building one asks a lot of someone who isn't a developer.
- If a reader turns off a source their organization turned on, whose choice wins? We lean toward the reader's.

_On GitHub:_ [#1719](https://github.com/HelloAOLab/seed-bible/issues/1719), [#2000](https://github.com/HelloAOLab/seed-bible/issues/2000), [#1998](https://github.com/HelloAOLab/seed-bible/issues/1998), [#1915](https://github.com/HelloAOLab/seed-bible/issues/1915), [#1917](https://github.com/HelloAOLab/seed-bible/issues/1917), [#1994](https://github.com/HelloAOLab/seed-bible/issues/1994), [#1995](https://github.com/HelloAOLab/seed-bible/issues/1995), [#1830](https://github.com/HelloAOLab/seed-bible/issues/1830), [#1831](https://github.com/HelloAOLab/seed-bible/issues/1831), [#1868](https://github.com/HelloAOLab/seed-bible/issues/1868)

---

## 2. Reading with friends

✅ **Done**, with more to come.

Send someone a friend request. Once they accept, you can see each other's reading, notes, playlists and reading plans, and join each other's live reading sessions. Friendships are mutual on purpose: letting someone see your reading should be something both people agree to.

**What's done**

- A Friends screen on your profile for sending, accepting and managing requests.
- Add a friend by sharing a link, or straight from a shared reading session.
- Tap anyone's picture or name to see their profile.
- Friends' notes, playlists and reading plans appear throughout the app, their reading shows on the Today screen, and sessions they're hosting show up as invitations.

**What's next**

- **Real privacy for what friends share** (item 4). Today the app decides whose content to show you, but the content itself isn't yet locked to friends only.
- Manage a friendship from someone's profile, and open a profile by tapping a name in chat.
- A full profile page for each friend, with their notes, playlists and reading plans in one place.
- Add friends by email. This is built, and waiting on a change to CasualOS, the platform Seed Bible is built on.
- Notifications on your phone or computer for new friend requests, and a way to invite friends straight into a reading session.
- Reply to a friend's note, so you can talk about it together.
- See a friend's new note as soon as they write it, instead of the next time you open the app.
- Better previews when you share a friend link, showing who it's from.

_On GitHub:_ [#1939](https://github.com/HelloAOLab/seed-bible/pull/1939), [#2003](https://github.com/HelloAOLab/seed-bible/issues/2003), [#2004](https://github.com/HelloAOLab/seed-bible/issues/2004), [#2005](https://github.com/HelloAOLab/seed-bible/issues/2005), [#2006](https://github.com/HelloAOLab/seed-bible/issues/2006), [#2002](https://github.com/HelloAOLab/seed-bible/issues/2002), [#1846](https://github.com/HelloAOLab/seed-bible/issues/1846), [#1964](https://github.com/HelloAOLab/seed-bible/issues/1964), [#1965](https://github.com/HelloAOLab/seed-bible/issues/1965), [#1991](https://github.com/HelloAOLab/seed-bible/issues/1991)

---

## 3. A friends feed on the Today screen

✅ **Done**, with more to come. Builds on item 2.

The Today screen's community section is a feed of what you and your friends have been reading and writing.

**What's done**

- **Filters** for all activity, notes only, or reading only.
- **Recent activity first**, from about the last two days, with "See more" to go further back. A History button shows past activity by year and by day.
- **Crossed paths.** When you and your friends read the same chapter around the same time, you see one line for all of you, like "Ana and Ben both read John 2". It's a natural nudge to talk about it.
- **Each day's highlights.** For each person, only the chapters they spent the most time in. If someone spent half an hour in John 2–5 and a few minutes in Romans 3, you see "read John 2–5".

**What's next**

- **Friend requests** with Accept and Decline right on the Today screen, so nobody has to go looking for them.

_On GitHub:_ [#1946](https://github.com/HelloAOLab/seed-bible/pull/1946), [#1848](https://github.com/HelloAOLab/seed-bible/issues/1848)

---

## 4. Private by default

💭 **Planned.** Builds on item 2, and item 13 makes it easier.

Notes become private unless you choose to share them. When writing a note, you pick who can read it:

| Level       | Who can read it        |
| ----------- | ---------------------- |
| **Private** | Only you (the default) |
| **Friends** | You and your friends   |
| **Public**  | Anyone                 |

**Why this takes real work**

Today, most of what people create in Seed Bible is stored so that anyone who knew where to look could read it; the app simply doesn't display it. Real privacy means our servers refuse to hand a private note to anyone else. So each note has to be stored differently depending on who may read it, and changing a note's privacy means moving it, not just flipping a switch.

**Where it stands**

Nothing is built yet, but the work is split into two steps. Things only you ever look at, like your saves and bookmarks, can be locked to you first. Limiting shared content to your friends needs a change to CasualOS, which its team is working on.

**What's planned**

- A privacy choice when writing a note, set to private by default.
- Friends' content and the Today feed only ever show what each person is allowed to see.
- Moving existing notes over. One decision is still open: should existing notes become private (safer, but friends lose sight of notes they could see before) or keep reaching who they reach today? We lean toward private, with a one-time notice explaining the change.
- The same treatment for highlights, playlists, reading plans and reading history, each with a sensible default.

**Still deciding**

- Which kinds of content get a choice on each item (like notes and playlists), and which get one setting for your whole account (like reading history)?

_On GitHub:_ [#2007](https://github.com/HelloAOLab/seed-bible/issues/2007), [#2008](https://github.com/HelloAOLab/seed-bible/issues/2008)

---

## 5. A better customization editor

🚧 **In progress.** Builds on item 1.

The tool organizations use to set up their own version of Seed Bible should be as polished as the rest of the app.

**Where it stands**

- The editor has had its first redesign to look and work like the rest of Seed Bible. Each customization shows a preview of its look, and while you edit a look you see a sample Bible passage change as you go, with a warning when text would be hard to read.
- On a computer, that sample passage now stays in view beside the editor as you scroll, and shows the highlight color you're changing.
- An organization can hide every add-on by default and pick just the ones its readers should see. Add-ons that arrive in Seed Bible later stay hidden too, until the organization chooses otherwise.

**What's next**

- More polish on the redesigned editor.
- **Separate default looks for light and dark mode.** Today an organization picks one default look, and devices in dark mode can end up with a different dark look than the one intended.
- **One-click branded links.** A partner sends someone a link, and Seed Bible opens in the partner's colors without anyone having to save anything. This is part of a wider effort to make it easy for organizations to set up their own Seed Bible.
- **A calmer dark theme**, without the orange accents.

_On GitHub:_ [#1983](https://github.com/HelloAOLab/seed-bible/pull/1983), [#1903](https://github.com/HelloAOLab/seed-bible/issues/1903), [#1859](https://github.com/HelloAOLab/seed-bible/issues/1859), [#1251](https://github.com/HelloAOLab/seed-bible/issues/1251), [#1870](https://github.com/HelloAOLab/seed-bible/issues/1870)

---

## 6. Simpler bookmarks

✅ **Done**, with more to come.

A bookmark is back to meaning what people expect: a marker for where you're up to, which you move along as you read. Collecting favorite passages is what Saves are for, and the old style of bookmarks has moved there.

**What's done**

- **Up to five named, colored bookmarks.** For example, "Reading plan" in blue and "Sermon prep" in green. Each one marks a book and chapter.
- **Two taps** to move a bookmark to where you are now: the bookmark button above the chapter, then the bookmark.
- **See at a glance** which of your bookmarks are on the chapter you're reading.
- **Visible where you need them**: in your open tabs, on the Today screen, and in a sidebar panel for renaming, recoloring and deleting.

**What's next**

- **Black, gray and white bookmarks**, for people who don't want a bright color on every bookmark. Every bookmark also gets a subtle outline and shading, so each color stands out in both light and dark mode.
- **A clearer bookmarks button in the Tabs menu.** It shows an outline when the bookmarks panel is closed and fills in when it's open, like the saves button beside it.

_On GitHub:_ [#1984](https://github.com/HelloAOLab/seed-bible/pull/1984), [#2040](https://github.com/HelloAOLab/seed-bible/issues/2040), [#2039](https://github.com/HelloAOLab/seed-bible/issues/2039)

---

## 7. A gentler first visit

🚧 **In progress.**

New visitors are asked too many things at once. We want people to reach Scripture quickly and discover the rest as they go.

**Where it stands**

- The guided tour is now optional ("Take a tour"), and the sidebar starts tucked away on desktop.
- Saying "No thanks" to the tour, or leaving it early, now goes straight to Scripture with no further prompts.
- The prompt to install the app waits for a later visit, and once dismissed it never comes back on that device.

It's better, but still more than we'd like.

**What's next**

- List every prompt a first-time visitor can see, and decide which to drop, combine or delay.
- At most one prompt per visit, with the rest asked at the moment they become useful. For example, ask people to sign in when they first try to save something.
- No flash of the wrong screen while the app loads.
- **A tour offer that waits its turn.** The offer of a guided tour should appear only once you're actually reading, after a moment, and ease in. Today it can pop up the instant the Today screen closes, even over the sign-in screen.
- **Back to where you were after signing in.** Signing in from your profile should return you to what you were doing, not leave you on your profile.
- **Better tutorials throughout the app**, explaining each feature at the moment you first use it, not all at once on the first visit.

**Still deciding**

- Which prompts must stay on the first visit? Choosing a language is likely one, since everything else depends on being able to read it.

_On GitHub:_ [#1813](https://github.com/HelloAOLab/seed-bible/issues/1813), [#1942](https://github.com/HelloAOLab/seed-bible/issues/1942), [#1886](https://github.com/HelloAOLab/seed-bible/issues/1886), [#2044](https://github.com/HelloAOLab/seed-bible/issues/2044), [#2045](https://github.com/HelloAOLab/seed-bible/issues/2045)

---

## 8. Extensions from other developers

🚧 **In progress.** Developer documentation (item 9) will help.

Extensions are add-ons that give Seed Bible new abilities, like audio narration, AI chat, or maps of places in the Bible. Our team builds all of them today. We want developers outside our team to be able to build and share their own, so Seed Bible can grow faster than one team could manage alone.

**Where it stands**

- The extension system works, and every extension in Seed Bible today is built on it.
- Extensions can now keep passwords and access keys for other services safely on our servers, so they never reach a reader's device. An organization can supply these for everyone using its customization.

**What's next**

- A way for outside developers to publish extensions, and for readers to install and update them.
- **Deciding how much to trust outside code.** An extension runs inside the app, so it could see anything the app can. Options include reviewing extensions before listing them, asking readers to approve what an extension may do when they install it, keeping extensions walled off from the rest of the app, or a mix. Part of this is making sure one extension can never use another's access keys.
- A tidier Extensions screen that hides extensions which only exist to support other extensions.
- **Clear answers when one extension needs another.** Show which extensions rely on each one. If you try to remove an extension that others still need, explain why and offer to remove them together, instead of it quietly coming back.

_On GitHub:_ [#1482](https://github.com/HelloAOLab/seed-bible/issues/1482), [#1836](https://github.com/HelloAOLab/seed-bible/issues/1836), [#1943](https://github.com/HelloAOLab/seed-bible/issues/1943), [#2030](https://github.com/HelloAOLab/seed-bible/issues/2030)

---

## 9. Developer documentation

💭 **Planned.**

Documentation that lets a developer who has never seen Seed Bible start building on it, written so we can use it ourselves and publish it.

- **Getting started:** running Seed Bible on your own computer and how it's organized.
- **Writing an extension**, with a worked example from start to finish.
- **Building a customization:** colors, looks, fonts and content.
- **How data and privacy work:** what's stored where, and who can read it.

_On GitHub:_ [#1261](https://github.com/HelloAOLab/seed-bible/issues/1261)

---

## 10. Sign in with YouVersion

⏳ **Waiting on a partner.**

Sign in to Seed Bible with your YouVersion account, alongside the existing email sign-in. The design is finished.

**Where it stands**

Most of the work is in CasualOS, the platform Seed Bible is built on. That work is mostly done but not finished. Seed Bible also needs to be registered as an app with YouVersion. Once sign-in works, it opens the door to things like keeping your highlights in sync with YouVersion.

_On GitHub:_ [#1252](https://github.com/HelloAOLab/seed-bible/issues/1252)

---

## 11. Simpler settings

💭 **Planned.**

Settings have grown one option at a time. We want them easy to scan and hard to get lost in.

- **Remove the "All settings" section** under Display & Theme. It lets people end up with odd combinations without knowing how to undo them, and customizations now cover what it was for. A single Scripture font choice stays.
- **One text size setting** instead of separate ones for the app and for Scripture.
- **A home for new settings** from other items: choosing content sources (item 1) and privacy defaults (item 4). The switch to hide the related-content panel is already in Display & Theme.
- **Account settings opens your profile**, where you can edit it directly.

_On GitHub:_ [#1872](https://github.com/HelloAOLab/seed-bible/issues/1872), [#1579](https://github.com/HelloAOLab/seed-bible/issues/1579), [#1799](https://github.com/HelloAOLab/seed-bible/issues/1799)

---

## 12. Bonfire AI that can take action

💭 **Planned.**

Seed Bible's AI chat can already do things for you, not just answer. Ask it to "make me a playlist on the Psalms of comfort", and it builds the playlist. This item brings the same abilities to Bonfire, the AI from HeyBonfire.

**Where it stands**

Taking actions already works when chatting with Apologist's AI. It can build and edit playlists, follows the Bible translation you're reading, and offers to switch translations when you ask about one. Bonfire can only answer in text so far, so these features are hidden while chatting with Bonfire.

**What's next**

- Teach Bonfire to take actions.
- Other Bonfire improvements: showing its sources, suggesting follow-up questions, better formatting, and links to HeyBonfire's terms and privacy policy.
- More actions over time, such as opening a passage for you.

_On GitHub:_ [#1627](https://github.com/HelloAOLab/seed-bible/issues/1627), [#1265](https://github.com/HelloAOLab/seed-bible/issues/1265)

---

## 13. Groundwork for reading history

💭 **Planned.** Makes item 4 possible for reading history.

A behind-the-scenes rebuild of how reading history is saved. Readers won't see a new feature, but it lets reading history be made private (item 4) and makes the friends feed (item 3) faster and more reliable.

**Why**

Today, each person's reading history for each year lives in one live document that syncs constantly between their devices. That was good for syncing, but it causes problems:

- **Who can read it is fixed when it's created**, so existing reading history can't be made private.
- **Showing a friend's reading is slow**, because the app has to open a live connection to each of their documents.
- **It can hang while offline.**

**What's planned**

- Store reading history the same simple way as notes and playlists.
- Move existing history over gradually, so nothing is lost.
- Keep recording your reading while you're offline, and sync it once you reconnect.

---

## 14. Circles of friends

💭 **Planned.** Builds on items 2 and 4.

Sort your friends into groups like "Family", "Small group" or "Sermon team", and share notes with just those groups.

- Create, rename and manage your circles. Circles are private to you; friends don't see what you named them.
- When sharing a note, choose one or more circles, alongside private, friends and public.
- Filter the Today feed and related content to see one circle's activity.

**Why it comes after item 4:** sharing with a circle has to mean that only that circle can read it. That uses the same privacy groundwork item 4 builds for friends.

**Still deciding**

- Is a circle just a way for you to organize your friends, or can it also be a shared group that everyone in it sees, like a church small group? The second might deserve its own item.
- Could you start a live reading session with a whole circle?

---

## 15. Switching between accounts

💭 **Planned.**

Stay signed in to more than one account on the same device and switch between them quickly. This helps a family sharing a tablet, or someone with both a personal account and a ministry account.

- A quick account switcher, probably in the profile menu.
- Each account's settings, open tabs and saved data kept separate on the device, so switching never mixes them up.

**Still deciding**

A related idea is several profiles inside one account, the way a streaming service lets each family member have their own profile under one sign-in. The two solve overlapping problems. Should we build one, the other, or both? Separate accounts are the smaller change.

_On GitHub:_ [#1660](https://github.com/HelloAOLab/seed-bible/issues/1660)

---

## 16. Connecting with other AI tools

🚧 **In progress.** Item 12 will help.

Connect Seed Bible with other AI tools using the **Model Context Protocol (MCP)**, an open standard for linking AI assistants to apps and information. This works in two directions:

- **Bring outside tools into Seed Bible's AI chat. ✅ Done.** An optional add-on in Settings lets you connect an online service, such as a commentary library or a church's sermon archive, so the AI chat can draw on it. It works with AI chats that can take actions, so not with Bonfire until item 12 is done.
  - Next, the chat will name the tools the AI used, so you can tell when it drew on a connected service. Today it only says how many it used.
- **Let your own AI assistant work with your Seed Bible. 💭 Next.** Connect an assistant like Claude or ChatGPT to your account and ask it to "find my notes on grace", "add Romans 8 to my morning playlist", or "what did I read last week?".
  - **Making and sharing playlists** is the most important part. Someone studying with an AI assistant they already use should be able to say "make me a playlist on forgiveness and share it with my small group", and get a real Seed Bible playlist (item 18). This reaches people where they already are, which may matter even more than Seed Bible's own AI chat.

**Still deciding**

- How does an outside assistant sign in, and what is it allowed to do on your behalf? This needs the same care as item 8, and must respect your privacy choices from item 4.

_On GitHub:_ [#1670](https://github.com/HelloAOLab/seed-bible/pull/1670), [#2047](https://github.com/HelloAOLab/seed-bible/issues/2047)

---

## 17. Better shared reading sessions

🚧 **In progress.**

In a shared reading session, a group reads the same chapter together in real time, whether they're in one room or spread across the world. Sessions already work. These improvements make it easier for everyone to stay together, especially in larger groups.

**Where it stands**

- Anyone can join a session from its link or by scanning its QR code.
- The host decides whether only they can change the passage or highlight for everyone, and can appoint co-hosts.
- You can see where others are reading, but only while their part of the chapter overlaps with yours.
- When someone highlights a verse you can't see, a small notice at the top or bottom of the page shows who it was and which verse. Tap it to go there.
- **See which verse someone picks.** When a host or co-host selects a verse, its number briefly flashes in their color for everyone. Hosts can let everyone's picks show or turn this off, and anyone can turn it off for themselves. It stays still for people whose device is set to reduce motion, unless they turn it on.

**What's next**

- **Follow someone's place.** Choose a person in the session, and your screen scrolls along with what they're reading. Scroll away to stop following, then tap once to catch up again. Hosts choose who can be followed, or have everyone follow the host as they join.
- **See where everyone is**, even when they're far ahead of or behind you, with small markers at the top or bottom of the page.
- **Less clutter in big groups.** Hosts can choose to show only their own place, which happens on its own once four or more people join.
- **Invite friends straight into a session** (see item 2).
- **See who's in the session on a computer.** On phones, tapping the participants' pictures opens a list where you can add them as friends. Computers get the same pictures beside the reader and the same list, and clicking someone's picture in the tab list opens it too.
- **Related content in a session.** It's hidden in sessions today without explanation, which can look like a bug. Explain why, and let people turn it on for themselves.
- **Notice when someone's connection drops.** Today, someone who suddenly loses signal can stay listed in the session for a long time, and if it's the host, nobody is told.
- **A clear "Joining session…" message** while a session link loads. Today the page first shows something else, then switches to the session on its own.
- **Voice and video calls in a session**, later on, so a group spread across different places can talk while they read, without needing a separate service for the call.

_On GitHub:_ [#1986](https://github.com/HelloAOLab/seed-bible/issues/1986), [#1961](https://github.com/HelloAOLab/seed-bible/issues/1961), [#1962](https://github.com/HelloAOLab/seed-bible/issues/1962), [#1965](https://github.com/HelloAOLab/seed-bible/issues/1965), [#1819](https://github.com/HelloAOLab/seed-bible/issues/1819), [#2024](https://github.com/HelloAOLab/seed-bible/issues/2024), [#2041](https://github.com/HelloAOLab/seed-bible/issues/2041), [#2037](https://github.com/HelloAOLab/seed-bible/issues/2037), [#1974](https://github.com/HelloAOLab/seed-bible/pull/1974), [#2015](https://github.com/HelloAOLab/seed-bible/pull/2015)

---

## 18. Playlists, rebuilt

🚧 **In progress.**

A playlist is a path through the Bible: passages, notes and videos in an order you choose, to follow yourself or share with others. Playlists are one of the main ways people teach and learn with Seed Bible. We want building one to be as easy as following one, and we want playlists to grow into full lessons and courses.

**Where it stands**

- Anyone can make and share a playlist, and friends' playlists appear throughout the app.
- Seed Bible's AI chat can already build and edit playlists when you chat with Apologist's AI (see item 12).
- A redesign of the playlist editor is underway. It opens full screen, and you edit each step right where it sits in the list, instead of in a form at the bottom.

**What's next**

- Finish the new editor, including better notes inside a playlist.
- Make it clear when you're following a playlist, with separate controls for leaving the playlist and for playing audio.
- **Playlists from AI conversations.** At the end of a conversation with a partner's AI, be offered a playlist that carries the study on in Seed Bible. This starts with Apologist's AI, and comes to Bonfire once it can take actions (item 12).
- **Lessons and courses, later.** Steps an AI guides you through, quizzes, and steps that combine a passage, a video and questions, so a whole lesson or course can be a playlist.

_On GitHub:_ [#2027](https://github.com/HelloAOLab/seed-bible/pull/2027), [#2013](https://github.com/HelloAOLab/seed-bible/issues/2013), [#1992](https://github.com/HelloAOLab/seed-bible/issues/1992)

---

## 19. Content matched to the right verses

💭 **Planned.** Makes item 1 possible for any organization.

For a video, article or study to appear beside the right chapter, something has to work out which books, chapters and verses it's about. Today that depends on the partner. Apologist content, for example, is found by searching the partner's library for the chapter being read, which is only approximate. We want a service of our own that does this well for any content an organization brings in.

**What's planned**

- A service that reads a piece of content and records which passages it relates to. Simple rules handle clear references like "John 3:16", and AI helps with everything else, like a sermon that discusses a passage without quoting it.
- It works across languages. Book names and the way references are written differ from language to language, which is part of what makes this hard.
- Every content source in item 1 uses it, so any organization's content can find its way to the right chapter.

**Still deciding**

- Build it entirely ourselves, or work with partners who already do part of this? We're planning as if it's ours to build.

---

## Want to help?

Seed Bible is built by [AO Lab](https://helloao.org/), a non-profit dedicated to making the Bible and related resources freely available to anyone who needs them. If any part of this roadmap is something you'd like to see happen sooner, we'd love your help, whether you'd like to support the work, partner with us, or bring your church or ministry's content to Seed Bible.

See the ways you can get involved on our [partner page](https://www.helloao.org/partner.html).

Developers can also follow along and contribute right here on GitHub.
