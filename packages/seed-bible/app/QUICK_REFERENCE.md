# Seed Bible Developer Quick Reference

## Essential Imports

```tsx
// Core Hooks
import { useBibleContext } from "./app/hooks/bibleVariables";
import { useTabsContext } from "./app/hooks/tabs";
import { useSideBarContext } from "./app/hooks/sideBar";
import { useMouseMove } from "./app/hooks/mouseMove";
import { useBibleData } from "./app/hooks/bibleData";
import { BibleDataManager } from "./app/hooks/bibleDataManager";

// Core Components
import { ThePage } from "./app/components/thePage";
import { Layout } from "./app/components/layout";
import { TextEditor } from "./app/components/editor";
import { SideBar } from "./app/components/sideBar";
import { Toolbar } from "./app/components/toolbar";
```

---

## Most Used Hooks

### useBibleContext()

Central state management for Bible app, toolbar, and multi-user tracking.

```tsx
const {
  // Display
  screens, // Number of split screens (1-4)
  panelMode, // Panel layout mode
  fullScreen, // Fullscreen state

  // Toolbar
  tools, // Main toolbar tools array
  addTool, // Add tool to toolbar
  removeTool, // Remove tool from toolbar
  updateTool, // Update tool properties
  toggleToolActive, // Toggle tool active state
  isToolActive, // Check if tool is active

  // User Activities
  userActivities, // All users' activity data
  updateCurrentBookChapter, // Update user's current location
  getUsersByBook, // Get users reading specific book/chapter

  // Navigation
  scrollToVerse, // Scroll to verse number
} = useBibleContext();
```

### useTabsContext()

Manage tabs, spaces (workspaces), and folders.

```tsx
const {
  spaces, // All workspaces
  activeSpace, // Current space ID
  tabs, // Tabs in current space
  activeTab, // Current active tab

  addTab, // Add new tab
  removeTab, // Remove tab
  updateTab, // Update tab data

  addSpace, // Add workspace
  removeSpace, // Remove workspace

  addFolder, // Add folder
  addTabToFolder, // Add tab to folder
  moveTab, // Move tab between folders
} = useTabsContext();
```

### useBibleData()

Fetch and cache Bible chapter content.

```tsx
const {
  data, // Chapter content with verses
  footnotes, // Chapter footnotes
  loading, // Loading state
  error, // Error message

  open, // Open chapter
  openNextChapter, // Next chapter
  openPrevChapter, // Previous chapter
  changeTranslation, // Change translation
} = useBibleData();
```

---

## Most Used Global Functions

### Navigation

```tsx
globalThis.Open("GEN", 1, "NASB95"); // Open Genesis 1 (NASB95)
globalThis.OpenNextChapter(); // Next chapter
globalThis.OpenPrevChapter(); // Previous chapter
```

### Toolbar Management

```tsx
// Add tool
globalThis.AddTool({
  icon: "bookmark",
  label: "My Tool",
  onClick: () => console.log("Clicked!"),
});

// Toggle tool
globalThis.ToggleToolActive("My Tool");

// Check if active
globalThis.IsToolActive("My Tool"); // Returns boolean

// Remove tool
globalThis.RemoveTool("My Tool");
```

### Tab Management

```tsx
// Add tab
globalThis.AddTab({
  id: "tab-1",
  label: "Genesis 1",
  type: "bible",
  bookId: "GEN",
  chapter: 1,
});

// Update tab
globalThis.UpdateTab("tab-1", { chapter: 2 });

// Remove tab
globalThis.RemoveTab("tab-1");
```

### Floating Windows

```tsx
// Add floating app
globalThis.AddApplication({
  id: "my-app",
  App: <MyComponent />,
  to: "floating",
  title: "My App",
  minWidth: "400px",
});

// Remove app
globalThis.RemoveApplicationByID("my-app");
```

### UI State

```tsx
globalThis.SetScreens(2); // Split into 2 screens
globalThis.SetToolbarBackground("#1e1e1e"); // Set toolbar color
globalThis.CanvasMode = true; // Enable canvas mode
```

---

## Common Patterns

### 1. Add a Toolbar Button

```tsx
function MyExtension() {
  const { addTool } = useBibleContext();

  useEffect(() => {
    addTool({
      icon: "star",
      label: "Favorite",
      onClick: () => alert("Favorited!"),
      showInPageToolbar: true,
    });
  }, [addTool]);

  return null;
}
```

### 2. Create a New Tab

```tsx
function createBibleTab(bookId, chapter) {
  const { addTab } = useTabsContext();

  addTab({
    id: `tab-${Date.now()}`,
    label: `${bookId} ${chapter}`,
    type: "bible",
    bookId: bookId,
    chapter: chapter,
    translation: "NASB95",
  });
}
```

### 3. Track User Activity

```tsx
function trackUserReading(userId, book, bookId, chapter) {
  const { updateCurrentBookChapter } = useBibleContext();

  updateCurrentBookChapter(userId, book, bookId, chapter, "NASB95");
}
```

### 4. Open Context Menu

```tsx
function showContextMenu(event) {
  const { openPopupSettings, closePopupSettings } = useSideBarContext();

  event.preventDefault();

  openPopupSettings({
    x: event.clientX,
    y: event.clientY,
    content: (
      <div>
        <button
          onClick={() => {
            console.log("Action!");
            closePopupSettings();
          }}
        >
          Do Something
        </button>
      </div>
    ),
  });
}
```

### 5. Create Floating Window

```tsx
function openNoteWindow() {
  const { AddFloatingApp } = useMouseMove();

  AddFloatingApp({
    id: `note-${Date.now()}`,
    App: <TextEditor placeholder="Take notes..." />,
    to: "floating",
    title: "Notes",
    minWidth: "400px",
    minHeight: "300px",
  });
}
```

### 6. Load Bible Chapter

```tsx
function loadChapter(bookId, chapter, translation) {
  const { open } = useBibleData();

  open(bookId, chapter, translation);
}
```

### 7. Get Users Reading Same Chapter

```tsx
function getUsersInChapter(book, chapter) {
  const { getUsersByBook } = useBibleContext();

  return getUsersByBook(book, chapter);
}
```

---

## Tool Object Structure

```tsx
interface Tool {
  icon: string; // 'bookmark', 'star', etc.
  label: string; // Unique identifier
  hasToggle?: boolean; // Has on/off states
  active?: boolean; // Current state
  onClick?: () => void; // Click handler
  onHold?: () => Promise<void>; // Long press handler
  onRightClick?: () => void; // Right-click handler
  showInPageToolbar?: boolean; // Show in main toolbar
  showInStarterToolbar?: boolean; // Show in starter toolbar
  color?: string; // Icon color
  backgroundColor?: string; // Background color
}
```

**Example:**

```tsx
const tool = {
  icon: "bookmark",
  label: "Bookmarks",
  hasToggle: true,
  active: false,
  onClick: () => console.log("Click"),
  onHold: async () => console.log("Long press"),
  showInPageToolbar: true,
};
```

---

## Tab Object Structure

```tsx
interface Tab {
  id: string; // Unique ID
  label: string; // Display name
  type: string; // 'bible', 'canvas', 'editor', etc.
  icon?: string; // Icon name
  bookId?: string; // Bible book ID (for bible tabs)
  chapter?: number; // Chapter number (for bible tabs)
  translation?: string; // Translation (for bible tabs)
  content?: any; // Tab-specific content
  pinned?: boolean; // Whether pinned
}
```

**Example Bible Tab:**

```tsx
const tab = {
  id: "tab-gen1",
  label: "Genesis 1",
  type: "bible",
  bookId: "GEN",
  chapter: 1,
  translation: "NASB95",
};
```

**Example Canvas Tab:**

```tsx
const tab = {
  id: "canvas-1",
  label: "My Drawing",
  type: "canvas",
  icon: "draw",
  content: canvasData,
};
```

---

## Floating App Config

```tsx
interface FloatingAppConfig {
  id: string; // Unique ID
  App: JSX.Element; // Your component
  to: "panel" | "floating"; // Display mode
  minWidth?: string; // '400px'
  minHeight?: string; // '300px'
  title?: string; // Window title
  icon?: string; // Window icon
  closable?: boolean; // Can close
  resizable?: boolean; // Can resize
  draggable?: boolean; // Can drag
}
```

**Example:**

```tsx
const config = {
  id: "notes-app",
  App: <NotesComponent />,
  to: "floating",
  minWidth: "400px",
  minHeight: "300px",
  title: "Notes",
  icon: "note",
  closable: true,
  resizable: true,
  draggable: true,
};
```

---

## User Activity Object

```tsx
interface UserActivity {
  userId: string;
  userName: string;
  userAvatar?: string;

  currentBook: string; // 'Genesis'
  currentBookId: string; // 'GEN'
  currentChapter: number; // 1
  currentTranslation: string; // 'NASB95'

  lastVerseClicked: number; // Last verse number clicked
  highlightedVerses: number[]; // Array of highlighted verses

  sessionInfo: {
    isHost: boolean;
    isFollower: boolean;
    followingUserId?: string;
  };

  lastActivity: number; // Timestamp
  sessionStartTime: number; // Timestamp
}
```

---

## Essential Code Snippets

### Complete Tool Registration

```tsx
import { useBibleContext } from "./hooks/bibleVariables";

function MyPackage() {
  const { addTool, toggleToolActive, isToolActive } = useBibleContext();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    addTool(
      {
        icon: "extension",
        label: "My Package",
        hasToggle: true,
        active: false,
        onClick: () => {
          toggleToolActive("My Package");
          setIsActive(isToolActive("My Package"));
        },
        onHold: async () => {
          console.log("Show settings");
        },
        onRightClick: () => {
          console.log("Show context menu");
        },
        showInPageToolbar: true,
        showInStarterToolbar: true,
      },
      { to: "tools" }
    );
  }, [addTool]);

  return isActive ? <MyPackageUI /> : null;
}
```

### Complete Tab Management

```tsx
import { useTabsContext } from "./hooks/tabs";

function TabManager() {
  const {
    tabs,
    activeTab,
    addTab,
    updateTab,
    removeTab,
    addFolder,
    addTabToFolder,
  } = useTabsContext();

  const createStudySpace = () => {
    // Create folder
    const folderId = `folder-${Date.now()}`;
    addFolder("Old Testament");

    // Add tabs to folder
    ["GEN", "EXO", "LEV"].forEach((bookId, index) => {
      const tabId = `tab-${bookId}`;
      addTab({
        id: tabId,
        label: `${bookId} 1`,
        type: "bible",
        bookId: bookId,
        chapter: 1,
        translation: "NASB95",
      });

      addTabToFolder(folderId, { id: tabId });
    });
  };

  return (
    <div>
      <button onClick={createStudySpace}>Create Study Space</button>
      <div>
        {tabs.map((tab) => (
          <div key={tab.id}>
            <span>{tab.label}</span>
            <button onClick={() => removeTab(tab.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Complete Multi-User Tracking

```tsx
import { useBibleContext } from "./hooks/bibleVariables";

function CollaborativeReader() {
  const {
    userActivities,
    updateCurrentBookChapter,
    updateLastVerseClicked,
    updateHighlightedVerses,
    getUsersByBook,
  } = useBibleContext();

  const userId = "current-user";
  const [currentBook, setCurrentBook] = useState("Genesis");
  const [currentChapter, setCurrentChapter] = useState(1);

  // Navigate to chapter
  const navigateToChapter = (book, bookId, chapter) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);

    updateCurrentBookChapter(userId, book, bookId, chapter, "NASB95");
  };

  // Handle verse click
  const handleVerseClick = (verseNumber) => {
    updateLastVerseClicked(userId, verseNumber);
  };

  // Get other users in same chapter
  const otherUsers = getUsersByBook(currentBook, currentChapter).filter(
    (u) => u.userId !== userId
  );

  return (
    <div>
      <h2>
        {currentBook} {currentChapter}
      </h2>

      <div className="other-users">
        <h4>Also reading:</h4>
        {otherUsers.map((user) => (
          <div key={user.userId}>
            {user.userName} - Verse {user.lastVerseClicked}
          </div>
        ))}
      </div>

      <div
        className="verses"
        onClick={(e) => {
          const verseNum = parseInt(e.target.dataset.verse);
          if (verseNum) handleVerseClick(verseNum);
        }}
      >
        {/* Render verses here */}
      </div>
    </div>
  );
}
```

### Complete Floating App

```tsx
import { useMouseMove } from "./hooks/mouseMove";
import { TextEditor } from "./components/editor";

function NotesFeature() {
  const { AddFloatingApp } = useMouseMove();
  const [notes, setNotes] = useState({});

  const openNoteForVerse = (verseId) => {
    AddFloatingApp({
      id: `note-${verseId}`,
      App: (
        <div style={{ padding: "1rem", height: "100%" }}>
          <h3>Note for Verse {verseId}</h3>
          <TextEditor
            content={notes[verseId] || ""}
            onChange={(content) => {
              setNotes((prev) => ({ ...prev, [verseId]: content }));
            }}
            placeholder="Write your note here..."
          />
        </div>
      ),
      to: "floating",
      minWidth: "400px",
      minHeight: "300px",
      title: `Note - Verse ${verseId}`,
      icon: "note_add",
      closable: true,
      resizable: true,
      draggable: true,
    });
  };

  return <button onClick={() => openNoteForVerse(1)}>Add Note</button>;
}
```

---

## Common Book IDs

```
GEN - Genesis        EXO - Exodus         LEV - Leviticus
NUM - Numbers        DEU - Deuteronomy    JOS - Joshua
JDG - Judges         RUT - Ruth           1SA - 1 Samuel
2SA - 2 Samuel       1KI - 1 Kings        2KI - 2 Kings
1CH - 1 Chronicles   2CH - 2 Chronicles   EZR - Ezra
NEH - Nehemiah       EST - Esther         JOB - Job
PSA - Psalms         PRO - Proverbs       ECC - Ecclesiastes
SNG - Song of Songs  ISA - Isaiah         JER - Jeremiah
LAM - Lamentations   EZK - Ezekiel        DAN - Daniel
HOS - Hosea          JOL - Joel           AMO - Amos
OBA - Obadiah        JON - Jonah          MIC - Micah
NAM - Nahum          HAB - Habakkuk       ZEP - Zephaniah
HAG - Haggai         ZEC - Zechariah      MAL - Malachi

MAT - Matthew        MRK - Mark           LUK - Luke
JHN - John           ACT - Acts           ROM - Romans
1CO - 1 Corinthians  2CO - 2 Corinthians  GAL - Galatians
EPH - Ephesians      PHP - Philippians    COL - Colossians
1TH - 1 Thessalonians 2TH - 2 Thessalonians 1TI - 1 Timothy
2TI - 2 Timothy      TIT - Titus          PHM - Philemon
HEB - Hebrews        JAS - James          1PE - 1 Peter
2PE - 2 Peter        1JN - 1 John         2JN - 2 John
3JN - 3 John         JUD - Jude           REV - Revelation
```

---

## Common Translations

```
NASB95  - Berean Standard Bible
KJV  - King James Version
NIV  - New International Version
ESV  - English Standard Version
NASB - New American Standard Bible
NLT  - New Living Translation
```

---

## Material Icons

Common icons used in Seed Bible:

```
bookmark, bookmark_add, bookmark_added
star, star_outline
highlight, highlighter
note, note_add, notes
share, share_alt
search
settings, settings_applications
palette, color_lens
edit, edit_note
visibility, visibility_off
fullscreen, fullscreen_exit
menu, menu_open
close, cancel
check, check_circle
add, add_circle
remove, remove_circle
arrow_back, arrow_forward
navigate_before, navigate_next
expand_more, expand_less
apps, extension
person, people, group
```

View all Material Icons: https://fonts.google.com/icons

---

## Debugging Shortcuts

### Console Inspection

```tsx
// In browser console
console.log("Tools:", globalThis);
console.log("Canvas Mode:", globalThis.CanvasMode);

// Get all global functions
Object.keys(globalThis)
  .filter((k) => k[0] === k[0].toUpperCase())
  .forEach((k) => console.log(k));
```

### React DevTools

```tsx
// Access context in component
const context = useBibleContext();
console.log("Context:", context);

// Monitor changes
useEffect(() => {
  console.log("State updated:", context);
}, [context]);
```

### Check Tool Registration

```tsx
const { tools, isToolActive } = useBibleContext();

console.log(
  "All tools:",
  tools.map((t) => t.label)
);
console.log(
  "Active tools:",
  tools.filter((t) => t.active).map((t) => t.label)
);
console.log(
  "My tool:",
  tools.find((t) => t.label === "My Tool")
);
```

---

## File Locations Quick Reference

```
Main App Entry:
  packages/seed-bible/app/main/main.tsx

Hooks:
  packages/seed-bible/app/hooks/bibleVariables.tsx
  packages/seed-bible/app/hooks/tabs.tsx
  packages/seed-bible/app/hooks/sideBar.tsx
  packages/seed-bible/app/hooks/mouseMove.tsx
  packages/seed-bible/app/hooks/bibleData.tsx

Global Functions:
  packages/seed-bible/app/components/global_functions.tsx

Main Components:
  packages/seed-bible/app/components/thePage.tsx
  packages/seed-bible/app/components/layout.tsx
  packages/seed-bible/app/components/editor.tsx
  packages/seed-bible/app/components/toolbar.tsx

Types:
  packages/seed-bible/app/components/types.tsx

Extension Examples:
  packages/BibleStack/
  packages/Canvas/
  packages/ScriptureMap2D/
```

---

## Creating a New Extension

### 1. Create Package Directory

```bash
mkdir packages/MyExtension
cd packages/MyExtension
```

### 2. Create extension.json

```json
{
  "name": "My Extension",
  "description": "What it does",
  "id": 1702345678901,
  "mainBotTag": "myext.main",
  "configEditor": {
    "toolbarConfig": {
      "icon": "extension",
      "label": "My Extension",
      "run": "toggleMyExtension"
    }
  }
}
```

### 3. Create index.tsx

```tsx
import { useBibleContext } from "../seed-bible/app/hooks/bibleVariables";

export function MyExtension() {
  const { addTool } = useBibleContext();

  useEffect(() => {
    addTool({
      icon: "extension",
      label: "My Extension",
      onClick: () => console.log("Activated!"),
    });
  }, []);

  return null;
}

// Export to global scope
globalThis.toggleMyExtension = () => {
  console.log("Toggle extension!");
};
```

---

## Best Practices Checklist

- [ ] Use hooks for state access (not direct global state)
- [ ] Clean up resources in useEffect return
- [ ] Use unique IDs (Date.now() + Math.random())
- [ ] Handle mobile responsively (check isMobile)
- [ ] Track user activities for collaboration
- [ ] Add TypeScript types for better DX
- [ ] Test with multiple screens (1-4)
- [ ] Verify tool registration in console
- [ ] Handle errors gracefully
- [ ] Document your extension

---

**For full documentation, see:** [DEVELOPER_DOCUMENTATION.md](DEVELOPER_DOCUMENTATION.md)

**Last Updated:** 2025-12-12
