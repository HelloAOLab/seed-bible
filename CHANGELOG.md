# Changelog

## TBD

### ✨ Added

### 🔧 Changed

- Scripture Map packs books in a masonry layout by height, keeping left-to-right book order while removing empty gaps under shorter books. ([#1392](https://github.com/HelloAOLab/seed-bible/issues/1392))
- Serve HTML and proxied assets gzip-compressed when the browser supports it, and stop the reader's initial font requests from blocking rendering by loading them without the render-blocking stylesheet, both PageSpeed wins. ([#1570](https://github.com/HelloAOLab/seed-bible/pull/1570))
- Use paths instead of query parameters for better SEO. ([#1547](https://github.com/HelloAOLab/seed-bible/pull/1547))

### 🐛 Fixed

- Fix starting a shared session dropping you back at Genesis 1 instead of opening at the chapter you were already reading, in your translation. ([#1601](https://github.com/HelloAOLab/seed-bible/pull/1601))
- Put a space between verses when verse numbers are turned off, so one verse no longer runs straight into the end of the previous one ("...had your fill.Do not work..." now reads "...had your fill. Do not work..."). ([#1538](https://github.com/HelloAOLab/seed-bible/pull/1538))
- Fix highlights from a previous account staying visible on already-visited chapters after signing out and into a different one, instead of updating to the signed-in account immediately. ([#1587](https://github.com/HelloAOLab/seed-bible/pull/1587))
- Fix a highlight added as your session was ending being saved to whichever account signed in next, overwriting that account's highlights for the chapter. ([#1587](https://github.com/HelloAOLab/seed-bible/pull/1587))

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
