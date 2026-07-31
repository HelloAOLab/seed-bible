# Global Functions Registry - seed-bible Package

## Navigation & Chapter Management Functions

### `Open(bookId, chapterNo, translationId, chapterUrl?)`

- **File**: `app/components/thePage.tsx`, `app/main/main.tsx`
- **Type**: Function
- **Purpose**: Opens a specific Bible book/chapter/translation combination. Primary navigation function used throughout the app.
- **Parameters**:
  - `bookId` (string): Bible book identifier (e.g., "GEN", "EXO", "MAT")
  - `chapterNo` (number): Chapter number to open (1-based index)
  - `translationId` (string): Translation code (e.g., "AAB", "KJV", "NIV")
  - `chapterUrl?` (string, optional): Direct URL to chapter data if available
- **Example**: `globalThis.Open("GEN", 1, "AAB")`

### `OpenNextChapter()`

- **File**: `app/main/main.tsx`
- **Type**: Function (stub)
- **Purpose**: Navigates to the next chapter of the current book
- **Parameters**: None
- **Example**: `globalThis.OpenNextChapter()`

### `OpenPrevChapter()`

- **File**: `app/main/main.tsx`
- **Type**: Function (stub)
- **Purpose**: Navigates to the previous chapter of the current book
- **Parameters**: None
- **Example**: `globalThis.OpenPrevChapter()`

---

## Tab Management Functions

### `SetActiveTab(tabId)`

- **File**: `app/hooks/tabs.tsx`
- **Type**: Function
- **Purpose**: State setter function to change the active tab
- **Parameters**:
  - `tabId` (string): ID of the tab to activate
- **Cleanup**: Set to `null` on component unmount

### `RemoveTab(tabId)`

- **File**: `app/hooks/tabs.tsx`
- **Type**: Function
- **Purpose**: Removes a tab from the open tabs list
- **Parameters**:
  - `tabId` (string): ID of the tab to remove
- **Used by**: Chapter selection when user navigates in a tab

### `AddTab(newTabConfig)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Adds a new tab to the tab bar
- **Parameters**:
  - `newTabConfig` (object): Configuration object containing tab data (id, book, chapter, translation, etc.)

### `UpdateTab(tabId, newData)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Updates existing tab with new data
- **Parameters**:
  - `tabId` (string): ID of the tab to update
  - `newData` (object): Updated tab configuration/data

---

## UI Control Functions

### `openPopupSettings(props, wait, popupComponent)`

- **File**: `app/hooks/sideBar.tsx`, `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Opens the settings sidebar popup
- **Parameters**: -`props` (object): it can be a component or props -`wait` (boolean): -`popupComponent` (boolean): if the value is true then the props will acts as a component

### `closePopupSettings()`

- **File**: `app/hooks/sideBar.tsx`
- **Type**: Function
- **Purpose**: Closes the settings sidebar popup
- **Parameters**: None
- **Cleanup**: Set to `null` on component unmount

---

## Verse & Selection Management Functions

### `SetBlinker(blinkState)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: State setter for verse blinking/animation state during interaction
- **Parameters**:
  - `blinkState` (object): State object tracking which verses are currently blinking

### `SetSelected(selectedVerses)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: State setter for currently selected verses during study/annotation mode
- **Parameters**:
  - `selectedVerses` (object): Map/object of selected verses with their IDs and data

### `SetHolded(heldVerses)`

- **File**: `app/components/thePage.tsx`, `app/components/onVerseClick.tsx`
- **Type**: Function
- **Purpose**: Manages verses that are currently held/selected (multi-select)
- **Parameters**:
  - `heldVerses` (object): Map/object of held verses with their IDs and data
- **Cleanup**: Set to `null` on component unmount

---

## Panel & Application Management Functions

### `AddApplication(appConfig)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Adds a new floating/panel application to the canvas
- **Parameters**:
  - `appConfig` (object): Application configuration (id, position, size, component, props)

### `RemoveApplication(appId)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Removes an application by reference
- **Parameters**:
  - `appId` (string): ID or reference of the application to remove

### `RemoveApplicationByID(panelId)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Removes an application by its panel ID
- **Parameters**:
  - `panelId` (string): Panel ID of the application to remove
- **Example**: `globalThis.RemoveApplicationByID(globalThis.CHATBOT_PANEL_ID)`

### `ReplaceApplication(oldId, newAppConfig)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Replaces one application with another
- **Parameters**:
  - `oldId` (string): ID of the application to replace
  - `newAppConfig` (object): Configuration for the new application

### `UpdateApplication(appId, newConfig)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Updates an application's configuration
- **Parameters**:
  - `appId` (string): ID of the application to update
  - `newConfig` (object): New configuration properties for the application

### `SetApps(appsArray)`

- **File**: `app/hooks/divSpliter.tsx`
- **Type**: Function
- **Purpose**: State setter for updating the list of active applications/floating windows
- **Parameters**:
  - `appsArray` (array): Array of application objects to set as active

---

## Toolbar & Canvas Control Functions

### `SetToolbarBackground(color)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Changes the toolbar background color
- **Parameters**:
  - `color` (string): CSS color value (hex, rgb, or color name)

### `SetScreens(numberOfScreens)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Sets/updates the number of screen panels
- **Parameters**:
  - `numberOfScreens` (number): Number of screen panels to create (1, 2, 3, 4, etc.)

### `AddTool(toolConfig)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Adds a tool to the toolbar
- **Parameters**:
  - `toolConfig` (object): Tool configuration (id, icon, label, action, etc.)

### `RemoveTool(toolId)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Removes a tool from the toolbar
- **Parameters**:
  - `toolId` (string): ID of the tool to remove

### `UpdateTool(toolId, newConfig)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Updates a tool's configuration
- **Parameters**:
  - `toolId` (string): ID of the tool to update
  - `newConfig` (object): New configuration properties

### `ToggleToolActive(toolId)`

- **File**: `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Toggles a tool's active state
- **Parameters**:
  - `toolId` (string): ID of the tool to toggle

### `SetCanvasPositions(positionData)`

- **File**: `app/main/canvasController.tsx`
- **Type**: Function
- **Purpose**: Updates canvas element positions
- **Parameters**:
  - `positionData` (object): Object containing element positions (x, y coordinates for each element)

---

## Drag & Drop / Cursor Management Functions

### `SetElement(element, style?)`

- **File**: `app/hooks/mouseMove.tsx`, `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: Sets an element to display on mouse cursor (ghost element for drag preview)
- **Parameters**:
  - `element` (HTMLElement | React.Component): Element or component to display at cursor
  - `style?` (object, optional): CSS styles to apply to the element

### `SetIsDragging(isDragging)`

- **File**: `app/hooks/mouseMove.tsx`, `app/components/global_functions.tsx`
- **Type**: Function
- **Purpose**: State setter indicating whether a drag operation is active
- **Parameters**:
  - `isDragging` (boolean): True if currently dragging, false otherwise

---

## Modal & Notification Management Functions

### `ShowModal(content)`

- **File**: `app/hooks/mouseMove.tsx`
- **Type**: Function
- **Purpose**: Displays a modal with given content
- **Parameters**:
  - `content` (React.Component | JSX | string): Content to display in the modal
- **Example**: `globalThis.ShowModal(<MyComponent />)`

### `CloseModal()`

- **File**: `app/hooks/mouseMove.tsx`
- **Type**: Function
- **Purpose**: Closes the currently displayed modal
- **Parameters**: None

### `ShowNotification(message, options?)`

- **File**: `components/component/ShowNotification.tsx`
- **Type**: Function
- **Purpose**: Shows a toast notification to the user
- **Parameters**:
  - `message` (string): Notification message text
  - `options?` (object, optional): Configuration (duration, type, position, etc.)

---

## Floating Apps / Floating Windows Functions

### `AddFloatingApp(appConfig)`

- **File**: `app/hooks/mouseMove.tsx`
- **Type**: Function
- **Purpose**: Creates a floating/draggable application window
- **Parameters**:
  - `appConfig` (object): Configuration object with properties:
    - `id` (string): Unique identifier
    - `position` (object): {x, y} coordinates
    - `size` (object): {width, height} dimensions
    - `content` (React.Component): Component to render
    - `title?` (string): Window title

### `RemoveFloatingApp(appId)`

- **File**: `app/hooks/mouseMove.tsx`
- **Type**: Function
- **Purpose**: Removes a floating application window by ID
- **Parameters**:
  - `appId` (string): ID of the floating app to remove

---

## Bible Content & Highlighting Functions

### `ChangeTranslation(translationId)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Changes the current Bible translation for the displayed text
- **Parameters**:
  - `translationId` (string): Translation code to switch to (e.g., "AAB", "KJV", "NIV")

### `ToggleVerseHighlight(verseNumber, toggleState?)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Toggles highlighting on a specific verse
- **Parameters**:
  - `verseNumber` (number): Verse number to toggle
  - `toggleState?` (boolean, optional): Explicit toggle state (true/false)

### `HighlightVerse(verseNumber, colorValue?)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Highlights a specific verse with a color
- **Parameters**:
  - `verseNumber` (number): Verse number to highlight
  - `colorValue?` (string, optional): Hex color or CSS color value

### `UnHighlightVerse(verseNumber)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Removes highlighting from a specific verse
- **Parameters**:
  - `verseNumber` (number): Verse number to unhighlight

### `HighlightWords(wordHighlightsData)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Highlights specific words within verses
- **Parameters**:
  - `wordHighlightsData` (object): Map of word positions and their highlight colors

### `RemoveWordHighlight(wordData)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Removes highlighting from specific words
- **Parameters**:
  - `wordData` (object): Word position data to unhighlight

### `ClearAllWordHighlights()`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Clears all word highlighting from the current chapter
- **Parameters**: None

### `SetShowCommands(show)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Toggle display of command/context menu for verses
- **Parameters**:
  - `show` (boolean): Whether to show the commands menu

### `SetInHold(verseNumber)`

- **File**: `app/components/thePage.tsx`
- **Type**: Function
- **Purpose**: Sets a verse as being held/pressed (for multi-select operations)
- **Parameters**:
  - `verseNumber` (number): Verse number being held

---

## UI State & Preferences Functions

### `SetGlobalProfilePic(profilePicUrl)`

- **File**: `app/components/sideBar.tsx`
- **Type**: Function
- **Purpose**: Sets the global user profile picture
- **Parameters**:
  - `profilePicUrl` (string): URL to the profile image

### `SetOnlineUsers(onlineUsersData)`

- **File**: `app/components/sideBar.tsx`
- **Type**: Function
- **Purpose**: Updates the online users data for display in sidebar
- **Parameters**:
  - `onlineUsersData` (object | boolean): Online users information or presence flag

---
