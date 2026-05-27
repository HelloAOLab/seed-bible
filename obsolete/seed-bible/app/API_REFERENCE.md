# Seed Bible API Reference

## Overview

This document provides complete API documentation for Seed Bible's developer-facing hooks, functions, and types. All extensions should use these APIs rather than accessing internal state directly.

**See also:**

- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup and first extension
- [EXTENSION_DEVELOPMENT_GUIDE.md](EXTENSION_DEVELOPMENT_GUIDE.md) - Development patterns
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick lookup guide

## Table of Contents

1. [React Hooks](#react-hooks)
   - [useBibleContext](#usebiblecontext)
   - [useTabsContext](#usetabscontext)
   - [useSideBarContext](#usesidebarcontext)
   - [useMouseMove](#usemousemove)
   - [useBibleData](#usebibledata)
   - [useBibleDataManager](#usebibleDataManager)
2. [Global Functions](#global-functions)
3. [Type Definitions](#type-definitions)
4. [CasualOS Integration](#casualos-integration)
5. [Events and Shouts](#events-and-shouts)

---

## React Hooks

### useBibleContext

**Import:**

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";
```

**Description:**
Primary hook for Bible state management, navigation, toolbar, and user activity tracking.

**Returns:**

```typescript
{
  // Display Configuration
  screens: 1 | 2 | 3 | 4;
  panelMode: boolean;
  canvasMode: boolean;
  mapMode: boolean;
  setScreens: (count: 1 | 2 | 3 | 4) => void;
  setPanelMode: (enabled: boolean) => void;
  setCanvasMode: (enabled: boolean) => void;
  setMapMode: (enabled: boolean) => void;

  // Toolbar Management
  tools: Tool[];
  addTool: (tool: Tool) => void;
  removeTool: (id: string) => void;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  toggleToolActive: (id: string) => void;
  getToolById: (id: string) => Tool | undefined;

  // Navigation
  Open: (bookId: number, chapter: number, translation?: string) => void;
  OpenNextChapter: () => void;
  OpenPrevChapter: () => void;
  scrollToVerse: (verseId: string) => void;
  goToPassage: (reference: string) => void;

  // User Activity (Collaborative)
  userActivities: UserActivity[];
  updateCurrentBookChapter: (bookId: number, chapter: number, verse?: number) => void;
  getCurrentUserActivity: () => UserActivity | undefined;

  // Current State
  currentBookId: number;
  currentChapter: number;
  currentTranslation: string;
  currentVerseId: string | null;

  // Element References
  setElement: (id: string, element: HTMLElement | null) => void;
  getElement: (id: string) => HTMLElement | null;

  // Drag State
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}
```

#### Display Configuration

**screens**

- **Type:** `1 | 2 | 3 | 4`
- **Description:** Number of Bible text panels currently displayed
- **Usage:**

  ```tsx
  const { screens } = useBibleContext();

  // Adjust layout based on panel count
  const columns = screens <= 2 ? screens : 2;
  ```

**setScreens(count)**

- **Type:** `(count: 1 | 2 | 3 | 4) => void`
- **Description:** Change the number of displayed panels
- **Parameters:**
  - `count` - Number of panels to display (1-4)
- **Usage:**

  ```tsx
  const { setScreens } = useBibleContext();

  <button onClick={() => setScreens(2)}>Two Panels</button>;
  ```

**panelMode, canvasMode, mapMode**

- **Type:** `boolean`
- **Description:** Toggles for different visualization modes
- **Usage:**

  ```tsx
  const { panelMode, canvasMode, mapMode } = useBibleContext();

  if (canvasMode) {
    return <Canvas3DView />;
  }
  ```

**setPanelMode(enabled), setCanvasMode(enabled), setMapMode(enabled)**

- **Type:** `(enabled: boolean) => void`
- **Description:** Enable/disable visualization modes
- **Usage:**

  ```tsx
  const { setCanvasMode } = useBibleContext();

  <button onClick={() => setCanvasMode(true)}>Show Canvas</button>;
  ```

#### Toolbar Management

**tools**

- **Type:** `Tool[]`
- **Description:** Array of all registered toolbar tools
- **Usage:**

  ```tsx
  const { tools } = useBibleContext();

  const myTool = tools.find((t) => t.id === "myExtension");
  const activeTools = tools.filter((t) => t.active);
  ```

**addTool(tool)**

- **Type:** `(tool: Tool) => void`
- **Description:** Register a new tool in the toolbar
- **Parameters:**
  - `tool` - Tool configuration object
- **Usage:**

  ```tsx
  const { addTool } = useBibleContext();

  useEffect(() => {
    addTool({
      id: "myExtension",
      icon: "extension",
      label: "My Extension",
      component: MyExtensionComponent,
      active: true,
      placement: "panel",
      hasToggle: true,
      onToggle: (active) => console.log("Toggled:", active),
    });
  }, []);
  ```

**removeTool(id)**

- **Type:** `(id: string) => void`
- **Description:** Remove a tool from the toolbar
- **Parameters:**
  - `id` - Unique tool identifier
- **Usage:**

  ```tsx
  const { removeTool } = useBibleContext();

  useEffect(() => {
    return () => {
      removeTool("myExtension"); // Cleanup on unmount
    };
  }, []);
  ```

**updateTool(id, updates)**

- **Type:** `(id: string, updates: Partial<Tool>) => void`
- **Description:** Update properties of an existing tool
- **Parameters:**
  - `id` - Tool identifier
  - `updates` - Partial tool object with properties to update
- **Usage:**

  ```tsx
  const { updateTool } = useBibleContext();

  updateTool("myExtension", {
    active: false,
    label: "Updated Label",
  });
  ```

**toggleToolActive(id)**

- **Type:** `(id: string) => void`
- **Description:** Toggle the active state of a tool
- **Parameters:**
  - `id` - Tool identifier
- **Usage:**

  ```tsx
  const { toggleToolActive } = useBibleContext();

  <button onClick={() => toggleToolActive("myExtension")}>Toggle</button>;
  ```

**getToolById(id)**

- **Type:** `(id: string) => Tool | undefined`
- **Description:** Retrieve a specific tool by ID
- **Parameters:**
  - `id` - Tool identifier
- **Returns:** Tool object or undefined if not found
- **Usage:**

  ```tsx
  const { getToolById } = useBibleContext();

  const myTool = getToolById("myExtension");
  if (myTool?.active) {
    // Tool is active
  }
  ```

#### Navigation

**Open(bookId, chapter, translation)**

- **Type:** `(bookId: number, chapter: number, translation?: string) => void`
- **Description:** Navigate to a specific book and chapter
- **Parameters:**
  - `bookId` - Numeric book identifier (1-66)
  - `chapter` - Chapter number
  - `translation` - Optional translation code (defaults to current)
- **Usage:**

  ```tsx
  const { Open } = useBibleContext();

  // Open John 3 in ESV
  Open(43, 3, "ESV");

  // Open Genesis 1 (keep current translation)
  Open(1, 1);
  ```

**OpenNextChapter(), OpenPrevChapter()**

- **Type:** `() => void`
- **Description:** Navigate to next or previous chapter
- **Usage:**

  ```tsx
  const { OpenNextChapter, OpenPrevChapter } = useBibleContext();

  <button onClick={OpenNextChapter}>Next →</button>
  <button onClick={OpenPrevChapter}>← Previous</button>
  ```

**scrollToVerse(verseId)**

- **Type:** `(verseId: string) => void`
- **Description:** Scroll to a specific verse in the current chapter
- **Parameters:**
  - `verseId` - Verse identifier (format: "Book.Chapter.Verse", e.g., "John.3.16")
- **Usage:**

  ```tsx
  const { scrollToVerse } = useBibleContext();

  scrollToVerse("John.3.16");
  ```

**goToPassage(reference)**

- **Type:** `(reference: string) => void`
- **Description:** Navigate to a passage from a natural language reference
- **Parameters:**
  - `reference` - Human-readable reference (e.g., "John 3:16", "Genesis 1:1-3")
- **Usage:**

  ```tsx
  const { goToPassage } = useBibleContext();

  goToPassage("Romans 8:28");
  goToPassage("1 Corinthians 13:4-7");
  ```

#### User Activity (Collaborative)

**userActivities**

- **Type:** `UserActivity[]`
- **Description:** Array of all active users and their current locations
- **Usage:**

  ```tsx
  const { userActivities } = useBibleContext();

  return (
    <div>
      <h3>Active Users: {userActivities.length}</h3>
      {userActivities.map((activity) => (
        <div key={activity.userId}>
          {activity.userName}: {activity.bookName} {activity.chapter}
        </div>
      ))}
    </div>
  );
  ```

**updateCurrentBookChapter(bookId, chapter, verse)**

- **Type:** `(bookId: number, chapter: number, verse?: number) => void`
- **Description:** Update the current user's location for collaborative tracking
- **Parameters:**
  - `bookId` - Book identifier
  - `chapter` - Chapter number
  - `verse` - Optional verse number
- **Usage:**

  ```tsx
  const { updateCurrentBookChapter } = useBibleContext();

  // Update user location
  updateCurrentBookChapter(43, 3, 16); // John 3:16
  ```

**getCurrentUserActivity()**

- **Type:** `() => UserActivity | undefined`
- **Description:** Get the current user's activity record
- **Returns:** UserActivity object or undefined
- **Usage:**

  ```tsx
  const { getCurrentUserActivity } = useBibleContext();

  const myActivity = getCurrentUserActivity();
  console.log("I am at:", myActivity?.bookName, myActivity?.chapter);
  ```

#### Current State

**currentBookId, currentChapter, currentTranslation**

- **Type:** `number, number, string`
- **Description:** Current Bible location and translation
- **Usage:**

  ```tsx
  const { currentBookId, currentChapter, currentTranslation } =
    useBibleContext();

  console.log(
    `Reading book ${currentBookId}, chapter ${currentChapter} in ${currentTranslation}`
  );
  ```

**currentVerseId**

- **Type:** `string | null`
- **Description:** Currently focused verse (if any)
- **Usage:**

  ```tsx
  const { currentVerseId } = useBibleContext();

  if (currentVerseId) {
    highlightVerse(currentVerseId);
  }
  ```

#### Element References

**setElement(id, element)**

- **Type:** `(id: string, element: HTMLElement | null) => void`
- **Description:** Register a DOM element reference
- **Parameters:**
  - `id` - Unique identifier
  - `element` - DOM element or null to unregister
- **Usage:**

  ```tsx
  const { setElement } = useBibleContext();

  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      setElement("myExtensionPanel", ref.current);
    }
    return () => setElement("myExtensionPanel", null);
  }, []);

  return <div ref={ref}>My Panel</div>;
  ```

**getElement(id)**

- **Type:** `(id: string) => HTMLElement | null`
- **Description:** Retrieve a registered DOM element
- **Parameters:**
  - `id` - Element identifier
- **Returns:** DOM element or null
- **Usage:**

  ```tsx
  const { getElement } = useBibleContext();

  const panel = getElement("myExtensionPanel");
  if (panel) {
    panel.scrollIntoView();
  }
  ```

#### Drag State

**isDragging, setIsDragging(dragging)**

- **Type:** `boolean, (dragging: boolean) => void`
- **Description:** Global drag state for UI coordination
- **Usage:**

  ```tsx
  const { isDragging, setIsDragging } = useBibleContext();

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      Drag me
    </div>
  );
  ```

---

### useTabsContext

**Import:**

```tsx
import { useTabsContext } from "@packages/seed-bible/app/hooks/tabs";
```

**Description:**
Manage workspaces (Spaces), tabs, and folders for organizing Bible study sessions.

**Returns:**

```typescript
{
  // Spaces (Workspaces)
  spaces: Space[];
  activeSpace: Space | null;
  addSpace: (space: Space) => void;
  removeSpace: (id: string) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  setActiveSpace: (id: string) => void;

  // Tabs
  tabs: Tab[];
  activeTab: Tab | null;
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  duplicateTab: (id: string) => void;

  // Folders
  folders: Folder[];
  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  moveTabToFolder: (tabId: string, folderId: string) => void;
}
```

#### Spaces Management

**spaces**

- **Type:** `Space[]`
- **Description:** Array of all saved Spaces (workspace configurations)
- **Usage:**

  ```tsx
  const { spaces } = useTabsContext();

  return (
    <select>
      {spaces.map((space) => (
        <option key={space.id} value={space.id}>
          {space.name}
        </option>
      ))}
    </select>
  );
  ```

**activeSpace**

- **Type:** `Space | null`
- **Description:** Currently active Space
- **Usage:**

  ```tsx
  const { activeSpace } = useTabsContext();

  return <h2>Current Space: {activeSpace?.name}</h2>;
  ```

**addSpace(space)**

- **Type:** `(space: Space) => void`
- **Description:** Create a new Space
- **Parameters:**
  - `space` - Space configuration object
- **Usage:**

  ```tsx
  const { addSpace } = useTabsContext();

  const createReadingSpace = () => {
    addSpace({
      id: "reading-space",
      name: "Reading Mode",
      theme: "light",
      layout: {
        panels: 1,
        tools: ["bookmarks", "notes"],
      },
      extensions: ["commentary", "references"],
    });
  };
  ```

**setActiveSpace(id)**

- **Type:** `(id: string) => void`
- **Description:** Switch to a different Space
- **Parameters:**
  - `id` - Space identifier
- **Usage:**

  ```tsx
  const { setActiveSpace } = useTabsContext();

  <button onClick={() => setActiveSpace("study-space")}>
    Switch to Study Mode
  </button>;
  ```

#### Tabs Management

**tabs, activeTab**

- **Type:** `Tab[], Tab | null`
- **Description:** All tabs and currently active tab
- **Usage:**

  ```tsx
  const { tabs, activeTab } = useTabsContext();

  return (
    <div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={tab.id === activeTab?.id ? "active" : ""}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
  ```

**addTab(tab)**

- **Type:** `(tab: Tab) => void`
- **Description:** Create a new tab
- **Usage:**

  ```tsx
  const { addTab } = useTabsContext();

  const createCommentaryTab = () => {
    addTab({
      id: `tab-${Date.now()}`,
      title: "Commentary",
      type: "extension",
      content: "commentary",
      bookId: 43,
      chapter: 3,
    });
  };
  ```

**removeTab(id), updateTab(id, updates), setActiveTab(id)**

- **Type:** `(id: string) => void`, `(id: string, updates: Partial<Tab>) => void`, `(id: string) => void`
- **Description:** Remove, update, or activate a tab
- **Usage:**

  ```tsx
  const { removeTab, updateTab, setActiveTab } = useTabsContext();

  // Remove tab
  removeTab("tab-123");

  // Update tab title
  updateTab("tab-123", { title: "New Title" });

  // Activate tab
  setActiveTab("tab-123");
  ```

**duplicateTab(id)**

- **Type:** `(id: string) => void`
- **Description:** Create a copy of an existing tab
- **Usage:**

  ```tsx
  const { duplicateTab } = useTabsContext();

  <button onClick={() => duplicateTab("tab-123")}>Duplicate Tab</button>;
  ```

---

### useSideBarContext

**Import:**

```tsx
import { useSideBarContext } from "@packages/seed-bible/app/hooks/sideBar";
```

**Description:**
Manage sidebar state, popups, and theme configuration.

**Returns:**

```typescript
{
  // Sidebar State
  sidebarMode: 'open' | 'closed' | 'minimized';
  setSidebarMode: (mode: 'open' | 'closed' | 'minimized') => void;

  // Popup Management
  openPopupSettings: (config: PopupConfig) => void;
  closePopupSettings: () => void;
  currentPopup: PopupConfig | null;

  // Theme
  themeColors: ThemeColors;
  setThemeColors: (colors: Partial<ThemeColors>) => void;
  activeTheme: 'light' | 'dark' | 'auto';
  setActiveTheme: (theme: 'light' | 'dark' | 'auto') => void;
}
```

#### Sidebar State

**sidebarMode, setSidebarMode(mode)**

- **Type:** `'open' | 'closed' | 'minimized', (mode: ...) => void`
- **Description:** Control sidebar visibility
- **Usage:**

  ```tsx
  const { sidebarMode, setSidebarMode } = useSideBarContext();

  <button
    onClick={() =>
      setSidebarMode(sidebarMode === "open" ? "minimized" : "open")
    }
  >
    Toggle Sidebar
  </button>;
  ```

#### Popup Management

**openPopupSettings(config)**

- **Type:** `(config: PopupConfig) => void`
- **Description:** Open a popup/modal dialog
- **Parameters:**
  - `config` - Popup configuration
- **Usage:**

  ```tsx
  const { openPopupSettings } = useSideBarContext();

  const showSettings = () => {
    openPopupSettings({
      title: "Extension Settings",
      content: <MySettingsPanel />,
      width: 600,
      height: 400,
      modal: true,
      onClose: () => console.log("Closed"),
    });
  };
  ```

**closePopupSettings()**

- **Type:** `() => void`
- **Description:** Close the currently open popup
- **Usage:**

  ```tsx
  const { closePopupSettings } = useSideBarContext();

  <button onClick={closePopupSettings}>Close</button>;
  ```

#### Theme

**themeColors, setThemeColors(colors)**

- **Type:** `ThemeColors, (colors: Partial<ThemeColors>) => void`
- **Description:** Get/set theme color configuration
- **Usage:**

  ```tsx
  const { themeColors, setThemeColors } = useSideBarContext();

  // Update primary color
  setThemeColors({ primary: "#1976d2" });

  // Use in styles
  <div style={{ color: themeColors.primary }}>Themed text</div>;
  ```

**activeTheme, setActiveTheme(theme)**

- **Type:** `'light' | 'dark' | 'auto', (theme: ...) => void`
- **Description:** Get/set active theme mode
- **Usage:**

  ```tsx
  const { activeTheme, setActiveTheme } = useSideBarContext();

  <select value={activeTheme} onChange={(e) => setActiveTheme(e.target.value)}>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="auto">Auto</option>
  </select>;
  ```

---

### useMouseMove

**Import:**

```tsx
import { useMouseMove } from "@packages/seed-bible/app/hooks/mouseMove";
```

**Description:**
Track mouse position and manage floating windows.

**Returns:**

```typescript
{
  // Mouse Position
  mousePosition: { x: number; y: number };
  isMouseMoving: boolean;

  // Floating Windows
  floatingWindows: FloatingWindow[];
  addFloatingWindow: (window: FloatingWindow) => void;
  removeFloatingWindow: (id: string) => void;
  updateFloatingWindow: (id: string, updates: Partial<FloatingWindow>) => void;
  bringToFront: (id: string) => void;
}
```

#### Mouse Tracking

**mousePosition**

- **Type:** `{ x: number; y: number }`
- **Description:** Current mouse coordinates (screen-relative)
- **Usage:**

  ```tsx
  const { mousePosition } = useMouseMove();

  return (
    <div
      style={{
        position: "fixed",
        left: mousePosition.x + 10,
        top: mousePosition.y + 10,
      }}
    >
      Tooltip at mouse
    </div>
  );
  ```

**isMouseMoving**

- **Type:** `boolean`
- **Description:** True if mouse has moved recently (within last 100ms)
- **Usage:**

  ```tsx
  const { isMouseMoving } = useMouseMove();

  // Hide UI when mouse is still
  <div style={{ opacity: isMouseMoving ? 1 : 0 }}>Mouse-reactive UI</div>;
  ```

#### Floating Windows

**addFloatingWindow(window)**

- **Type:** `(window: FloatingWindow) => void`
- **Description:** Create a new floating window
- **Usage:**

  ```tsx
  const { addFloatingWindow } = useMouseMove();

  const openFloating = () => {
    addFloatingWindow({
      id: "my-window",
      title: "Floating Panel",
      content: <MyContent />,
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      resizable: true,
      draggable: true,
      closable: true,
      onClose: () => console.log("Window closed"),
    });
  };
  ```

**removeFloatingWindow(id)**

- **Type:** `(id: string) => void`
- **Description:** Close a floating window
- **Usage:**

  ```tsx
  const { removeFloatingWindow } = useMouseMove();

  <button onClick={() => removeFloatingWindow("my-window")}>
    Close Window
  </button>;
  ```

**bringToFront(id)**

- **Type:** `(id: string) => void`
- **Description:** Bring a window to the top of the z-order
- **Usage:**

  ```tsx
  const { bringToFront } = useMouseMove();

  <div onClick={() => bringToFront("my-window")}>Click to focus</div>;
  ```

---

### useBibleData

**Import:**

```tsx
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";
```

**Description:**
Access Scripture content for the current chapter.

**Returns:**

```typescript
{
  // Data
  data: BibleChapterData | null;
  footnotes: Footnote[];
  loading: boolean;
  error: Error | null;

  // Navigation
  open: (bookId: number, chapter: number, translation?: string) => void;
  openNextChapter: () => void;
  openPrevChapter: () => void;
  changeTranslation: (translation: string) => void;

  // Cache Control
  clearCache: () => void;
  preloadChapter: (bookId: number, chapter: number) => void;
}
```

#### Data Access

**data**

- **Type:** `BibleChapterData | null`
- **Description:** Current chapter content
- **Structure:**
  ```typescript
  {
    bookId: number;
    bookName: string;
    chapter: number;
    translation: string;
    verseCount: number;
    verseContent: Array<{
      verse: number;
      content: string;
      verseId: string; // Format: "Book.Chapter.Verse"
    }>;
  }
  ```
- **Usage:**

  ```tsx
  const { data, loading, error } = useBibleData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>
        {data.bookName} {data.chapter}
      </h1>
      {data.verseContent.map((verse) => (
        <p key={verse.verse}>
          <strong>{verse.verse}.</strong> {verse.content}
        </p>
      ))}
    </div>
  );
  ```

**footnotes**

- **Type:** `Footnote[]`
- **Description:** Footnotes for the current chapter
- **Usage:**

  ```tsx
  const { footnotes } = useBibleData();

  {
    footnotes.map((note) => (
      <div key={note.id}>
        <sup>{note.marker}</sup> {note.content}
      </div>
    ));
  }
  ```

#### Cache Control

**clearCache()**

- **Type:** `() => void`
- **Description:** Clear the Bible data cache
- **Usage:**

  ```tsx
  const { clearCache } = useBibleData();

  <button onClick={clearCache}>Refresh Data</button>;
  ```

**preloadChapter(bookId, chapter)**

- **Type:** `(bookId: number, chapter: number) => void`
- **Description:** Preload a chapter into cache for faster navigation
- **Usage:**

  ```tsx
  const { preloadChapter } = useBibleData();

  useEffect(() => {
    // Preload next chapter for smooth navigation
    preloadChapter(currentBookId, currentChapter + 1);
  }, [currentBookId, currentChapter]);
  ```

---

### useBibleDataManager

**Import:**

```tsx
import { useBibleDataManager } from "@packages/seed-bible/app/hooks/bibleDataManager";
```

**Description:**
Advanced Bible data utilities and transformations.

**Returns:**

```typescript
{
  // Parsing
  parseReference: (reference: string) => ParsedReference | null;
  formatReference: (bookId: number, chapter: number, verse?: number) => string;

  // Book Information
  getBookName: (bookId: number) => string;
  getBookId: (bookName: string) => number | null;
  getBookChapterCount: (bookId: number) => number;
  getChapterVerseCount: (bookId: number, chapter: number) => number;

  // Search
  searchVerses: (query: string, options?: SearchOptions) =>
    Promise<SearchResult[]>;
  findCrossReferences: (verseId: string) => Promise<Reference[]>;

  // Utilities
  getVerseText: (verseId: string) => Promise<string>;
  getPassageText: (reference: string) => Promise<string>;
}
```

#### Parsing

**parseReference(reference)**

- **Type:** `(reference: string) => ParsedReference | null`
- **Description:** Parse a human-readable Bible reference
- **Parameters:**
  - `reference` - Natural language reference (e.g., "John 3:16", "Genesis 1:1-3")
- **Returns:** Parsed structure or null if invalid
- **Usage:**

  ```tsx
  const { parseReference } = useBibleDataManager();

  const parsed = parseReference("John 3:16");
  // { bookId: 43, chapter: 3, verse: 16, endVerse: null }

  const range = parseReference("Romans 8:28-30");
  // { bookId: 45, chapter: 8, verse: 28, endVerse: 30 }
  ```

**formatReference(bookId, chapter, verse)**

- **Type:** `(bookId: number, chapter: number, verse?: number) => string`
- **Description:** Format a reference as human-readable string
- **Returns:** Formatted string (e.g., "John 3:16")
- **Usage:**

  ```tsx
  const { formatReference } = useBibleDataManager();

  const ref = formatReference(43, 3, 16); // "John 3:16"
  const chapterRef = formatReference(43, 3); // "John 3"
  ```

#### Book Information

**getBookName(bookId)**

- **Type:** `(bookId: number) => string`
- **Description:** Get book name from numeric ID
- **Usage:**

  ```tsx
  const { getBookName } = useBibleDataManager();

  const name = getBookName(43); // "John"
  ```

**getBookId(bookName)**

- **Type:** `(bookName: string) => number | null`
- **Description:** Get numeric ID from book name
- **Usage:**

  ```tsx
  const { getBookId } = useBibleDataManager();

  const id = getBookId("John"); // 43
  const id2 = getBookId("1 Corinthians"); // 46
  ```

**getBookChapterCount(bookId)**

- **Type:** `(bookId: number) => number`
- **Description:** Get number of chapters in a book
- **Usage:**

  ```tsx
  const { getBookChapterCount } = useBibleDataManager();

  const chapters = getBookChapterCount(43); // 21 (John has 21 chapters)
  ```

**getChapterVerseCount(bookId, chapter)**

- **Type:** `(bookId: number, chapter: number) => number`
- **Description:** Get number of verses in a chapter
- **Usage:**

  ```tsx
  const { getChapterVerseCount } = useBibleDataManager();

  const verses = getChapterVerseCount(43, 3); // 36 (John 3 has 36 verses)
  ```

#### Search

**searchVerses(query, options)**

- **Type:** `(query: string, options?: SearchOptions) => Promise<SearchResult[]>`
- **Description:** Search Bible content
- **Parameters:**
  - `query` - Search query
  - `options` - Search configuration (translation, scope, etc.)
- **Returns:** Promise resolving to search results
- **Usage:**

  ```tsx
  const { searchVerses } = useBibleDataManager();

  const results = await searchVerses("love", {
    translation: "ESV",
    books: [46, 47, 48], // 1 Cor, 2 Cor, Galatians
    limit: 50,
  });

  results.forEach((result) => {
    console.log(result.reference, result.text);
  });
  ```

**findCrossReferences(verseId)**

- **Type:** `(verseId: string) => Promise<Reference[]>`
- **Description:** Find cross-references for a verse
- **Returns:** Promise resolving to array of references
- **Usage:**

  ```tsx
  const { findCrossReferences } = useBibleDataManager();

  const refs = await findCrossReferences("John.3.16");
  refs.forEach((ref) => {
    console.log(ref.reference); // "Romans 5:8", etc.
  });
  ```

---

## Global Functions

Global functions are available on `globalThis` for use in non-React contexts.

### Navigation Functions

**Open(bookId, chapter, translation)**

- **Description:** Navigate to a passage (same as `useBibleContext().Open`)
- **Usage:**
  ```tsx
  (globalThis as any).Open(43, 3, "ESV");
  ```

**OpenNextChapter(), OpenPrevChapter()**

- **Description:** Navigate forward/backward
- **Usage:**
  ```tsx
  (globalThis as any).OpenNextChapter();
  ```

### Toolbar Functions

**AddTool(tool)**

- **Description:** Register a toolbar item
- **Usage:**
  ```tsx
  (globalThis as any).AddTool({
    id: "myTool",
    icon: "extension",
    label: "My Tool",
  });
  ```

**RemoveTool(id)**

- **Description:** Remove a toolbar item
- **Usage:**
  ```tsx
  (globalThis as any).RemoveTool("myTool");
  ```

### Application Functions

**AddApplication(id, component, placement, minWidth)**

- **Description:** Add an application component
- **Usage:**
  ```tsx
  (globalThis as any).AddApplication("myApp", MyComponent, "panel", 400);
  ```

**RemoveApplicationByID(id)**

- **Description:** Remove an application
- **Usage:**
  ```tsx
  (globalThis as any).RemoveApplicationByID("myApp");
  ```

### Display Functions

**SetScreens(count)**

- **Description:** Set number of visible panels
- **Usage:**
  ```tsx
  (globalThis as any).SetScreens(2);
  ```

---

## Type Definitions

### Tool

```typescript
interface Tool {
  id: string; // Unique identifier
  icon: string; // Material Icon name
  label: string; // Display label
  component?: React.ComponentType; // React component to render
  active: boolean; // Active state
  placement: "toolbar" | "panel" | "sidebar" | "floating";
  hasToggle?: boolean; // Supports toggle interaction
  onToggle?: (active: boolean) => void; // Toggle callback
  minWidth?: number; // Minimum width (pixels)
  metadata?: Record<string, any>; // Custom data
}
```

### Space

```typescript
interface Space {
  id: string;
  name: string;
  theme: "light" | "dark" | "auto";
  layout: {
    panels: 1 | 2 | 3 | 4;
    tools: string[]; // Tool IDs to display
  };
  extensions: string[]; // Extension IDs to load
  metadata?: Record<string, any>;
}
```

### Tab

```typescript
interface Tab {
  id: string;
  title: string;
  type: "bible" | "extension" | "custom";
  content: string | React.ComponentType;
  bookId?: number;
  chapter?: number;
  translation?: string;
  icon?: string;
  closable?: boolean;
  metadata?: Record<string, any>;
}
```

### UserActivity

```typescript
interface UserActivity {
  userId: string;
  userName: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verse?: number;
  timestamp: number; // Unix timestamp
  color?: string; // User's assigned color
  metadata?: Record<string, any>;
}
```

### BibleChapterData

```typescript
interface BibleChapterData {
  bookId: number;
  bookName: string;
  chapter: number;
  translation: string;
  verseCount: number;
  verseContent: Array<{
    verse: number;
    content: string;
    verseId: string; // Format: "Book.Chapter.Verse"
  }>;
}
```

### Footnote

```typescript
interface Footnote {
  id: string;
  verse: number;
  marker: string; // e.g., "a", "b", "1", "2"
  content: string;
  type: "translation" | "cross-reference" | "textual" | "other";
}
```

### SearchResult

```typescript
interface SearchResult {
  verseId: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string; // Formatted reference
  score?: number; // Relevance score
}
```

### FloatingWindow

```typescript
interface FloatingWindow {
  id: string;
  title: string;
  content: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  resizable: boolean;
  draggable: boolean;
  closable: boolean;
  onClose?: () => void;
  onResize?: (size: { width: number; height: number }) => void;
  onMove?: (position: { x: number; y: number }) => void;
  zIndex?: number;
  metadata?: Record<string, any>;
}
```

---

## CasualOS Integration

### React Hooks

Always use CasualOS-provided React hooks:

```tsx
const { useState, useEffect, useContext, useMemo, useCallback, useRef } =
  os.appHooks;

// ❌ Don't import from 'react'
// import { useState } from 'react';  // WRONG

// ✅ Use os.appHooks
const { useState } = os.appHooks; // CORRECT
```

### Bot Access

```tsx
// Get a bot by tag
const bot = getBot("#myBotTag");

// Check if bot exists
if (bot) {
  console.log("Bot tags:", bot.tags);
}

// Access bot tags
const value = bot.tags["myTag"];
```

### Data Storage

```tsx
// Store data
await os.setData("key", "value");
await os.setData("key", JSON.stringify(object));

// Retrieve data
const value = await os.getData("key");
const object = JSON.parse(await os.getData("key"));

// Delete data
await os.deleteData("key");

// Store with markers
await os.setData("key", "value", {
  markers: ["publicRead", "publicWrite"],
});
```

### Notifications

```tsx
// Show toast notification
os.toast("Hello world");
os.toast("Error occurred", "error");
os.toast("Success!", "success");
os.toast("Warning", "warning");
os.toast("Info message", "info");
```

---

## Events and Shouts

### Emitting Events

```tsx
// Emit a shout (event)
os.shout('eventName', { data: 'value' });

// Emit with namespace
os.shout('myExtension.actionPerformed', {
  timestamp: Date.now(),
  details: { ... }
});
```

### Listening for Events

```tsx
const { useEffect } = os.appHooks;

function MyExtension() {
  useEffect(() => {
    // Listen for events
    const unsubscribe = os.onShout("eventName", (event) => {
      console.log("Received:", event.arg);
    });

    // Cleanup: stop listening
    return () => unsubscribe();
  }, []);

  return <div>Listening for events...</div>;
}
```

### Common Events

| Event Name          | Description                   | Payload                                                |
| ------------------- | ----------------------------- | ------------------------------------------------------ |
| `onClick`           | 3D object clicked in Canvas   | `{ bot: Bot }`                                         |
| `verseSelected`     | Verse selected in text        | `{ verseId: string, bookId: number, chapter: number }` |
| `navigationChanged` | User navigated to new passage | `{ bookId: number, chapter: number }`                  |
| `toolAdded`         | Tool added to toolbar         | `{ tool: Tool }`                                       |
| `toolRemoved`       | Tool removed from toolbar     | `{ toolId: string }`                                   |
| `spaceChanged`      | Active Space changed          | `{ spaceId: string }`                                  |
| `userJoined`        | User joined session           | `{ userId: string, userName: string }`                 |
| `userLeft`          | User left session             | `{ userId: string }`                                   |

### Custom Events

Create your own namespaced events:

```tsx
// Extension A
os.shout("myExtension.customEvent", { value: 42 });

// Extension B
os.onShout("myExtension.customEvent", (event) => {
  console.log("Custom event:", event.arg.value);
});
```

---

## Summary

This API reference documents all public interfaces for Seed Bible extension development:

✅ **React Hooks** - Primary API for state management
✅ **Global Functions** - Non-React access to core functionality
✅ **Type Definitions** - TypeScript interfaces for type safety
✅ **CasualOS Integration** - Platform-level utilities
✅ **Events and Shouts** - Inter-extension communication

**For practical examples, see:**

- [GETTING_STARTED.md](GETTING_STARTED.md) - First extension tutorial
- [EXTENSION_DEVELOPMENT_GUIDE.md](EXTENSION_DEVELOPMENT_GUIDE.md) - Advanced patterns
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick lookup guide

**For platform documentation:**

- [CasualOS Documentation](https://docs.casualos.com) - Runtime platform details
