# Changelog

## TBD

### ✨ Added

### 🔧 Changed

### 🐛 Fixed

### 🗑️ Removed

## v1.7.0 — 2026-08-31

### ✨ Added

- Add support for the `annotationRecordKey` query parameter, so a deployment can save all annotations to a specific record instead of each user's own, letting translations published from Codex be annotated and viewed there directly. ([#1662](https://github.com/HelloAOLab/seed-bible/pull/1662))
- Automatically prompt to download the current translation for offline reading, after the welcome screen on first load and again after dismissing the Today screen if you have no downloaded translations. ([#1663](https://github.com/HelloAOLab/seed-bible/pull/1663))
- Prompt to switch your UI language when you choose a translation written in a different language. ([#1677](https://github.com/HelloAOLab/seed-bible/pull/1677))
- Add the ability to edit a playlist's description from the playlist editor. ([#1679](https://github.com/HelloAOLab/seed-bible/pull/1679))
- Add a branding option to set which translation new readers start with. ([#1682](https://github.com/HelloAOLab/seed-bible/pull/1682))

### 🔧 Changed

- Applying or clearing a highlight now clears the verse selection and closes the verse toolbar automatically, instead of leaving the selection and toolbar open after every highlight action. ([#1725](https://github.com/HelloAOLab/seed-bible/pull/1725))
- Split the Extensions settings list into separate Installed and Available sections, each with its own empty-state message, instead of one flat list. ([#1667](https://github.com/HelloAOLab/seed-bible/pull/1667))
- Show a generic profile icon instead of a randomly generated avatar and color when you're signed out or have no profile picture and aren't in a shared session. ([#1672](https://github.com/HelloAOLab/seed-bible/pull/1672))
- Give the dark theme the same orange accent colors as the light theme for its primary and secondary colors, instead of a mismatched dark theme accent. ([#1690](https://github.com/HelloAOLab/seed-bible/pull/1690))
- Rename anonymous, signed-out readers from "Guest" to "Anonymous" throughout the app (Today's reader list, the sidebar avatar tooltip, and Scripture Map), including in locales where "Guest" had always shown in English regardless of the selected language. ([#1697](https://github.com/HelloAOLab/seed-bible/pull/1697))
- Stop naming anonymous readers in the Today greeting, showing "Good morning!" instead of "Good morning, Guest!". ([#1697](https://github.com/HelloAOLab/seed-bible/pull/1697))
- Show the branded app name in onboarding, settings, and the tutorial prompt, instead of only in a few places. ([#1701](https://github.com/HelloAOLab/seed-bible/pull/1701))
- Configure branding (app name, logo, icon, website, hidden toolbar tools, and default translation) with a `seed-bible.branding.json` file at build time, instead of injecting the config directly into the code. ([#1718](https://github.com/HelloAOLab/seed-bible/pull/1718))
- Give the mobile verse toolbar's Clear (highlight) button the app's error color instead of the default font color, and keep its hover feedback and icon consistent across screen sizes. ([#1724](https://github.com/HelloAOLab/seed-bible/pull/1724))

### 🐛 Fixed

- Fix the tabs, quick toolbar, below-reader toolbar, and mobile layout briefly showing unstyled before the page's full CSS finished loading, by keeping them hidden until it does.
- Fix the Bible Stack extension, which had stopped working after an earlier core-app refactor. ([#1635](https://github.com/HelloAOLab/seed-bible/pull/1635))
- Fix the Tabernacle extension (renamed House of the Lord), which had stopped working after an earlier core-app refactor. ([#1661](https://github.com/HelloAOLab/seed-bible/pull/1661))
- Fix the Settings close button being hidden on the mobile Account page, and make the "Settings" heading render the same plain style there as on every other settings page. ([#1675](https://github.com/HelloAOLab/seed-bible/pull/1675))
- Fix the Today screen crashing for some readers when their community reading-history entry hadn't finished loading yet. ([#1676](https://github.com/HelloAOLab/seed-bible/pull/1676))
- Fix the reading-history timeline's column widths stretching under wide month labels in some locales (notably Arabic and Bengali), which also affected Scripture Map. ([#1676](https://github.com/HelloAOLab/seed-bible/pull/1676))
- Tapping the Bible icon on mobile now opens the book selector when the Bible text is already shown, instead of doing nothing. ([#1678](https://github.com/HelloAOLab/seed-bible/pull/1678))
- Fix the mobile highlight color picker's layout shifting down when the "swipe to see more" hint disappears after you touch it. ([#1684](https://github.com/HelloAOLab/seed-bible/pull/1684))
- Fix the verse toolbar staying open when tapping empty space within the chapter (padding, gaps between verses, section headings), instead of only closing on taps entirely outside the chapter. ([#1723](https://github.com/HelloAOLab/seed-bible/pull/1723))
- Fix the Today screen appearing and then immediately closing when the app opens without a link to a specific chapter and restores your saved reading position or saved translation. ([#1726](https://github.com/HelloAOLab/seed-bible/pull/1726))

## v1.6.0 — 2026-08-24

### ✨ Added

- Analytics for common playlist actions like creating and finishing playlists. ([#1643](https://github.com/HelloAOLab/seed-bible/pull/1643))
- Write, edit and delete your notes with no internet connection. Notes used to go straight to the server, so with no connection saving failed and whatever you had typed was lost — and opening a chapter offline reported "You have no annotations" and kept saying so even after the connection came back. Now notes are kept on your device first and sent to the server when you are back online, with a count of what is still waiting. Notes written before you sign in are kept too, and become part of your account the first time you do.
- Ask which version to keep when a note changed in two places at once — edited on your phone while your laptop was offline, say. Previously whichever change was saved last silently replaced the other. Now the two versions are shown side by side with when each was written, and you choose: keep yours, keep the other one, or keep both (yours is saved as a second note, so nothing you wrote is thrown away). Nothing is overwritten until you decide.
- Add a bookmark to more than one category at once, create a new category while doing so, and remove a bookmark from a single category or from all of them in one step. ([#1612](https://github.com/HelloAOLab/seed-bible/pull/1612))
- Add support for two-way messaging between the app and embedded pattern portals, so a pattern can send messages to the app and receive replies back instead of only sending one way. ([#1644](https://github.com/HelloAOLab/seed-bible/pull/1644))
- Add support for multi-line chat messages. On desktop, Shift+Enter now inserts a line break while Enter still sends; on mobile, Enter inserts a line break and the send button submits. The compose box grows with your message, up to five lines, before it scrolls. ([#1639](https://github.com/HelloAOLab/seed-bible/pull/1639))

### 🔧 Changed

- Show Share in the chapter header instead of the reader toolbar, so it is always visible without opening a menu.
- Open the share sheet for the current tab from the tabs screen instead of immediately starting a shared session.
- Dragging the expanded mobile verse toolbar down now closes it directly, instead of needing to drag it closed halfway, release, and drag again. ([#1671](https://github.com/HelloAOLab/seed-bible/pull/1671))
- Turn on reading history and presence (seeing who else is viewing) by default instead of leaving them off. ([#1638](https://github.com/HelloAOLab/seed-bible/pull/1638))
- Tapping a verse reference in chat on mobile now closes the chat panel before jumping to that verse, instead of leaving the chat open over it. ([#1640](https://github.com/HelloAOLab/seed-bible/pull/1640))
- Reuse the Bible content the server already fetched to render the page instead of the client re-fetching those same translations, book catalogs, and chapters, for a faster initial load. ([#1617](https://github.com/HelloAOLab/seed-bible/pull/1617))
- Automatically open the login screen after a forced sign-out, such as an invalidated session, instead of leaving you signed out with no prompt to sign back in. ([#1641](https://github.com/HelloAOLab/seed-bible/pull/1641))

### 🗑️ Removed

- Fix a bookmark's first tap sometimes not registering on mobile, requiring a second tap. ([#1664](https://github.com/HelloAOLab/seed-bible/pull/1664))
- Fix tapping a toolbar button on Android sometimes only stopping the page's scroll instead of registering as a tap, requiring a second tap to activate it. ([#1642](https://github.com/HelloAOLab/seed-bible/pull/1642))
- Fix toast notifications appearing behind other UI elements. ([#1641](https://github.com/HelloAOLab/seed-bible/pull/1641))
- Fix guest reading presence not staying in sync with the guest's actual reading position. ([#1638](https://github.com/HelloAOLab/seed-bible/pull/1638))
- Fix a visible scrollbar in the mobile chat panel. ([#1639](https://github.com/HelloAOLab/seed-bible/pull/1639))
- Fix layout and mirroring issues for right-to-left languages such as Arabic across Settings, Tabs, the Tutorial, the Share modal, and session participants. ([#1615](https://github.com/HelloAOLab/seed-bible/pull/1615))
- Fix Safari/WebKit-specific behavior being detected incorrectly on the initial server-rendered page, since the check ran on the server where it could never correctly identify WebKit. ([#1617](https://github.com/HelloAOLab/seed-bible/pull/1617))

## v1.5.0 — 2026-08-17

### ✨ Added

- Add the ability to write notes on one or more verses. A noted verse gets a border around its verse number so you can spot it while reading, and tapping that number opens the note. A button in the chapter header shows how many notes the current chapter has and opens the Discover pane to browse them, grouped by verse with each note's author, avatar, and last-updated time. ([#1593](https://github.com/HelloAOLab/seed-bible/pull/1593))
- Verse references typed inside a note (like "see John 3:16") automatically turn into clickable links to that verse. ([#1593](https://github.com/HelloAOLab/seed-bible/pull/1593))
- On mobile, add, edit, and delete notes directly from the verse selection toolbar, with the verses the note covers shown alongside it as you write. ([#1593](https://github.com/HelloAOLab/seed-bible/pull/1593))
- Ask the AI in chat to build a Bible reading playlist; it opens the playlist editor pre-filled with a title, description, and items for you to review, instead of saving or playing the playlist on its own. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- Add an AI button to the playlist editor that opens a chat scoped to that playlist, where the AI can insert, reorder, update, or delete items and edit the title and description as you ask. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- The AI in chat can now jump you to a specific book, chapter, or verse, briefly highlighting the verse it took you to. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- The AI in chat can now search the Bible for verses matching what you ask, and use the results to answer or build a playlist. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- Add an icon with a count badge to the chat header showing which AI contexts are currently active and how many tools each one gives the AI. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- Show AI actions like searching, navigating, or editing a playlist as a visible entry in the chat timeline instead of happening silently. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- Add a branding option that lets a deployment hide specific tools from the reader toolbar. ([#1610](https://github.com/HelloAOLab/seed-bible/pull/1610))
- Reading Plans can now be deleted from both the plan list and the plan detail view, clearing that plan's progress. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))

### 🔧 Changed

- AI chat replies now stream in as they're generated instead of appearing all at once when complete. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- Only show the AI context icon and AI-assisted buttons when a connected AI provider actually supports tool calling, instead of always showing them. ([#1562](https://github.com/HelloAOLab/seed-bible/pull/1562))
- Verse references typed in chat (e.g. "John 3:16") are now matched against the book names of whichever translation is currently open, including localized names, falling back to English/USFM names when there's no match, instead of only recognizing English names regardless of translation. ([#1606](https://github.com/HelloAOLab/seed-bible/pull/1606))
- Reading Plan progress is now tracked per chapter instead of per whole reading, so finishing part of a multi-chapter reading credits just those chapters and shows partial progress. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Tapping a reading now opens it at the first unfinished chapter, and a whole day's readings can be played straight through with next/previous stepping between them. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Creating and editing a Reading Plan now uses one combined screen for its name, readings, and pace instead of a 3-step wizard, and that same screen is reused to edit an existing plan. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Rework the Today screen's Bookmarks section on mobile: bookmarks now scroll horizontally in their own row, and a "View More" button in the section header opens the full bookmarks list, appearing only when there are more bookmarks than fit on screen. ([#1502](https://github.com/HelloAOLab/seed-bible/pull/1502))
- Chapter page descriptions and social-share link previews now quote an excerpt of the actual chapter text instead of a generic templated sentence, and pages with no chapter loaded show a real descriptive sentence instead of just "Seed Bible"; also adds Twitter card tags and fixes the Open Graph locale/site-name tags to use the correct attribute. ([#1620](https://github.com/HelloAOLab/seed-bible/pull/1620))

### 🐛 Fixed

- Fix an issue where switching apps on a mobile device would always kick you out of a shared session upon returning. ([#1468](https://github.com/HelloAOLab/seed-bible/pull/1468))
- Fix removing a Reading Plan session before the selected one shifting the selection to the wrong session. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Fix a Reading Plan that fails to load leaving the user on a blank "Untitled plan" screen; it now shows an error on the list instead. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Fix opening an already-cached Reading Plan always re-fetching it; it now opens instantly with visible tap feedback. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Reading Plan reading-time estimates are now based on the actual verse count per book instead of a flat 3 minutes per chapter. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Fix a wording bug on the reading plan's "self-paced" cadence option, and align each reading's checkbox consistently on the left of its card. ([#1518](https://github.com/HelloAOLab/seed-bible/pull/1518))
- Fix a rendering issue with the mobile sidebar. ([#1502](https://github.com/HelloAOLab/seed-bible/pull/1502))
- Fix mobile swipe-to-change-chapter getting stuck off-center when the browser takes over the gesture mid-swipe, such as an edge-swipe-back conflict or a second finger touching down. ([#1605](https://github.com/HelloAOLab/seed-bible/pull/1605))
- Swipe navigation between chapters now goes through the same path as the chevron buttons, so the browser Back button behaves the same after a swipe as after tapping a chevron. ([#1605](https://github.com/HelloAOLab/seed-bible/pull/1605))
- Fix the Install App prompt and Settings entry never reappearing after uninstalling the PWA, since install status was saved permanently instead of tracked only for the current session. ([#1614](https://github.com/HelloAOLab/seed-bible/pull/1614))
- Fix the social preview image (used by Facebook, Twitter, etc. when sharing a link) pointing to a URL that didn't exist in production, showing a broken image instead of the Seed Bible logo. ([#1619](https://github.com/HelloAOLab/seed-bible/pull/1619))

## v1.4.0 — 2026-08-10

### ✨ Added

- Remember your open tabs, which one you were reading, and your pane layout across a refresh or a later visit, instead of reopening at Genesis 1 with a single tab. Opening a link to a specific passage still takes you there — it reuses a matching tab when you have one rather than piling up duplicates. A split layout is kept even if you open the app somewhere panes are turned off, so it comes back when they are on again.
- Add support for client-specific branding, so a white-labeled deployment can show its own app name, icon, and onboarding and tutorial text instead of Seed Bible's own. ([#1563](https://github.com/HelloAOLab/seed-bible/pull/1563))
- Add six more highlight colors (cyan, red, magenta, cream, gray, and tan) for twelve total, with a swipeable color picker and a hint indicating there are more to scroll to. ([#1597](https://github.com/HelloAOLab/seed-bible/pull/1597))

### 🔧 Changed

- Scripture Map packs books in a masonry layout by height, keeping left-to-right book order while removing empty gaps under shorter books. ([#1392](https://github.com/HelloAOLab/seed-bible/issues/1392))
- Serve HTML and proxied assets gzip-compressed when the browser supports it, and stop the reader's initial font requests from blocking rendering by loading them without the render-blocking stylesheet, both PageSpeed wins. ([#1570](https://github.com/HelloAOLab/seed-bible/pull/1570))
- Use paths instead of query parameters for better SEO. ([#1547](https://github.com/HelloAOLab/seed-bible/pull/1547))
- Scroll the current chapter to the center of the Bible Selector instead of to the top or bottom edge, so the surrounding chapters stay visible. ([#1598](https://github.com/HelloAOLab/seed-bible/pull/1598))
- Stop automatically opening the keyboard when opening chat on mobile; the input shows a blinking cursor hint and opens the keyboard only once tapped. ([#1596](https://github.com/HelloAOLab/seed-bible/pull/1596))
- Cut the initial JavaScript download roughly in half by deferring search, shared documents, and the avatar editor until they're used instead of bundling them upfront, and load extension names and descriptions for the active language only instead of all 77 languages at once. ([#1560](https://github.com/HelloAOLab/seed-bible/pull/1560), [#1561](https://github.com/HelloAOLab/seed-bible/pull/1561))
- Serve auth, image, and search requests from seedbible.org domains instead of ao.bot ones, so the app keeps working on networks that block ao.bot. ([#1569](https://github.com/HelloAOLab/seed-bible/pull/1569))

### 🐛 Fixed

- Fix starting a shared session dropping you back at Genesis 1 instead of opening at the chapter you were already reading, in your translation. ([#1601](https://github.com/HelloAOLab/seed-bible/pull/1601))
- Put a space between verses when verse numbers are turned off, so one verse no longer runs straight into the end of the previous one ("...had your fill.Do not work..." now reads "...had your fill. Do not work..."). ([#1538](https://github.com/HelloAOLab/seed-bible/pull/1538))
- Fix highlights from a previous account staying visible on already-visited chapters after signing out and into a different one, instead of updating to the signed-in account immediately. ([#1587](https://github.com/HelloAOLab/seed-bible/pull/1587))
- Fix a highlight added as your session was ending being saved to whichever account signed in next, overwriting that account's highlights for the chapter. ([#1587](https://github.com/HelloAOLab/seed-bible/pull/1587))
- Fix the chapter-audio play button not appearing anywhere on mobile, even when the extension is installed and the chapter has audio available. ([#1608](https://github.com/HelloAOLab/seed-bible/pull/1608))
- Fix highlighting during a shared session: it created a decoration that only imitated a highlight instead of a real one, so clearing often did nothing and other participants saw no color. A broadcast highlight now renders as an outline over your own highlight color, in each viewer's own theme. ([#1594](https://github.com/HelloAOLab/seed-bible/pull/1594))
- Fix a session participant who isn't permitted to broadcast being unable to highlight at all, and stop the sign-in prompt from interrupting a signed-out participant's broadcast highlight. ([#1594](https://github.com/HelloAOLab/seed-bible/pull/1594))
- Fix Twitch chat highlights using the same broken styling as shared-session highlights, and fall back to a transparent highlight instead of a solid black bar for a color id the app doesn't recognize. ([#1594](https://github.com/HelloAOLab/seed-bible/pull/1594))
- Fix the Today screen auto-opening over a direct link to a chapter or verse, since it was still checking for the old query-parameter links that path-based links (added in [#1547](https://github.com/HelloAOLab/seed-bible/pull/1547)) never use. ([#1603](https://github.com/HelloAOLab/seed-bible/pull/1603))
- Fix a fullscreen pane not closing when navigating to a new chapter, broken by the same outdated query-parameter check. ([#1603](https://github.com/HelloAOLab/seed-bible/pull/1603))
- Fix the last verse in a chapter being hidden behind the verse toolbar on mobile, so it can be fully read and interacted with. ([#1576](https://github.com/HelloAOLab/seed-bible/pull/1576))
- Fix the mobile toolbar inconsistently disappearing when a fullscreen pane, like the Locations map, is open. ([#1576](https://github.com/HelloAOLab/seed-bible/pull/1576))
- Fix the Terms of Service, Privacy Policy, and Code of Conduct modals rendering with an empty body instead of their policy text, caused by a broken import path. ([#1588](https://github.com/HelloAOLab/seed-bible/pull/1588))
- Fix `parseVerseReferences()` not recognizing references to 1 or 2 Corinthians. ([#1577](https://github.com/HelloAOLab/seed-bible/pull/1577))
- Fix switching your UI language also resetting your reading position to Genesis 1 when it auto-switches your Bible translation, instead of keeping your book, chapter, and verse. ([#1578](https://github.com/HelloAOLab/seed-bible/pull/1578))
- Fix the verse toolbar running off the screen in laptop-sized windows. ([#1597](https://github.com/HelloAOLab/seed-bible/pull/1597))
- Fix the cursor on the translation selector's X button showing a text-input cursor instead of a pointer. ([#1573](https://github.com/HelloAOLab/seed-bible/pull/1573))

### 🗑️ Removed

- Removed the Satoshi and DM Sans typefaces in favor of the system font, reducing the number of font files the reader has to download. ([#1570](https://github.com/HelloAOLab/seed-bible/pull/1570))

## v1.3.0 — 2026-07-31

### ✨ Added

- The Seed Bible now opens with no internet connection. The reader and the files it needs to start are stored on your device the first time you visit, so a later visit offline still opens the app instead of the browser's "no connection" page. Extra languages and extensions are kept as you use them, so they are there offline too. On a connection that is present but not working, the app waits three seconds for the network before falling back to its stored copy rather than hanging. ([#1534](https://github.com/HelloAOLab/seed-bible/pull/1534))
- Download a whole translation to your device from the Bible selector and read it with no connection, with live progress, a cancel option, a size readout, and a prompt to re-download when a newer version is published. ([#1533](https://github.com/HelloAOLab/seed-bible/pull/1533))
- Show a loading placeholder in place of the verses while the chapter you moved to is still downloading, after briefly dimming the chapter you left, instead of leaving the previous chapter's text under the new chapter's title. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- The Seed Bible now remembers the last translation you selected and loads it by default. ([#1445](https://github.com/HelloAOLab/seed-bible/pull/1511))
- The Seed Bible is now able to save your settings even if you are not logged in. ([#1471](https://github.com/HelloAOLab/seed-bible/pull/1471))
- Turn Bible references inside footnotes into clickable links that jump to that verse. ([#1517](https://github.com/HelloAOLab/seed-bible/pull/1517))
- Sign the user out automatically when their stored session is no longer valid. ([#1546](https://github.com/HelloAOLab/seed-bible/pull/1546))
- Add an XML sitemap for search engines. ([#1469](https://github.com/HelloAOLab/seed-bible/pull/1469))
- Add a close button to the floating chat panel header. ([#1529](https://github.com/HelloAOLab/seed-bible/pull/1529))
- Add dedicated theme colors for links and visited links. ([#1529](https://github.com/HelloAOLab/seed-bible/pull/1529))

### 🔧 Changed

- Cancel the requests for chapters you skim past so the chapter you land on gets the bandwidth, instead of queueing behind downloads you no longer need. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Collapse a fast skim into a single browser history entry, so one Back press returns you to where the skim started instead of stepping back through every chapter you passed. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Resolve the reader's book and chapter labels from the book catalog instead of the loaded chapter, so the titles, the tab strip and the mobile navigation pill update the moment you move. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Work out the next and previous chapter from the book catalog instead of following links on the loaded chapter, which includes apocryphal books wherever a translation lists them. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- When a chapter fails to load, the reader now shows a "Chapter unavailable" message with an offline icon and a **Reload** button that retries the load, instead of a raw red error message like "Failed to fetch". ([#1531](https://github.com/HelloAOLab/seed-bible/pull/1531))
- Improved how verse text is copied. ([#1532](https://github.com/HelloAOLab/seed-bible/pull/1532))
- Only save your translation choice when picked from the selector, not from other paths. ([#1511](https://github.com/HelloAOLab/seed-bible/pull/1511))

### 🐛 Fixed

- Fix the page jerking sideways when you swipe again right after changing chapter. ([#1565](https://github.com/HelloAOLab/seed-bible/pull/1565))
- Fix the reader jumping around after swiping to another chapter from partway down the page. ([#1565](https://github.com/HelloAOLab/seed-bible/pull/1565))
- Fix swiping between chapters on mobile briefly flashing the chapter you just left. ([#1565](https://github.com/HelloAOLab/seed-bible/pull/1565))
- Changing chapter or book no longer waits on an in-flight text request. The position updates the moment you press, and repeated presses advance a chapter each, instead of the chevrons and arrow keys switching off until the download finished. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix shared sessions freezing and eventually crashing the tab with an out-of-memory error when another participant moved through chapters quickly. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix an out-of-range chapter in the address, such as `?chapter=99999`, leaving the address pointing at a chapter you are not on, so pressing Back returned you to it and bounced straight forward again. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix a fractional chapter in the address, such as `?chapter=0.5&verse=3`, losing the highlight that points out the linked verse. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix picking the chapter you are already reading costing a browser history entry, so Back still returns you to where you came from instead of leaving you where you are. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Hide the verse toolbar while a pane covers the reader (e.g. the Locations map) instead of letting it sit on top and hide most of the pane. The verse selection is kept, so the toolbar comes back unchanged when the pane is closed. ([#1535](https://github.com/HelloAOLab/seed-bible/pull/1535))
- Stop selecting or clearing a verse from closing an open fullscreen pane. Selecting a verse is mirrored into the `?verse` URL parameter, which was being read as a navigation. ([#1535](https://github.com/HelloAOLab/seed-bible/pull/1535))
- Reserve the mobile bottom bar's height on a fullscreen pane, so the bottom of the pane's own content is no longer hidden behind the bar. ([#1535](https://github.com/HelloAOLab/seed-bible/pull/1535))
- Fix anonymous edits reverting when the URL carries a matching app parameter. ([#1471](https://github.com/HelloAOLab/seed-bible/pull/1471))
- Clear cached profile data on sign-out, and guard against corrupt or oversized local settings being adopted into an account. ([#1471](https://github.com/HelloAOLab/seed-bible/pull/1471))
- Fix the restored translation being overwritten by the tab's initial load or a later navigation, with a graceful fallback when the saved translation lacks the current book. ([#1511](https://github.com/HelloAOLab/seed-bible/pull/1511))
- Close the mobile More menu when tapping outside it, pressing Escape, or opening another overlapping panel. ([#1536](https://github.com/HelloAOLab/seed-bible/pull/1536))
- Fix the translation license notice being cut off at the bottom of the mobile reader. ([#1540](https://github.com/HelloAOLab/seed-bible/pull/1540))
- Recover from a corrupted stored session key instead of crashing. ([#1546](https://github.com/HelloAOLab/seed-bible/pull/1546))
- Fix chat links changing color once visited, and using the toolbar's orange instead of the theme's own link color. ([#1529](https://github.com/HelloAOLab/seed-bible/pull/1529))
- Fix the floating chat window not toggling from the toolbar button, overflowing the top of the screen on short viewports, and being too small to use comfortably. ([#1529](https://github.com/HelloAOLab/seed-bible/pull/1529))

## v1.2.1 — 2026-07-23

### ✨ Added

- Add a unified share sheet: copy a link, share via the device share sheet, or start and share a live session. Reachable from the verse toolbar, the tab options menu, the mobile session participants drawer, and the reader toolbar. ([#1499](https://github.com/HelloAOLab/seed-bible/pull/1499))

### 🔧 Changed

- Opening the Bible selector now expands to your current book, scrolls to it, and highlights your current chapter, instead of always opening fully collapsed. ([#1498](https://github.com/HelloAOLab/seed-bible/pull/1498))

### 🐛 Fixed

- Include the chapter in shared verse links so they open to the right chapter instead of sometimes landing on the wrong one. ([#1499](https://github.com/HelloAOLab/seed-bible/pull/1499))
- Fix the mobile settings sheet's header scrolling away with the rest of its content instead of staying pinned in place. ([#1499](https://github.com/HelloAOLab/seed-bible/pull/1499))
- Show the host in the session settings participant list, sorted first with a "Host" badge, instead of filtering them out. ([#1500](https://github.com/HelloAOLab/seed-bible/pull/1500))
- Removed 1 pixel border line from the top of the screen on mobile.
- Scope the Bible selector's testament column styles to its own book list instead of a bare selector that could collide with Scripture Map's styles.

## v1.2.0 — 2026-07-22

This release rebuilds the verse highlighting system on an SVG layer, smooths the first-run and onboarding experience, expands playlists, and fixes a wide range of chat, pane, context-menu, and mobile issues.

### ✨ Added

- Render highlights as a separate SVG layer behind the text, drawing contiguous same-color highlights as one continuous ribbon with rounded corners. ([#1409](https://github.com/HelloAOLab/seed-bible/pull/1409))
- Fade highlight ribbons in and out when they genuinely appear or are removed. ([#1409](https://github.com/HelloAOLab/seed-bible/pull/1409))
- Dim undecorated verses so decorated ones stand out. ([#1452](https://github.com/HelloAOLab/seed-bible/pull/1452))
- Add drag-and-drop reordering for playlist items and the queue. ([#1452](https://github.com/HelloAOLab/seed-bible/pull/1452))
- Add playlist icons, a save indicator, a large embed modal, full-height rows, and an unsaved-item warning. ([#1452](https://github.com/HelloAOLab/seed-bible/pull/1452))
- Add unread and typing indicators for chat in the mobile More menu. ([#1460](https://github.com/HelloAOLab/seed-bible/pull/1460))
- Add loading skeletons and a saving indicator for account settings. ([#1480](https://github.com/HelloAOLab/seed-bible/pull/1480))
- Add a shared skeleton placeholder for the Today resume card. ([#1492](https://github.com/HelloAOLab/seed-bible/pull/1492))
- Show the build version and commit hash in the Settings page footer. ([#1495](https://github.com/HelloAOLab/seed-bible/pull/1495))
- Add a "Move to folder" option to move an existing bookmark into a different category. ([#1484](https://github.com/HelloAOLab/seed-bible/pull/1484))

### 🔧 Changed

- Change verse selection to a dotted text-decoration underline instead of a dashed border to prevent layout shift. ([#1409](https://github.com/HelloAOLab/seed-bible/pull/1409))
- Tweak the dark theme's yellow highlight to be less gold and orange tinted. ([#1409](https://github.com/HelloAOLab/seed-bible/pull/1409))
- Defer the tutorial until the reader is visible and move the install prompt after it. ([#1494](https://github.com/HelloAOLab/seed-bible/pull/1494))
- Only show the audio reader in the toolbar when on desktop. Mobile has its own dedicated place for it on the navigation bar. ([#1493](https://github.com/HelloAOLab/seed-bible/pull/1493))
- Port the Twitch apps to the system floating window and refine the pane component header. ([#1451](https://github.com/HelloAOLab/seed-bible/pull/1451))
- Replace the Seed Bible icon with an SVG so it matches theme colors automatically. ([#1453](https://github.com/HelloAOLab/seed-bible/pull/1453))
- Bookmarking a chapter now opens the folder picker to choose or create a category, instead of saving straight to the default folder. ([#1484](https://github.com/HelloAOLab/seed-bible/pull/1484))

### 🐛 Fixed

- Gate the Today screen on reading-history status rather than the last-reading value. ([#1492](https://github.com/HelloAOLab/seed-bible/pull/1492))
- Rejoin the active shared session after a page refresh by persisting its ID in the URL, instead of silently dropping the user. ([#1472](https://github.com/HelloAOLab/seed-bible/pull/1472))
- Fix a double-click-to-open issue in the AI transcript.
- Fire pane `onClose` on every close path with a close reason. ([#1451](https://github.com/HelloAOLab/seed-bible/pull/1451))
- Can now scroll long list of tabs in the sidebar. ([#1459](https://github.com/HelloAOLab/seed-bible/pull/1459))
- Adjust sidebar settings padding and scrollbar styles for mobile. ([#1457](https://github.com/HelloAOLab/seed-bible/pull/1457))
- Make empty-pane and mobile-tab toolbar icons follow the active theme.
- Fixed login button not working after logging out until a refresh occured. ([#1470](https://github.com/HelloAOLab/seed-bible/pull/1470))
- Fix the Twitch WebSocket reconnecting in a loop after closing and exhausting the connection limit, and purge unused connections. ([#1451](https://github.com/HelloAOLab/seed-bible/pull/1451))
- Fix extensions being reinstalled after being uninstalled on another device. ([#1454](https://github.com/HelloAOLab/seed-bible/pull/1454))
- Make playlist content embeds fill the largest available size. ([#1452](https://github.com/HelloAOLab/seed-bible/pull/1452))
- Fixed numerous dark theme issues. ([#1483](https://github.com/HelloAOLab/seed-bible/pull/1483))
- Fix copying verses with line breaks (e.g. poetry) running words together without a space. ([#1496](https://github.com/HelloAOLab/seed-bible/pull/1496))
- Always copy the new shared session link to the clipboard with a confirmation toast, regardless of which menu started it, and show the link directly if the clipboard write fails. ([#1497](https://github.com/HelloAOLab/seed-bible/pull/1497))

### 🗑️ Removed

- Remove the redundant welcome onboarding modal. ([#1494](https://github.com/HelloAOLab/seed-bible/pull/1494))
- Twitch extension cleanup of dead code. ([#1451](https://github.com/HelloAOLab/seed-bible/pull/1451))
