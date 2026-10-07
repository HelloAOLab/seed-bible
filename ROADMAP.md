# Seed Bible Roadmap

Seed Bible is a Bible reading and study app made for reading together. You can read alongside friends, join live shared reading sessions, and see content from churches and ministries right beside the chapter you're reading.

This roadmap shows what we're working on and what comes next, in priority order. Each item explains what it is, why it matters, and where it stands today. Only the first item has to be finished before we bring Seed Bible to a wider audience. Everything after it will arrive as each piece is ready.

Want to help any of this happen sooner? [Here's how to get involved](#want-to-help).

_Last updated 2026-10-07_

## At a glance

✅ Done · 🚧 In progress · ⏳ Waiting on someone else · 💭 Planned, not started

| #   | Item                                                                            | Area                  | Status                  |
| --- | ------------------------------------------------------------------------------- | --------------------- | ----------------------- |
| 1   | [Content from churches and ministries](#1-content-from-churches-and-ministries) | Churches & ministries | 🚧 In progress          |
| 2   | [Reading with friends](#2-reading-with-friends)                                 | Community             | ✅ Done — more to come  |
| 3   | [A friends feed on the Today screen](#3-a-friends-feed-on-the-today-screen)     | Community             | 💭 Planned              |
| 4   | [Private by default](#4-private-by-default)                                     | Privacy               | 💭 Planned              |
| 5   | [A better customization editor](#5-a-better-customization-editor)               | Churches & ministries | 💭 Planned              |
| 6   | [Simpler bookmarks](#6-simpler-bookmarks)                                       | Reading               | 💭 Planned              |
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

### How the pieces fit together

Several items are steps along the same path:

- **Reading together (2 → 3 → 4 → 14).** Friends came first. Next, the Today screen shows what your friends are reading (3). As people share more, they need to choose _what_ they share (4). Circles (14) then let them share with some friends rather than all of them.
- **Privacy needs groundwork (13 → 4).** Making something truly private means changing how it's stored, not just hiding it on screen. Reading history is the hardest piece to change, so it has its own item (13).
- **Churches and ministries (1 → 5).** First, organizations need to be able to bring their own content (1). Then the tool they use to set up their own version of Seed Bible should get easier to use (5).
- **AI (12 → 16).** First, Bonfire catches up with Seed Bible's other AI chat and learns to take actions for you (12). Then Seed Bible connects with other AI tools people already use (16).

---

## 1. Content from churches and ministries

🚧 **In progress.** This is the one item we need before a wider launch.

Churches, ministries and partners want to put their own videos, articles and studies in front of their people, right beside the chapter being read. Readers, in turn, want to choose which sources they see.

Organizations do this through a **customization**: their own version of Seed Bible with their colors, logo, fonts and recommended features. Anyone who opens the organization's link reads in that version.

**Where it stands**

- While you read, a panel under the chapter shows related content: notes, playlists, reading plans, and videos from sources like the Bible Project.
- Organizations can already create a customization.
- Ministries that use Apologist can now have their own articles, videos and episodes appear for each chapter. They set it up once in their customization, and everyone using it sees that content. This is the first working example of an organization bringing its own content.

**What's next**

- A simple way for _any_ organization to add its content, not just Apologist users.
- A settings page where readers turn each source on or off, or hide outside content altogether. This is designed but not yet built.
- One home for this content. We're retiring an older full-screen view in favor of the panel under the chapter.
- Polish before launch: the "All" filter misses some content, the panel occasionally doesn't appear, its filters get cut off on wide screens, and there's no way yet to hide it entirely.

**Still deciding**

- What's the easiest way for an organization to supply content: a list in their customization, a link to a feed they already publish, or a small add-on? Add-ons work today, but building one asks a lot of someone who isn't a developer.
- If a reader turns off a source their organization turned on, whose choice wins? We lean toward the reader's.

_On GitHub:_ [#1719](https://github.com/HelloAOLab/seed-bible/issues/1719), [#1864](https://github.com/HelloAOLab/seed-bible/issues/1864), [#1915](https://github.com/HelloAOLab/seed-bible/issues/1915), [#1917](https://github.com/HelloAOLab/seed-bible/issues/1917), [#1908](https://github.com/HelloAOLab/seed-bible/issues/1908), [#1868](https://github.com/HelloAOLab/seed-bible/issues/1868), [#1830](https://github.com/HelloAOLab/seed-bible/issues/1830), [#1831](https://github.com/HelloAOLab/seed-bible/issues/1831)

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
- Add friends by email. This is built, and waiting on a change to CasualOS, the platform Seed Bible is built on.
- Notifications for new friend requests, and a way to invite friends straight into a reading session.
- See a friend's new note as soon as they write it, instead of the next time you open the app.
- Better previews when you share a friend link, showing who it's from.

_On GitHub:_ [#1939](https://github.com/HelloAOLab/seed-bible/pull/1939), [#1846](https://github.com/HelloAOLab/seed-bible/issues/1846), [#1964](https://github.com/HelloAOLab/seed-bible/issues/1964), [#1965](https://github.com/HelloAOLab/seed-bible/issues/1965)

---

## 3. A friends feed on the Today screen

💭 **Planned.** Builds on item 2.

The Today screen's community section becomes a feed of what your friends have been reading and writing. The design is finished.

- **Filters** for all activity, notes only, or reading only, over the last 48 hours, week, month, or all time.
- **Crossed paths.** When you and your friends read the same chapter, you see one line for all of you. It's a natural nudge to talk about it.
- **Each day's highlights.** For each person, only the chapters they spent the most time in. If someone spent half an hour in John 2–5 and a few minutes in Romans 3, you see "read John 2–5".
- **Friend requests** with Accept and Decline right on the Today screen, so nobody has to go looking for them.

_On GitHub:_ [#1848](https://github.com/HelloAOLab/seed-bible/issues/1848), [#1886](https://github.com/HelloAOLab/seed-bible/issues/1886)

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

**What's planned**

- A privacy choice when writing a note, set to private by default.
- Friends' content and the Today feed only ever show what each person is allowed to see.
- Moving existing notes over. One decision is still open: should existing notes become private (safer, but friends lose sight of notes they could see before) or keep reaching who they reach today? We lean toward private, with a one-time notice explaining the change.
- The same treatment for highlights, playlists, reading plans and reading history, each with a sensible default.

**Still deciding**

- Which kinds of content get a choice on each item (like notes and playlists), and which get one setting for your whole account (like reading history)?

---

## 5. A better customization editor

💭 **Planned.** Builds on item 1.

The tool organizations use to set up their own version of Seed Bible should be as polished as the rest of the app.

- **A redesigned editor** that looks and works like the rest of Seed Bible.
- **Separate default looks for light and dark mode.** Today an organization picks one default look, and devices in dark mode can end up with a different dark look than the one intended.
- **One-click branded links.** A partner sends someone a link, and Seed Bible opens in the partner's colors without anyone having to save anything. This is part of a wider effort to make it easy for organizations to set up their own Seed Bible.
- **A calmer dark theme**, without the orange accents.

_On GitHub:_ [#1903](https://github.com/HelloAOLab/seed-bible/issues/1903), [#1859](https://github.com/HelloAOLab/seed-bible/issues/1859), [#1251](https://github.com/HelloAOLab/seed-bible/issues/1251), [#1870](https://github.com/HelloAOLab/seed-bible/issues/1870)

---

## 6. Simpler bookmarks

💭 **Planned.**

A bookmark goes back to meaning what people expect: a marker for where you're up to, which you move along as you read. Collecting favorite passages is what Saves are for, and the old style of bookmarks has already moved there. The new design is finished.

- **A few named, colored bookmarks**, up to about five. For example, "Reading plan" in blue and "Sermon prep" in green. Each one marks a book and chapter.
- **Two taps** to move a bookmark to where you are now.
- **See at a glance** which of your bookmarks are on the chapter you're reading.
- **Visible where you need them**: in your open tabs, on the Today screen, and in a sidebar panel for renaming and recoloring.

_On GitHub:_ [#1658](https://github.com/HelloAOLab/seed-bible/issues/1658)

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

**Still deciding**

- Which prompts must stay on the first visit? Choosing a language is likely one, since everything else depends on being able to read it.

_On GitHub:_ [#1813](https://github.com/HelloAOLab/seed-bible/issues/1813), [#1942](https://github.com/HelloAOLab/seed-bible/issues/1942), [#1886](https://github.com/HelloAOLab/seed-bible/issues/1886)

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

_On GitHub:_ [#1482](https://github.com/HelloAOLab/seed-bible/issues/1482), [#1836](https://github.com/HelloAOLab/seed-bible/issues/1836), [#1943](https://github.com/HelloAOLab/seed-bible/issues/1943)

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
- **A home for new settings** from other items: choosing content sources (item 1), privacy defaults (item 4), and hiding the related-content panel.
- **Account settings opens your profile**, where you can edit it directly.

_On GitHub:_ [#1872](https://github.com/HelloAOLab/seed-bible/issues/1872), [#1579](https://github.com/HelloAOLab/seed-bible/issues/1579), [#1868](https://github.com/HelloAOLab/seed-bible/issues/1868), [#1799](https://github.com/HelloAOLab/seed-bible/issues/1799)

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
- **Let your own AI assistant work with your Seed Bible. 💭 Next.** Connect an assistant like Claude or ChatGPT to your account and ask it to "find my notes on grace", "add Romans 8 to my morning playlist", or "what did I read last week?".

**Still deciding**

- How does an outside assistant sign in, and what is it allowed to do on your behalf? This needs the same care as item 8, and must respect your privacy choices from item 4.

_On GitHub:_ [#1670](https://github.com/HelloAOLab/seed-bible/pull/1670)

---

## Want to help?

Seed Bible is built by [AO Lab](https://helloao.org/), a non-profit dedicated to making the Bible and related resources freely available to anyone who needs them. If any part of this roadmap is something you'd like to see happen sooner, we'd love your help, whether you'd like to support the work, partner with us, or bring your church or ministry's content to Seed Bible.

See the ways you can get involved on our [partner page](https://www.helloao.org/partner.html).

Developers can also follow along and contribute right here on GitHub.
