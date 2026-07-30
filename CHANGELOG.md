# Changelog

## TBD

### ✨ Added

- The Seed Bible now opens with no internet connection. The reader and the files it needs to start are stored on your device the first time you visit, so a later visit offline still opens the app instead of the browser's "no connection" page. Extra languages and extensions are kept as you use them, so they are there offline too. On a connection that is present but not working, the app waits three seconds for the network before falling back to its stored copy rather than hanging.
- Download a whole translation to your device from the Bible selector and read it with no connection, with live progress, a cancel option, a size readout, and a prompt to re-download when a newer version is published. ([#1533](https://github.com/HelloAOLab/seed-bible/pull/1533))
- Show a loading placeholder in place of the verses while the chapter you moved to is still downloading, after briefly dimming the chapter you left, instead of leaving the previous chapter's text under the new chapter's title. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))

### 🔧 Changed

- Cancel the requests for chapters you skim past so the chapter you land on gets the bandwidth, instead of queueing behind downloads you no longer need. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Collapse a fast skim into a single browser history entry, so one Back press returns you to where the skim started instead of stepping back through every chapter you passed. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Resolve the reader's book and chapter labels from the book catalog instead of the loaded chapter, so the titles, the tab strip and the mobile navigation pill update the moment you move. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Work out the next and previous chapter from the book catalog instead of following links on the loaded chapter, which includes apocryphal books wherever a translation lists them. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))

### 🐛 Fixed

- Changing chapter or book no longer waits on an in-flight text request. The position updates the moment you press, and repeated presses advance a chapter each, instead of the chevrons and arrow keys switching off until the download finished. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix shared sessions freezing and eventually crashing the tab with an out-of-memory error when another participant moved through chapters quickly. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix an out-of-range chapter in the address, such as `?chapter=99999`, leaving the address pointing at a chapter you are not on, so pressing Back returned you to it and bounced straight forward again. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix a fractional chapter in the address, such as `?chapter=0.5&verse=3`, losing the highlight that points out the linked verse. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Fix picking the chapter you are already reading costing a browser history entry, so Back still returns you to where you came from instead of leaving you where you are. ([#1551](https://github.com/HelloAOLab/seed-bible/pull/1551))
- Hide the verse toolbar while a pane covers the reader (e.g. the Locations map) instead of letting it sit on top and hide most of the pane. The verse selection is kept, so the toolbar comes back unchanged when the pane is closed.
- Stop selecting or clearing a verse from closing an open fullscreen pane. Selecting a verse is mirrored into the `?verse` URL parameter, which was being read as a navigation.
- Reserve the mobile bottom bar's height on a fullscreen pane, so the bottom of the pane's own content is no longer hidden behind the bar.

### 🗑️ Removed

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
