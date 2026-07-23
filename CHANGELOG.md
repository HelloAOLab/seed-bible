# Changelog

## TBD

### ✨ Added

- Add a unified share sheet: copy a link, share via the device share sheet, or start and share a live session. Reachable from the verse toolbar, the tab options menu, the mobile session participants drawer, and the reader toolbar. ([#1499](https://github.com/HelloAOLab/seed-bible/pull/1499))

### 🔧 Changed

### 🐛 Fixed

- Include the chapter in shared verse links so they open to the right chapter instead of sometimes landing on the wrong one. ([#1499](https://github.com/HelloAOLab/seed-bible/pull/1499))

### 🗑️ Removed

## v1.2.0 — 2026-07-22

This release rebuilds the verse highlighting system on an SVG layer, smooths the first-run and onboarding experience, expands playlists, and fixes a wide range of chat, pane, context-menu, and mobile issues.

### ✨ Added

- Render highlights as a separate SVG layer behind the text, drawing contiguous same-color highlights as one continuous ribbon with rounded corners.
- Fade highlight ribbons in and out when they genuinely appear or are removed.
- Dim undecorated verses so decorated ones stand out.
- Add drag-and-drop reordering for playlist items and the queue.
- Add playlist icons, a save indicator, a large embed modal, full-height rows, and an unsaved-item warning.
- Add unread and typing indicators for chat in the mobile More menu.
- Add loading skeletons and a saving indicator for account settings.
- Add a shared skeleton placeholder for the Today resume card.
- Show the build version and commit hash in the Settings page footer.
- Add a "Move to folder" option to move an existing bookmark into a different category.

### 🔧 Changed

- Change verse selection to a dotted text-decoration underline instead of a dashed border to prevent layout shift.
- Tweak the dark theme's yellow highlight to be less gold and orange tinted.
- Defer the tutorial until the reader is visible and move the install prompt after it.
- Only show the audio reader in the toolbar when on desktop. Mobile has its own dedicated place for it on the navigation bar.
- Port the Twitch apps to the system floating window and refine the pane component header.
- Replace the Seed Bible icon with an SVG so it matches theme colors automatically.
- Bookmarking a chapter now opens the folder picker to choose or create a category, instead of saving straight to the default folder.

### 🐛 Fixed

- Gate the Today screen on reading-history status rather than the last-reading value.
- Rejoin the active shared session after a page refresh by persisting its ID in the URL, instead of silently dropping the user.
- Fix a double-click-to-open issue in the AI transcript.
- Fire pane `onClose` on every close path with a close reason.
- Can now scroll long list of tabs in the sidebar.
- Adjust sidebar settings padding and scrollbar styles for mobile.
- Make empty-pane and mobile-tab toolbar icons follow the active theme.
- Fixed login button not working after logging out until a refresh occured.
- Fix the Twitch WebSocket reconnecting in a loop after closing and exhausting the connection limit, and purge unused connections.
- Fix extensions being reinstalled after being uninstalled on another device.
- Make playlist content embeds fill the largest available size.
- Fixed numerous dark theme issues.
- Fix copying verses with line breaks (e.g. poetry) running words together without a space.
- Always copy the new shared session link to the clipboard with a confirmation toast, regardless of which menu started it, and show the link directly if the clipboard write fails.

### 🗑️ Removed

- Remove the redundant welcome onboarding modal.
- Twitch extension cleanup of dead code.
