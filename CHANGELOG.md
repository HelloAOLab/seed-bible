# Changelog

## TBD

### ✨ Added

### 🔧 Changed

### 🐛 Fixed

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
- Removed 1 pixel white border line from the top of the screen on mobile.

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
