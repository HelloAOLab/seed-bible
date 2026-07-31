# Global Variables Registry - seed-bible Package

## Navigation & Data Storage

### `CHAPTER_DATA`

- **File**: `app/hooks/tabs.tsx`, `app/hooks/bibleData.tsx`
- **Type**: Object
- **Purpose**: Stores the current chapter's detailed data (verses, text, metadata)
- **Structure**: Contains bookId, chapter number, translation, and verse content

### `CurrentBookData`

- **File**: `app/hooks/tabs.tsx`, `app/hooks/bibleData.tsx`
- **Type**: Object
- **Purpose**: Stores metadata about the current book being viewed
- **Example**: `{ id: "GEN", numberOfChapters: 50, commonName: "Genesis" }`

### `CurrentActiveTabData`

- **File**: `app/hooks/tabs.tsx`
- **Type**: Object
- **Purpose**: Holds data for the currently active tab (can have multiple tabs open simultaneously)

---

## Tab Management Variables

### `ActiveTab`

- **File**: `app/hooks/tabs.tsx`
- **Type**: String/ID
- **Purpose**: Stores the ID of the currently active/focused tab
- **Cleanup**: Set to `null` on component unmount

### `PanelTabsMap`

- **File**: `app/hooks/tabs.tsx`
- **Type**: Object
- **Purpose**: Maps panel IDs to their open tabs; helps manage multiple panels
- **Example**: `{ "panel-1": ["tab-1", "tab-2"], "panel-2": ["tab-3"] }`

---

## UI State & Settings Variables

### `CanvasMode`

- **File**: `app/components/global_functions.tsx`
- **Type**: String or `null`
- **Purpose**: Tracks the current canvas interaction mode (drawing, erasing, etc.)
- **Example**: `"drawing"`, `"erasing"`, `null`

### `panelMode`

- **File**: `app/hooks/bibleVariables.tsx`
- **Type**: String
- **Purpose**: Tracks the current panel mode or layout configuration

### `IsMobileNow`

- **File**: `app/hooks/mouseMove.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating whether the device is currently in mobile view
- **Updated by**: Window resize listener

---

## Keyboard & Input Handling Variables

### `KEY_HOLD`

- **File**: `app/components/onKeyDown.tsx`, `app/components/onKeyUp.tsx`
- **Type**: Object (Map of key names to booleans)
- **Purpose**: Tracks which keys are currently being held down
- **Example**: `{ shift: true, control: false, alt: true }`
- **Cleanup**: Initialized in `shortcuts/shortcut/onKeyUp.tsx` and `onKeyDown.tsx`

### `SHORTCUT_KEYS`

- **File**: `shortcuts/shortcut/onKeyDown.tsx`, `shortcuts/shortcut/onKeyUp.tsx`
- **Type**: Object
- **Purpose**: Stores keyboard shortcut mappings and their current states

---

## Verse & Selection Variables

### `LAST_CLICKED_BOOK_CHAPTER`

- **File**: `packages/BookSelector/introduction/searchBar/SearchBar.tsx`, `app/components/onVerseClick.tsx`
- **Type**: Object
- **Purpose**: Stores data about the last clicked book/chapter for range selection (Shift+Click)
- **Example**: `{ type: "chapter", content: "Genesis 5", additionalInfo: {...} }`

### `isLastItemCombine`

- **File**: `app/components/onVerseClick.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating if the last added item should be combined with the previous one in playlist
- **Example**: `true` when multiple verses selected at once

---

## Playlist & Queue Variables

### `IS_PLAYLIST_ACTIVE`

- **File**: `packages/BookSelector/introduction/searchBar/SearchBar.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating if the playlist feature is currently active
- **Commented out**: In `app/hooks/bibleVariables.tsx` (may be legacy)

### `IsPlaylistPlaying`

- **File**: `packages/BookSelector/introduction/searchBar/SearchBar.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating if a playlist is currently playing

### `makingPlaylist`

- **File**: `packages/BookSelector/introduction/searchBar/SearchBar.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating if user is in playlist creation/editing mode

### `Playlist`

- **File**: `packages/BookSelector/introduction/searchBar/SearchBar.tsx`, `app/components/onVerseClick.tsx`
- **Type**: Object
- **Purpose**: Reference to the Playlist application/module
- **Methods**: `tryAddDataToHistory()`, `RemoveScreenRecordingControls()`
- **Check**: Always verify existence before using: `globalThis.Playlist && Playlist.tryAddDataToHistory(...)`

### `PLAYLIST_PANEL_ID`

- **File**: `app/hooks/bibleVariables.tsx` (commented)
- **Type**: String or `null`
- **Purpose**: Stores the panel ID of the playlist (for tracking/removal)

---

## ChatBot Integration Variables

### `chatbotPresent`

- **File**: `app/hooks/bibleVariables.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating if chatbot panel is currently visible

### `CHATBOT_PANEL_ID`

- **File**: `app/hooks/bibleVariables.tsx`
- **Type**: String or `null`
- **Purpose**: Stores the panel ID of the chatbot panel
- **Used with**: `RemoveApplicationByID()` for cleanup

### `TapozChatboxPresent`

- **File**: `app/hooks/bibleVariables.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating if Tapoz chatbox UI is currently visible

### `TAPOZ_CHATBOX_UI_ID`

- **File**: `app/hooks/bibleVariables.tsx`
- **Type**: String or `null`
- **Purpose**: Stores the UI ID of the Tapoz chatbox for management/removal

---

## Panel & Application Variables

### `PanelsApps`

- **File**: `app/hooks/divSpliter.tsx`
- **Type**: Array
- **Purpose**: Stores current active applications organized by panel

### `CurrentPanelAvailable`

- **File**: `app/hooks/divSpliter.tsx`, `app/packager/reInitPackage.tsx`
- **Type**: String/ID or `null`
- **Purpose**: Tracks which panel is currently available for app installation

### `makingApp`

- **File**: `app/packager/installPackage.tsx`, `app/packager/reInitPackage.tsx`
- **Type**: String (app label) or `null`
- **Purpose**: Tracks which app is currently being installed/re-initialized
- **Logic**: Set to app label during install, `null` when complete or cancelled

### `ContextMenuOptions`

- **File**: `app/packager/installPackage.tsx`, `app/packager/uninstallPackage.tsx`
- **Type**: Array of Objects
- **Purpose**: Stores context menu options for applications
- **Structure**: `{ address: "...", ...menuConfig }`

---

## Data Management & Remote Sync Variables

### `DataManager`

- **File**: `experience/dataManager/onEggHatch.tsx`, `experience/dataManager/onInstJoined.tsx`
- **Type**: Object (thisBot reference)
- **Purpose**: Reference to the DataManager bot for data operations and events

### `__remoteBookUpdate`

- **File**: `app/reciver/onRemoteData.tsx`
- **Type**: Boolean
- **Purpose**: Flag indicating a remote book/chapter update is in progress
- **Usage**: Prevents redundant updates when data syncs from remote clients

### `ORIGINAL_DATA`

- **File**: `experience/dataManager/endVoiceRecord.tsx`
- **Type**: Object/Array
- **Purpose**: Stores the original data before voice recording modifications

---

## Sound Management Variables

### `PLAY_TIMER`

- **File**: `experience/dataManager/playSound.tsx`
- **Type**: Number (timeout ID)
- **Purpose**: Timeout ID for scheduled sound playback

### `PLAYING_SOUND`

- **File**: `experience/dataManager/playSound.tsx`
- **Type**: Object
- **Purpose**: Tracks currently playing sound data

### `CURRENNT_SOUND_ID`

- **File**: `experience/dataManager/playSound.tsx`, `experience/dataManager/cancelCurrentPlayingSound.tsx`
- **Type**: String or `null`
- **Purpose**: ID of the sound currently being played
- **Note**: Contains typo "CURRENNT" instead of "CURRENT"
- **Cleanup**: Set to `null` when sound ends or is cancelled

---

## Notification Management Variables

### `TOAST_NOTIFICATION_TIMEOUT`

- **File**: `components/component/ShowNotification.tsx`
- **Type**: Number (timeout ID) or `null`
- **Purpose**: Stores the timeout ID for auto-dismissing notifications
- **Cleanup**: Cleared before setting new timeout

---

## Components & Rendering Variables

### `Components`

- **File**: `components/component/onInstJoined.tsx`, `components/component/onEggHatch.tsx`
- **Type**: Object (components collection)
- **Purpose**: Reference to all available components from the component bot
- **Usage**: `globalThis.Components.ComponentName`

### `ComponentsBot`

- **File**: `components/component/components.tsx`
- **Type**: Object (thisBot reference)
- **Purpose**: Reference to the components bot for direct access

### `ImageWrapper`

- **File**: `components/component/components.tsx`
- **Type**: Function/Component
- **Purpose**: Wrapper component for handling image rendering with special effects

---

## Cursor & Drag State Variables

### `isAbleToRightClick`

- **File**: `app/hooks/mouseMove.tsx`
- **Type**: Boolean or Function
- **Purpose**: Flag/function controlling whether right-click context menu is enabled

---

## API & Webhook Management Variables

### `ENCRYPT_SALT_KEY`

- **File**: `webhook/API/defineGlobal.tsx`
- **Type**: String
- **Value**: `"r7KD5gsKlV6j53jxw6Ul"`
- **Purpose**: Encryption salt key for API operations

### `API`

- **File**: `webhook/API/defineGlobal.tsx`
- **Type**: Object (thisBot reference)
- **Purpose**: Reference to the API bot for handling webhook operations

---

## Summary Statistics

- **Total Global Variables**: 35+
- **Categories**: 15
- **Flag Variables**: 10+
- **Data Objects**: 10+
- **References/Bots**: 8+
- **IDs/State Values**: 7+
