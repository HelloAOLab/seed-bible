# Seed Bible Developer Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Runtime Foundation](#runtime-foundation)
   - [CasualOS](#casualos)
   - [Sessions](#sessions)
   - [BIOS Configuration](#bios-configuration)
   - [Session Lifecycle](#session-lifecycle)
   - [Collaborative Foundation](#collaborative-foundation)
   - [Records API](#records-api)
   - [Identity: Profiles, Accounts, and Studios](#identity-profiles-accounts-and-studios)
   - [Anonymous Users](#anonymous-users)
   - [Spaces](#spaces)
3. [Architecture](#architecture)
4. [Core Hooks API](#core-hooks-api)
5. [Core Components](#core-components)
6. [Global Functions API](#global-functions-api)
7. [Extension System](#extension-system)
8. [Development Patterns](#development-patterns)
9. [User Activity Tracking](#user-activity-tracking)
10. [Package Structure](#package-structure)
11. [AI Guardrails and Epistemic Humility](#ai-guardrails-and-epistemic-humility)
12. [Data Philosophy](#data-philosophy)
13. [External Services](#external-services)

---

## Project Overview

Seed Bible is a modular, extensible Bible study platform built with React/Preact in a monorepo architecture. It features:

- **Multi-screen split view** for comparing translations
- **Multi-user collaboration** with real-time presence tracking
- **Plugin/Extension system** with 22+ available packages
- **Rich text editing** with TipTap
- **Flexible toolbar system** with customizable tools
- **Workspace management** with tabs, spaces, and folders
- **3D visualizations** (Bible Stack, Tabernacle, Scripture Maps)
- **Canvas (gridPortal)** providing 3D spatial environment for collaborative visualization
- **Drawing tools** for annotations
- **Calendar integration** for events and scheduling

### Technology Stack

- **Framework:** React/Preact (CasualOS compatibility)
- **Language:** TypeScript (TSX)
- **Editor:** TipTap
- **Build:** esbuild, tsx
- **Package Manager:** pnpm (monorepo)
- **Calendar:** FullCalendar
- **Communication:** Socket-based sync

---

## Runtime Foundation

### CasualOS

Seed Bible is built on **CasualOS**, an open-source operating system that enables real-time, collaborative environments running directly in the browser. CasualOS is the underlying runtime platform that makes Seed Bible's collaborative features possible.

**Key concepts:**

- **CasualOS** is the runtime platform ([docs.casualos.com](https://docs.casualos.com))
- **AO.bot** is AO Lab's hosted deployment of CasualOS
- **Instances (insts)** are running CasualOS environments
- **Seed Bible sessions** compile and execute inside insts
- **Bots** are the fundamental data structures in CasualOS (JSON objects with tags)
- **Tags** are key-value pairs on bots that store data and behavior

### Sessions

A **session** is a running instance of Seed Bible. Sessions are collaborative by default—multiple users can join the same session and interact together.

**Session characteristics:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Default sessions self-expire in **12 hours** (see [Session Lifecycle](#session-lifecycle))
- Permanent sessions can be provisioned for partners and ministries
- Sessions can be collaborative or static (controlled by BIOS configuration)
- All participants share interactions and state, but visualization is independent

### BIOS Configuration

**BIOS** (Basic Input/Output System) is a configuration layer that determines what an inst can and cannot do. BIOS parameters control:

- Whether a session is **collaborative** or **static**
- Access permissions and capabilities
- Session behavior and features

Developers should understand that session capabilities are controlled by BIOS parameters set when the session is created.

### Session Lifecycle

Understanding session lifecycle is important for developers building features that store data or track user progress.

**Default sessions:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Self-expire after **12 hours** of inactivity
- All session data is lost when a session expires
- Users are notified before expiration

**Permanent sessions:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Can be provisioned for partners and ministries
- Require explicit provisioning
- Do not self-expire

**What happens when sessions expire:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- All bots and tags in the session are removed
- Unsaved user data is lost
- Records stored in the persistent layer (via Records API) are NOT affected
- Users can create a new session and continue working

**Developer guidance:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- For temporary data: Store in session bots/tags (lost on expiration)
- For persistent data: Use the Records API (survives session expiration)
- Always inform users about data persistence behavior

### Collaborative Foundation

Seed Bible's collaborative architecture is foundational, not a feature layer. Understanding the principle of **"shared interaction, independent visualization"** is essential for developers.

**Core principles:**

1. **Shared Interaction, Independent Visualization**
   - Participants share actions and state, not screens or layouts
   - Each user controls their own view configuration (Spaces)
   - Interactions emit events that other participants can observe

2. **Peer-Based Architecture**
   - AI agents, web services, and IoT devices can participate as peers
   - All participants (human or AI) interact through the same event system
   - Because CasualOS treats all participants as peers in a shared environment, humans and AI collaborate naturally

3. **Real-Time Presence**
   - User activities are tracked and shared in real-time
   - See [User Activity Tracking](#user-activity-tracking) for API details
   - Presence enables features like "follow mode" and collaborative study

**Developer implications:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Design features that emit observable events rather than directly manipulating other users' views
- Use the user activity API to build presence-aware features
- Remember that actions are shared, but visualization configuration is personal

### Records API

All persistent data in Seed Bible is stored in **Records**. Records are the persistence layer that survives session expiration.

**What are Records?**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Schema-free JSON documents
- Belong to either an Account or a Studio
- Support three types: Data Records, File Records, and Event Records

**Record markers control access:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- `publicRead`: Anyone can read
- `publicWrite`: Anyone can write
- `private`: Only owner can access
- `Account`: Account-level access
- Custom markers for fine-grained control

**When to use Records:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- User preferences and settings
- Reading history and progress
- Annotations and notes
- Any data that must survive session expiration

**Learn more:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- [CasualOS Records Documentation](https://docs.casualos.com/docs/records)
- Records API is accessed through CasualOS bot actions

### Identity: Profiles, Accounts, and Studios

Seed Bible uses a three-level identity hierarchy:

**1. Profile**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Individual user data within an Account
- No email required
- Can have multiple Profiles per Account
- Profile-specific preferences and history

**2. Account**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- System-level identity tied to email address
- Required for authentication
- Can own Records
- Can be a member of multiple Studios

**3. Studio**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Group structure for shared collaboration
- Multiple Accounts can be members
- Studio-owned Records are shared among members
- Many-to-many relationship: one Account can belong to many Studios, one Studio can have many Accounts

**Developer guidance:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Use **Profile** data for personal preferences within an Account
- Use **Account** data for cross-profile settings and authentication
- Use **Studio** data for collaborative workspaces and shared content
- Anonymous users have temporary local storage only (no Profile/Account)

### Anonymous Users

Anonymous users can use Seed Bible without authentication, but with limitations.

**Anonymous user capabilities:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Read Scripture and use basic features
- Create temporary sessions (expire after 12 hours)
- Use visualization tools (Canvas, BibleStack, etc.)

**Anonymous user limitations:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Cannot save progress or preferences
- Cannot join Studios
- Cannot access restricted content
- Data is stored locally and lost when session ends

**Developer guidance:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Design features that degrade gracefully for anonymous users
- Clearly indicate when features require authentication
- Provide save prompts before session expiration for anonymous users
- Use local storage for temporary anonymous data

### Spaces

A **Space** is a personal view configuration that defines how a Seed Bible session environment is displayed. Spaces solve the "provisioning problem"—one person can set up a Space and share it with many.

**Key characteristics:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- **Spaces are personal.** Your layout does not affect another person's view
- **Interaction is shared; visualization configuration is not**
- Spaces can be saved, shared, and loaded as .aux files

**What Spaces contain:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Tab configurations and layouts
- Folder organization
- Toolbar customization (per-space toolbars)
- Split-screen arrangements
- UI preferences

**Developer guidance:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Spaces are static JSON configurations
- Users can export Spaces as .aux files for sharing
- When designing features, remember that each user's Space is independent
- Space configurations are stored per-user, not shared

---

## Architecture

### Project Structure

```
seed-bible/
├── packages/
│   ├── seed-bible/              # Main application
│   │   ├── app/
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom React hooks (PRIMARY API)
│   │   │   ├── main/            # App entry point
│   │   │   ├── pages/           # Page components
│   │   │   ├── emitter/         # Event system
│   │   │   ├── reciver/         # Data streaming
│   │   │   ├── packager/        # Package management
│   │   │   └── styles/          # Styling
│   │   ├── components/          # Reusable components
│   │   ├── db/                  # Database/annotations
│   │   ├── managers/            # Business logic
│   │   ├── experience/          # UX features
│   │   ├── shortcuts/           # Keyboard shortcuts
│   │   ├── aiApps/              # AI features
│   │   └── baseElements/        # Base HTML elements
│   ├── ao.bot/                  # AO Bot integration
│   ├── Assistant/               # Assistant functionality
│   ├── BibleStack/              # 3D stack visualization
│   ├── BibleVisualizationUtils/ # Viz utilities
│   ├── BookSelector/            # Book selection UI
│   ├── Calendar/                # Calendar integration
│   ├── Canvas/                  # Canvas drawing
│   ├── ColorLerper/             # Color interpolation
│   ├── Draw/                    # Drawing tool
│   ├── Eraser/                  # Eraser tool
│   ├── Events/                  # Event management
│   ├── Location/                # GPS features
│   ├── MindMap/                 # Mind mapping
│   ├── Playlist/                # Playlist/recording
│   ├── References/              # Reference management
│   ├── ScriptureMap2D/          # 2D map visualization
│   ├── ScriptureMap3D/          # 3D map visualization
│   └── Tabernacle/              # Tabernacle visualization
└── .editorconfig
```

### Context Provider Hierarchy

All state management is handled through React Context:

```tsx
<BibleVariablesProvider>
  {" "}
  {/* Bible state + toolbar + user activities */}
  <TabsProvider>
    {" "}
    {/* Tabs, spaces, folders */}
    <SideBarProvider>
      {" "}
      {/* UI state, popups */}
      <MouseMoveProvider>
        {" "}
        {/* Mouse tracking, floating windows */}
        <Layout>
          <YourComponent />
        </Layout>
      </MouseMoveProvider>
    </SideBarProvider>
  </TabsProvider>
</BibleVariablesProvider>
```

---

## Core Hooks API

### 1. useBibleContext()

**Import:** `import { useBibleContext } from './hooks/bibleVariables'`

**Provider:** `<BibleVariablesProvider>`

The central state management hook for Bible application state, toolbar management, and multi-user activity tracking.

#### State Properties

```tsx
const {
  // Display State
  screens, // number: 1-4 split screens
  panelMode, // boolean: panel layout mode
  canvasMode, // boolean: canvas drawing mode
  mapMode, // boolean: map visualization mode
  fullScreen, // boolean: fullscreen state
  showHeading, // boolean: show chapter headings
  showVerses, // boolean: show verse numbers

  // Toolbar State
  tools, // array: main toolbar tools
  canvasTools, // array: canvas mode tools
  mapTools, // array: map mode tools
  ReSeed, // boolean: toolbar edit mode

  // Multi-user Activity Tracking
  userActivities, // object: all users' activity data

  // Theme
  themeColors, // object: theme color configuration
} = useBibleContext();
```

#### Toolbar Management Functions

```tsx
// Add a tool to the toolbar
addTool(tool: ToolObject, { to: 'tools' | 'canvas' | 'map' })

// Remove a tool by label
removeTool(label: string, { from: 'tools' | 'canvas' | 'map' })

// Update tool properties
updateTool(label: string, newProps: object, { inSet: 'tools' | 'canvas' | 'map' })

// Toggle tool active state
toggleToolActive(label: string, customState?: boolean, { inSet: 'tools' | 'canvas' | 'map' })

// Check if tool is active
isToolActive(label: string, { inSet: 'tools' | 'canvas' | 'map' }): boolean

// Toggle toolbar visibility
toToggleShowInPageToolbar(label: string, { inSet: 'tools' | 'canvas' | 'map' })
toToggleShowInStarterToolbar(label: string, { inSet: 'tools' | 'canvas' | 'map' })
```

#### Navigation Functions

```tsx
// Scroll to a specific verse
scrollToVerse(verseNumber: number)
```

#### User Activity Functions

See [User Activity Tracking](#user-activity-tracking) section for detailed API.

```tsx
// Update user activity
updateUserActivity(userId: string, activityData: object)

// Update current book/chapter for user
updateCurrentBookChapter(userId: string, book: string, bookId: string, chapter: number, translation: string)

// Update last clicked verse
updateLastVerseClicked(userId: string, verseNumber: number)

// Update highlighted verses
updateHighlightedVerses(userId: string, verses: number[])

// Update session info (host/follower)
updateSessionInfo(userId: string, sessionInfo: object)

// Get specific user's activity
getUserActivity(userId: string): UserActivity | null

// Get all users' activities
getAllUserActivities(): UserActivity[]

// Get users reading specific book/chapter
getUsersByBook(book: string, chapter?: number): UserActivity[]

// Clear user activity
clearUserActivity(userId: string)
clearAllUserActivities()
```

#### Tool Object Structure

```tsx
interface Tool {
  icon: string; // Material icon name or custom icon
  label: string; // Tool display name (unique identifier)
  hasToggle?: boolean; // Whether tool has active/inactive states
  active?: boolean; // Current active state
  onClick?: () => void; // Click handler
  onHold?: () => Promise<void>; // Long-press handler
  onRightClick?: () => void; // Right-click/context menu handler
  showInPageToolbar?: boolean; // Show in main toolbar
  showInStarterToolbar?: boolean; // Show in starter toolbar
  color?: string; // Icon color
  backgroundColor?: string; // Background color
  priority?: number; // Display priority
  customComponent?: JSX.Element; // Custom rendering
}
```

---

### 2. useTabsContext()

**Import:** `import { useTabsContext } from './hooks/tabs'`

**Provider:** `<TabsProvider>`

Manages tabs, spaces (workspaces), and folder organization.

#### State Properties

```tsx
const {
  // Spaces & Tabs
  spaces, // array: all workspaces
  activeSpace, // string: current space ID
  activeTab, // object: currently active tab
  tabs, // array: tabs in current space

  // Organization
  folders, // array: folder structure

  // Selection
  multiSelectMode, // boolean: multi-selection enabled
  selectedTabs, // array: currently selected tabs

  // Display
  tabsIcons, // boolean: show icons in tabs
  sharedTab, // object: single tab shared across spaces
} = useTabsContext();
```

#### Tab Management Functions

```tsx
// Add a new tab
addTab(tab: TabObject)

// Remove a tab
removeTab(tabId: string)

// Update tab data
updateTab(tabId: string, newData: object)

// Update active tab
updateActiveTab(newData: object)

// Generic tab management
manageTab(action: string, tab: TabObject, folderId?: string)
```

#### Space Management Functions

```tsx
// Add a new space (workspace)
addSpace(spaceName: string, icon?: string)

// Remove a space
removeSpace(spaceId: string)

// Export space configuration as JSON
downloadSpaceAsJSON(spaceId: string)

// Import space configuration from JSON
replaceActiveSpaceWithJSON(json: object, spaceId: string)

// Configure space-specific toolbar
updateToolsForSpace(spaceId: string, tools: Tool[])

// Get all tabs in a space
getAllTabsInSpace(spaceId: string): Tab[]
```

#### Folder Management Functions

```tsx
// Add a folder to current space
addFolder(folderName: string)

// Remove a folder
removeFolder(folderId: string)

// Add tab to folder
addTabToFolder(folderId: string, tab: TabObject)

// Add multiple tabs to folder
addTabsToFolder(folderId: string, tabs: TabObject[])

// Remove tab from folder
removeTabFromFolder(folderId: string, tabId: string)

// Move tab to different folder
moveTab(tabId: string, newFolderId: string)

// Move multiple tabs
moveMultipleTabs(tabIds: string[], newFolderId: string)
```

#### Tab Object Structure

```tsx
interface Tab {
  id: string; // Unique tab ID
  label: string; // Tab display name
  type: string; // Tab type ('bible', 'canvas', 'editor', etc.)
  icon?: string; // Tab icon
  content?: any; // Tab content data
  bookId?: string; // Bible book ID (for bible tabs)
  chapter?: number; // Chapter number (for bible tabs)
  translation?: string; // Translation (for bible tabs)
  pinned?: boolean; // Whether tab is pinned
}
```

---

### 3. useBibleData()

**Import:** `import { useBibleData } from './hooks/bibleData'`

Fetches and manages Bible chapter content with automatic caching.

#### State Properties

```tsx
const {
  data, // object: chapter content with parsed verses
  footnotes, // array: chapter footnotes
  loading, // boolean: loading state
  error, // string: error message
} = useBibleData();
```

#### Functions

```tsx
// Load a specific chapter
open(bookId: string, chapter: number, translation: string)

// Navigate to next chapter
openNextChapter()

// Navigate to previous chapter
openPrevChapter()

// Change translation
changeTranslation(newTranslation: string)

// Cache management (utilities)
getCachedTabData(tabId: string): CachedData | null
setCachedTabData(tabId: string, data: object)
```

#### Data Structure

```tsx
interface ChapterData {
  book: string; // Book name (e.g., "Genesis")
  chapter: number; // Chapter number
  verses: Verse[]; // Array of verse objects
  footnotes: Footnote[]; // Chapter footnotes
  translation: string; // Translation ID (e.g., "BSB")
}

interface Verse {
  number: number; // Verse number
  text: string; // Verse text
  words: Word[]; // Array of word objects
}
```

---

### 4. BibleDataManager (Class)

**Import:** `import { BibleDataManager } from './hooks/bibleDataManager'`

Imperative Bible data management with reading history tracking.

#### Usage

```tsx
const manager = new BibleDataManager();

// Subscribe to state changes
manager.subscribe((state) => {
  console.log("Current book:", state.book);
  console.log("Current chapter:", state.chapter);
  console.log("Data:", state.data);
});

// Open a chapter
await manager.open("GEN", 1, "BSB");

// Navigate
await manager.openNext();
await manager.openPrevious();

// Change translation
await manager.changeTranslation("KJV");

// Get current state
const state = manager.getState();

// Cleanup
manager.dispose();
```

#### Methods

```tsx
class BibleDataManager {
  // Fetch data from URL
  async fetch(
    customUrl?: string,
    forcedTranslation?: string,
    forcedBaseUrl?: string
  ): Promise<void>;

  // Open specific chapter
  async open(
    bookId: string,
    chapter: number,
    translation: string,
    chapterUrl?: string
  ): Promise<void>;

  // Navigate to next chapter
  async openNext(): Promise<void>;

  // Navigate to previous chapter
  async openPrevious(): Promise<void>;

  // Change translation
  async changeTranslation(
    newTranslation: string,
    bookData?: object,
    forcedBaseUrl?: string
  ): Promise<void>;

  // Get current state
  getState(): BibleState;

  // Subscribe to changes
  subscribe(callback: (state: BibleState) => void): () => void;

  // Cleanup
  dispose(): void;
}
```

#### Features

- Automatic reading history recording (every 5 seconds)
- Viewing time tracking (>1 minute threshold)
- Tab-based caching system
- Observable state pattern

---

### 5. useSideBarContext()

**Import:** `import { useSideBarContext } from './hooks/sideBar'`

**Provider:** `<SideBarProvider>`

Manages sidebar UI state and popup menus.

#### State Properties

```tsx
const {
  collapsed, // boolean: sidebar collapsed state
  sidebarWidth, // number: sidebar width in pixels
  sidebarMode, // string: display mode
  popupSettings, // object: current popup content
  isMobile, // boolean: mobile device detection
  themeColors, // object: theme configuration
  packageAddingOptions, // array: available packages to add
} = useSideBarContext();
```

#### Functions

```tsx
// Open a popup menu
openPopupSettings(
  props: object,           // Popup content/props
  wait?: number,           // Delay in ms before showing
  popupComponent?: JSX.Element  // Custom component to render
)

// Close the popup
closePopupSettings()

// Adjust position to keep within screen bounds
adjustPositionWithinScreen(x: number, y: number): { x: number, y: number }
```

---

### 6. useMouseMove()

**Import:** `import { useMouseMove } from './hooks/mouseMove'`

**Provider:** `<MouseMoveProvider>`

Global mouse position tracking, drag overlay system, and floating window management.

#### State Properties

```tsx
const {
  position, // { x: number, y: number }: mouse position
  isDragging, // boolean: dragging state
  Element, // JSX.Element: element being dragged
  floatingApps, // array: floating window applications
  hiddenApps, // array: hidden applications
  modalContent, // JSX.Element: modal dialog content
} = useMouseMove();
```

#### Functions

```tsx
// Update mouse position
setPosition({ x: number, y: number })

// Set dragging state
setIsDragging(isDragging: boolean)

// Set element being dragged
setElement(element: JSX.Element)

// Toggle screen panel options
setShowScreenPanelOption(show: boolean)

// Add a floating window application
AddFloatingApp(appConfig: FloatingAppConfig)

// Show modal dialog
ShowModal(content: JSX.Element)

// Close modal dialog
CloseModal()
```

#### FloatingAppConfig Structure

```tsx
interface FloatingAppConfig {
  id: string; // Unique app ID
  App: JSX.Element; // Application component
  to: "panel" | "floating"; // Where to display
  minWidth?: string; // Minimum width (e.g., '30rem')
  minHeight?: string; // Minimum height
  title?: string; // Window title
  icon?: string; // Window icon
  closable?: boolean; // Whether can be closed
  resizable?: boolean; // Whether can be resized
  draggable?: boolean; // Whether can be dragged
}
```

---

### 7. useDivSpliter()

**Import:** `import { useDivSpliter } from './hooks/divSpliter'`

Manages split-screen layouts with drag-to-resize functionality.

#### Features

- Vertical and horizontal split support
- Mobile-responsive layout
- Persistent layout per space
- Container size management

#### Usage

```tsx
const {
  handleMouseDown, // Drag handler for splitter
  width, // Current width
  height, // Current height
} = useDivSpliter({
  initialWidth: 800,
  initialHeight: 600,
  split: "vertical",
  spaceId: currentSpaceId,
});
```

---

### 8. useHoldAction()

**Import:** `import { useHoldAction } from './hooks/useHold'`

Detects long-press/hold gestures on elements.

#### Usage

```tsx
const { eventHandlers, shouldSuppressClick } = useHoldAction({
  onHold: () => {
    console.log("Long press detected!");
  },
  holdDuration: 500, // ms
});

return <button {...eventHandlers}>Long press me</button>;
```

#### Returns

```tsx
{
  eventHandlers: {
    onMouseDown: (e) => void,
    onMouseUp: (e) => void,
    onMouseLeave: (e) => void,
    onTouchStart: (e) => void,
    onTouchEnd: (e) => void,
  },
  shouldSuppressClick: () => boolean,
}
```

---

### 9. useFolderTabs()

**Import:** `import { useFolderTabs } from './hooks/folders'`

Manages tabs within folders (subset of useTabsContext functionality).

#### Functions

```tsx
// Add folder
addFolder(folder: FolderObject)

// Remove folder
removeFolder(folderId: string)

// Add tab to folder
addTabToFolder(folderId: string, tab: TabObject)

// Remove tab from folder
removeTabFromFolder(folderId: string, tabId: string)

// Update tab in folder
updateTabInFolder(folderId: string, tabId: string, newData: object)
```

---

## Core Components

### Main Display Components

#### ThePage

**Import:** `import { ThePage, ThePageWithPanel, ThePageWithEditor } from './components/thePage'`

Main Bible scripture display component with toolbar, settings, and multi-user support.

**Features:**

- Multi-screen support (1-4 simultaneous screens)
- Verse highlighting and selection
- Word highlighting with custom colors
- Verse context toolbar
- Translation switching
- Multi-user presence indicators
- Session management (host/follower mode)

**Props:**

```tsx
interface ThePageProps {
  screens?: number; // Number of split screens (1-4)
  panelMode?: boolean; // Panel layout mode
  showToolbar?: boolean; // Show toolbar
  showSettings?: boolean; // Show settings panel
}
```

**Usage:**

```tsx
<ThePage screens={2} panelMode={false} />
```

---

#### Layout

**Import:** `import { Layout } from './components/layout'`

Root layout wrapper with sidebar and main content area.

**Features:**

- Mouse position tracking
- Context menu handling
- Responsive design
- Sidebar integration

**Usage:**

```tsx
<Layout>
  <YourContent />
</Layout>
```

---

### Editor Components

#### TextEditor

**Import:** `import { TextEditor } from './components/editor'`

Rich text editor powered by TipTap with custom extensions.

**Features:**

- Custom marks/nodes (LineHeight, etc.)
- Toolbar with priority system
- File upload/attachment support
- Format preservation
- Markdown support

**Props:**

```tsx
interface TextEditorProps {
  content?: string; // Initial content
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  showToolbar?: boolean;
  customToolbar?: Tool[];
}
```

---

#### MiniTextEditor

**Import:** `import { MiniTextEditor } from './components/smallEditor'`

Compact version of TextEditor for inline editing.

---

### Settings Components

All settings components follow similar patterns:

```tsx
import { SettingsSidebar } from "./components/settings";
import { ThemeSettings } from "./components/themeSettings";
import { TextSettings } from "./components/textSettings";
import { ToolbarSettings } from "./components/toolbarSettings";
import { EditorSettings } from "./components/editorSettings";
import { TabSettings } from "./components/tabSettings";
import { AiSettings } from "./components/aiSettings";
import { CanvasAiSettings } from "./components/canvasAiSettings";
import { PromptBarSettings } from "./components/PromtBarSettings";
import { ScreenSettings } from "./components/screenSettingsOptions";
import { MenuTextSettings } from "./components/menuTextSettings";
import { SpaceSettings } from "./components/spaceSettings";
```

**Usage:** These are typically rendered within a settings panel or modal.

---

### UI Components

#### SideBar

**Import:** `import { SideBar } from './components/sideBar'`

Left navigation sidebar with tabs, spaces, and navigation.

---

#### Toolbar Components

```tsx
import { Toolbar } from "./components/toolbar";
import { ToolbarReal, renderToolbar } from "./components/renderToolbar";
import { VerseToolbar } from "./components/verseToolbar";
```

- **Toolbar**: Main application toolbar
- **ToolbarReal/renderToolbar**: Advanced toolbar with rendering engine
- **VerseToolbar**: Context toolbar that appears when verses are selected

---

#### Utility Components

```tsx
import { Icons } from "./components/icons";
import { Phosphoricons } from "./components/phosphoricons";
import { Chips } from "./components/Chips";
import { CircleCounter } from "./components/circleCounter";
import { Notifications } from "./components/notifications";
import { ProfileCard } from "./components/profileCard";
```

---

### Feature Components

#### Commands

**Import:** `import { Commands } from './components/commands'`

Command palette with fuzzy search for quick actions.

---

#### Extensions

**Import:** `import { Extensions } from './components/extensions'`

Package/extension management interface.

---

#### Event Handlers

```tsx
import { OnVerseClick } from "./components/onVerseClick";
import { OnVerseRightClick } from "./components/onVeresRightClick";
import { OnBookChanged } from "./components/onBookChanged";
import { OnKeyDown, OnKeyUp } from "./components/onKeyDown";
import { OnGridClick } from "./components/onGridClick";
```

These components handle specific user interactions and can be customized.

---

### Upload Components

```tsx
import { UploadFile } from "./components/uploadFile";
import { UploadHandler } from "./components/uploadHandler";
```

File upload UI and logic.

---

## Global Functions API

These functions are exposed on `globalThis` and can be called from anywhere in the application, including from extension packages.

**Location:** [app/components/global_functions.tsx](packages/seed-bible/app/components/global_functions.tsx)

### Tab Management

```tsx
// Update existing tab
globalThis.UpdateTab(tabId: string, data: object): void

// Add new tab
globalThis.AddTab(tab: TabObject): void

// Remove tab
globalThis.RemoveTab(tabId: string): void
```

**Example:**

```tsx
globalThis.AddTab({
  id: "my-tab-1",
  label: "My Tab",
  type: "bible",
  bookId: "GEN",
  chapter: 1,
  translation: "BSB",
});

globalThis.UpdateTab("my-tab-1", { chapter: 2 });

globalThis.RemoveTab("my-tab-1");
```

---

### Navigation

```tsx
// Open specific book/chapter
globalThis.Open(bookId: string, chapter: number, translation: string): void

// Navigate to next chapter
globalThis.OpenNextChapter(): void

// Navigate to previous chapter
globalThis.OpenPrevChapter(): void
```

**Example:**

```tsx
globalThis.Open("GEN", 1, "BSB"); // Open Genesis 1 (BSB translation)
globalThis.OpenNextChapter(); // Navigate to Genesis 2
globalThis.OpenPrevChapter(); // Back to Genesis 1
```

---

### UI State Management

```tsx
// Set toolbar background color
globalThis.SetToolbarBackground(color: string): void

// Set number of split screens (1-4)
globalThis.SetScreens(count: number): void

// Toggle toolbar ReSeed (edit) mode
globalThis.ToolbarReSeedMode(enabled: boolean): void

// Set element being dragged
globalThis.SetElement(element: JSX.Element): void

// Set dragging state
globalThis.SetIsDragging(isDragging: boolean): void
```

**Example:**

```tsx
globalThis.SetToolbarBackground("#1e1e1e");
globalThis.SetScreens(2); // Split screen into 2 panels
globalThis.ToolbarReSeedMode(true); // Enable toolbar editing
```

---

### Application Window Management

```tsx
// Add floating application window
globalThis.AddApplication(config: FloatingAppConfig): void

// Remove application by ID
globalThis.RemoveApplication(id: string): void
globalThis.RemoveApplicationByID(id: string): void

// Replace application
globalThis.ReplaceApplication(id: string, config: FloatingAppConfig): void

// Update application
globalThis.UpdateApplication(id: string, config: Partial<FloatingAppConfig>): void
```

**Example:**

```tsx
globalThis.AddApplication({
  id: "my-app-1",
  App: <MyCustomComponent />,
  to: "floating",
  minWidth: "400px",
  minHeight: "300px",
  title: "My App",
  icon: "apps",
  closable: true,
  resizable: true,
  draggable: true,
});

globalThis.UpdateApplication("my-app-1", { title: "Updated Title" });

globalThis.RemoveApplicationByID("my-app-1");
```

---

### Toolbar Tool Management

```tsx
// Add tool to toolbar
globalThis.AddTool(tool: Tool, options?: { to?: 'tools' | 'canvas' | 'map' }): void

// Remove tool from toolbar
globalThis.RemoveTool(label: string, options?: { from?: 'tools' | 'canvas' | 'map' }): void

// Update tool properties
globalThis.UpdateTool(label: string, props: object, options?: { inSet?: 'tools' | 'canvas' | 'map' }): void

// Toggle tool active state
globalThis.ToggleToolActive(label: string, customState?: boolean, options?: { inSet?: 'tools' | 'canvas' | 'map' }): void

// Check if tool is active
globalThis.IsToolActive(label: string, options?: { inSet?: 'tools' | 'canvas' | 'map' }): boolean

// Toggle tool visibility in page toolbar
globalThis.ToToggleShowInPageToolbar(label: string, options?: { inSet?: 'tools' | 'canvas' | 'map' }): void

// Toggle tool visibility in starter toolbar
globalThis.ToToggleShowInStarterToolbar(label: string, options?: { inSet?: 'tools' | 'canvas' | 'map' }): void
```

**Example:**

```tsx
// Add a custom tool
globalThis.AddTool(
  {
    icon: "bookmark",
    label: "My Bookmark Tool",
    hasToggle: true,
    active: false,
    onClick: () => {
      console.log("Bookmark clicked!");
    },
    onHold: async () => {
      console.log("Long press detected!");
    },
    showInPageToolbar: true,
  },
  { to: "tools" }
);

// Toggle the tool
globalThis.ToggleToolActive("My Bookmark Tool");

// Check if active
if (globalThis.IsToolActive("My Bookmark Tool")) {
  console.log("Tool is active!");
}

// Update tool
globalThis.UpdateTool("My Bookmark Tool", {
  icon: "bookmark_added",
  active: true,
});

// Remove tool
globalThis.RemoveTool("My Bookmark Tool");
```

---

### Popup Settings

```tsx
// Open popup menu
globalThis.openPopupSettings(menu: object, wait?: number, component?: JSX.Element): void

// Close popup menu
globalThis.closePopupSettings(): void
```

**Example:**

```tsx
globalThis.openPopupSettings(
  {
    x: 100,
    y: 100,
    content: <MyPopupContent />,
  },
  0
);

// Later...
globalThis.closePopupSettings();
```

---

### Canvas/View Mode

```tsx
// Canvas mode state (read/write)
globalThis.CanvasMode: boolean | null
```

**Example:**

```tsx
// Enable canvas mode
globalThis.CanvasMode = true;

// Check if in canvas mode
if (globalThis.CanvasMode) {
  console.log("Canvas mode is active");
}
```

---

## Extension System

### Package Structure

Each package in `packages/` follows a standardized structure:

```
packages/YourPackage/
├── extension.json          # Package metadata and configuration
├── index.tsx              # Main package code
├── components/            # Package-specific components
├── utils/                 # Utilities
└── assets/                # Images, icons, etc.
```

---

### extension.json

The `extension.json` file defines package metadata and integration points:

```json
{
  "name": "Your Package Name",
  "description": "What your package does",
  "id": 1234567890123,
  "mainBotTag": "yournamespace.main",
  "dependencies": [
    {
      "name": "Required Package Name"
    }
  ],
  "configEditor": {
    "toolbarConfig": {
      "icon": "material_icon_name",
      "label": "Display Name",
      "run": "functionName"
    }
  }
}
```

**Fields:**

- `name`: Display name of your package
- `description`: Brief description
- `id`: Unique numeric ID (timestamp)
- `mainBotTag`: Bot tag for integration
- `dependencies`: Array of required packages
- `configEditor.toolbarConfig`: Toolbar button configuration
  - `icon`: Material icon name
  - `label`: Button label
  - `run`: Function name to call when clicked

---

### Distribution as .aux Files

Extensions developed as source packages can be compiled and distributed as **.aux files**. An .aux (Ambient User Experience) file is a portable JSON-based representation that includes all bots and tags needed to run the extension.

**.aux files enable:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Sharing extensions without source code access
- Importing extensions into any CasualOS environment
- Complete portability—.aux files remain functional even outside AO Lab
- User ownership and independence from platform providers

Extensions are developed as source packages (with `extension.json` metadata and TypeScript/TSX code), but can be distributed as .aux files for portability. If AO Lab disappeared tomorrow, every .aux file would remain fully functional JSON.

---

### Available Packages

#### 1. Bible Stack

**Path:** `packages/BibleStack/`
**Dependencies:** Object Pooler, Color Lerper, Bible Visualization Utils
**Purpose:** 3D visualization of scripture structure with stacking effect

#### 2. Canvas (gridPortal)

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Canvas/`
> > > > > > > **Purpose:** The gridPortal from CasualOS integrated into Seed Bible. Canvas provides a 3D spatial environment for visualization and collaborative interaction. It is the foundation on which extensions like BibleStack, Tabernacle, and ScriptureMap3D are built.
> > > > > > > **Tab Type:** `canvas`

**Note:** Canvas is NOT a drawing tool. The drawing functionality is provided by the separate Draw package. BibleStack, Tabernacle, and ScriptureMap3D are extensions that build on Canvas to deliver specific visualization experiences.

#### 3. Draw

**Path:** `packages/Draw/`
**Purpose:** Painting/drawing tool
**Function:** `togglePainter()`

#### 4. Land (mapPortal)

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** In development
> > > > > > > **Purpose:** The mapPortal from CasualOS integrated into Seed Bible. Land provides map-based visualization using geographic coordinates and ArcGIS map layers rather than the abstract 3D coordinates used by Canvas (gridPortal).

**Note:** Land development is ongoing. Documentation will be expanded as the service matures. Land is distinct from Canvas—it uses geographic coordinates for terrain-aware biblical geography rather than abstract 3D spatial environments.

#### 5. Scripture Map 2D

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/ScriptureMap2D/`
> > > > > > > **Purpose:** 2D map visualization of scripture locations

#### 6. Scripture Map 3D

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/ScriptureMap3D/`
> > > > > > > **Purpose:** 3D map visualization of scripture locations

#### 7. Calendar

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Calendar/`
> > > > > > > **Purpose:** Event scheduling with FullCalendar integration

#### 8. Playlist

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Playlist/`
> > > > > > > **Purpose:** Recording and playback sequences

#### 9. MindMap

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/MindMap/`
> > > > > > > **Purpose:** Mind mapping visualization for Bible study

#### 10. Tabernacle

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Tabernacle/`
> > > > > > > **Purpose:** 3D visualization of the Tabernacle

#### 11. References

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/References/`
> > > > > > > **Purpose:** Scripture cross-reference management

#### 12. Assistant

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Assistant/`
> > > > > > > **Purpose:** AI assistant functionality

#### 13. Location

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Location/`
> > > > > > > **Purpose:** GPS and location-based features

#### 14. Events

<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b
> > > > > > > **Path:** `packages/Events/`
> > > > > > > **Purpose:** Event management system

And 9 more utility packages (Color Lerper, Object Pooler, Bible Visualization Utils, Book Selector, Cursor Follow, Eraser, GeoImporter, ao.bot).

---

### Creating a New Package

1. **Create package directory:**

   ```bash
   mkdir packages/MyPackage
   cd packages/MyPackage
   ```

2. **Create extension.json:**

   ```json
   {
     "name": "My Package",
     "description": "My awesome package",
     "id": 1702345678901,
     "mainBotTag": "mypackage.main",
     "configEditor": {
       "toolbarConfig": {
         "icon": "extension",
         "label": "My Package",
         "run": "toggleMyPackage"
       }
     }
   }
   ```

3. **Create index.tsx:**

   ```tsx
   import { useBibleContext } from "../seed-bible/app/hooks/bibleVariables";

   export function initMyPackage() {
     // Add your tool to the toolbar
     globalThis.AddTool({
       icon: "extension",
       label: "My Package",
       onClick: () => {
         console.log("My package activated!");
       },
     });
   }

   // Export function that can be called from extension.json
   globalThis.toggleMyPackage = () => {
     console.log("Toggle my package!");
   };

   // Initialize on load
   initMyPackage();
   ```

4. **Add package to main app:**
   The package system will automatically discover and load your package based on `extension.json`.

---

## Development Patterns

### Pattern 1: Accessing Global State

All components should access state through context hooks:

```tsx
import { useBibleContext } from "./hooks/bibleVariables";
import { useTabsContext } from "./hooks/tabs";
import { useSideBarContext } from "./hooks/sideBar";

function MyComponent() {
  const { tools, userActivities } = useBibleContext();
  const { tabs, activeSpace } = useTabsContext();
  const { collapsed, openPopupSettings } = useSideBarContext();

  return (
    <div>
      <p>Active space: {activeSpace}</p>
      <p>Number of tools: {tools.length}</p>
    </div>
  );
}
```

---

### Pattern 2: Adding Toolbar Tools

Tools should be added using the context or global functions:

```tsx
// Method 1: Using context
const { addTool } = useBibleContext();

addTool(
  {
    icon: "bookmark",
    label: "Bookmarks",
    hasToggle: true,
    active: false,
    onClick: () => handleBookmarkClick(),
    onHold: async () => handleBookmarkLongPress(),
    showInPageToolbar: true,
  },
  { to: "tools" }
);

// Method 2: Using global function
globalThis.AddTool({
  icon: "bookmark",
  label: "Bookmarks",
  onClick: () => handleBookmarkClick(),
});
```

---

### Pattern 3: Multi-User Activity Tracking

Track what users are doing in real-time:

```tsx
const { updateCurrentBookChapter, getUsersByBook, userActivities } =
  useBibleContext();

// Update when user navigates
function handleNavigation(bookId, chapter) {
  updateCurrentBookChapter(currentUserId, "Genesis", bookId, chapter, "BSB");
}

// Get all users reading the same book
const usersInGenesis = getUsersByBook("Genesis", 1);

// Render user presence
return (
  <div>
    <h3>Users reading Genesis 1:</h3>
    {usersInGenesis.map((user) => (
      <ProfileCard key={user.userId} user={user} />
    ))}
  </div>
);
```

---

### Pattern 4: Creating Floating Applications

Add draggable, resizable windows:

```tsx
import { useMouseMove } from "./hooks/mouseMove";

function MyComponent() {
  const { AddFloatingApp } = useMouseMove();

  const openMyApp = () => {
    AddFloatingApp({
      id: `my-app-${Date.now()}`,
      App: <MyAppContent />,
      to: "floating",
      minWidth: "400px",
      minHeight: "300px",
      title: "My Application",
      icon: "apps",
      closable: true,
      resizable: true,
      draggable: true,
    });
  };

  return <button onClick={openMyApp}>Open App</button>;
}
```

**Or using global function:**

```tsx
globalThis.AddApplication({
  id: "my-app",
  App: <MyAppContent />,
  to: "floating",
  title: "My App",
});
```

---

### Pattern 5: Tab Management

Create and manage tabs programmatically:

```tsx
const { addTab, updateTab, removeTab } = useTabsContext();

// Add a new Bible tab
addTab({
  id: `tab-${Date.now()}`,
  label: "Genesis 1",
  type: "bible",
  bookId: "GEN",
  chapter: 1,
  translation: "BSB",
});

// Add a canvas tab
addTab({
  id: `canvas-${Date.now()}`,
  label: "My Drawing",
  type: "canvas",
  content: canvasData,
});

// Update tab
updateTab("tab-123", { chapter: 2, label: "Genesis 2" });

// Remove tab
removeTab("tab-123");
```

---

### Pattern 6: Space (Workspace) Management

Organize tabs into spaces:

```tsx
const { spaces, addSpace, addFolder, addTabToFolder, getAllTabsInSpace } =
  useTabsContext();

// Create a new workspace
addSpace("Study Space", "school");

// Create a folder in the space
addFolder("Old Testament");

// Add tabs to the folder
addTabToFolder("folder-123", {
  id: "tab-gen1",
  label: "Genesis 1",
  type: "bible",
  bookId: "GEN",
  chapter: 1,
});

// Get all tabs in a space
const spaceTabs = getAllTabsInSpace("space-123");
```

---

### Pattern 7: Event Handling on Verses

Handle verse interactions:

```tsx
// OnVerseClick component handles click events
// OnVerseRightClick component handles right-click/context menu

// Custom verse click handler
function handleVerseClick(verseNumber, event) {
  const { updateLastVerseClicked } = useBibleContext();

  // Track the click
  updateLastVerseClicked(currentUserId, verseNumber);

  // Highlight the verse
  event.target.classList.add("highlighted");

  // Open verse toolbar
  showVerseToolbar(verseNumber);
}
```

---

### Pattern 8: Using BibleDataManager

For imperative data management:

```tsx
import { BibleDataManager } from "./hooks/bibleDataManager";

function MyComponent() {
  const [manager] = useState(() => new BibleDataManager());
  const [chapterData, setChapterData] = useState(null);

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribe = manager.subscribe((state) => {
      setChapterData(state.data);
    });

    // Load initial data
    manager.open("GEN", 1, "BSB");

    return () => {
      unsubscribe();
      manager.dispose();
    };
  }, [manager]);

  return (
    <div>
      {chapterData && (
        <div>
          <h2>
            {chapterData.book} {chapterData.chapter}
          </h2>
          {chapterData.verses.map((verse) => (
            <p key={verse.number}>{verse.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Pattern 9: Popup Menus and Context Menus

Create context menus:

```tsx
const { openPopupSettings, closePopupSettings } = useSideBarContext();

function handleRightClick(event) {
  event.preventDefault();

  openPopupSettings({
    x: event.clientX,
    y: event.clientY,
    content: (
      <div className="context-menu">
        <button
          onClick={() => {
            handleAction1();
            closePopupSettings();
          }}
        >
          Action 1
        </button>
        <button
          onClick={() => {
            handleAction2();
            closePopupSettings();
          }}
        >
          Action 2
        </button>
      </div>
    ),
  });
}

return <div onContextMenu={handleRightClick}>Right-click me</div>;
```

---

### Pattern 10: Split Screen Layouts

Use the DivSpliter component:

```tsx
import { DivSpliter } from "./hooks/screenDevider";

function MyLayout() {
  return (
    <DivSpliter
      split="vertical"
      initialWidth={800}
      containerWidth={1600}
      onResize={(newWidth) => console.log("Resized to:", newWidth)}
      otherTab={<RightPanel />}
    >
      <LeftPanel />
    </DivSpliter>
  );
}
```

---

## User Activity Tracking

The user activity tracking system allows real-time collaboration and presence awareness.

### Data Structure

```tsx
interface UserActivity {
  userId: string;
  userName: string;
  userAvatar?: string;

  // Current location
  currentBook: string;
  currentBookId: string;
  currentChapter: number;
  currentTranslation: string;

  // Interaction
  lastVerseClicked: number;
  highlightedVerses: number[];

  // Session info
  sessionInfo: {
    isHost: boolean;
    isFollower: boolean;
    followingUserId?: string;
  };

  // Timestamps
  lastActivity: number;
  sessionStartTime: number;
}
```

### API Functions

All functions are available through `useBibleContext()`:

```tsx
const {
  userActivities, // Current state of all users
  updateUserActivity, // Generic update
  updateCurrentBookChapter, // Update navigation
  updateLastVerseClicked, // Update verse interaction
  updateHighlightedVerses, // Update verse highlights
  updateSessionInfo, // Update session state
  getUserActivity, // Get specific user
  getAllUserActivities, // Get all users
  getUsersByBook, // Filter by location
  clearUserActivity, // Clear specific user
  clearAllUserActivities, // Clear all
} = useBibleContext();
```

### Complete Example

```tsx
import { useBibleContext } from "./hooks/bibleVariables";

function MultiUserBibleReader() {
  const {
    userActivities,
    updateCurrentBookChapter,
    updateLastVerseClicked,
    updateHighlightedVerses,
    getUsersByBook,
  } = useBibleContext();

  const currentUserId = "user-123";
  const [currentBook, setCurrentBook] = useState("Genesis");
  const [currentChapter, setCurrentChapter] = useState(1);

  // Update when navigating
  const handleNavigate = (book, bookId, chapter) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);

    updateCurrentBookChapter(currentUserId, book, bookId, chapter, "BSB");
  };

  // Update when clicking verse
  const handleVerseClick = (verseNumber) => {
    updateLastVerseClicked(currentUserId, verseNumber);
  };

  // Update when highlighting verses
  const handleHighlight = (verses) => {
    updateHighlightedVerses(currentUserId, verses);
  };

  // Get users in same chapter
  const otherUsers = getUsersByBook(currentBook, currentChapter).filter(
    (user) => user.userId !== currentUserId
  );

  return (
    <div>
      <h2>
        {currentBook} {currentChapter}
      </h2>

      {/* Show other users reading same chapter */}
      <div className="user-presence">
        <h3>Also reading this chapter:</h3>
        {otherUsers.map((user) => (
          <div key={user.userId} className="user-indicator">
            <img src={user.userAvatar} alt={user.userName} />
            <span>{user.userName}</span>
            {user.lastVerseClicked && (
              <span>at verse {user.lastVerseClicked}</span>
            )}
          </div>
        ))}
      </div>

      {/* Bible content with verse highlighting */}
      <div className="verses">{/* Verses rendered here with highlights */}</div>
    </div>
  );
}
```

### Session Management

Track host/follower relationships:

```tsx
const { updateSessionInfo, getUserActivity } = useBibleContext();

// Set user as host
updateSessionInfo(userId, {
  isHost: true,
  isFollower: false,
});

// Set user as follower
updateSessionInfo(followerId, {
  isHost: false,
  isFollower: true,
  followingUserId: hostUserId,
});

// Get host's activity
const hostActivity = getUserActivity(hostUserId);
if (hostActivity) {
  // Follow host's navigation
  handleNavigate(
    hostActivity.currentBook,
    hostActivity.currentBookId,
    hostActivity.currentChapter
  );
}
```

### Clearing Activity

```tsx
// Clear specific user (when they leave)
clearUserActivity("user-123");

// Clear all users (e.g., on app restart)
clearAllUserActivities();
```

---

## Package Structure

### Main Application: seed-bible

**Location:** `packages/seed-bible/`

```
seed-bible/
├── app/
│   ├── components/       # React components
│   ├── hooks/           # Custom hooks (PRIMARY API)
│   ├── main/            # App entry
│   ├── pages/           # Page components
│   ├── emitter/         # Event emission
│   ├── error/           # Error handling
│   ├── packager/        # Package management
│   ├── reciver/         # Data streaming
│   ├── styles/          # Styling
│   └── assets/          # Static assets
├── components/          # Reusable components
├── db/                  # Database/annotations
│   └── annotations/     # Reading history
├── managers/            # State managers
├── experience/          # UX features
├── shortcuts/           # Keyboard shortcuts
├── aiApps/             # AI integration
├── baseElements/        # Base elements
├── ab/                  # A/B testing
├── webhook/             # Webhooks
├── iframe/              # IFrame support
└── uploader/            # File uploads
```

### Extension Packages

Each extension follows this structure:

```
PackageName/
├── extension.json       # Metadata & config
├── index.tsx           # Main entry point
├── components/         # Package components
├── utils/              # Utilities
├── assets/             # Assets
└── README.md           # Documentation
```

---

## Best Practices

### 1. Always Use Hooks for State

**Bad:**

```tsx
// Don't access state directly
const tools = window.someGlobalState.tools;
```

**Good:**

```tsx
// Use hooks
const { tools } = useBibleContext();
```

---

### 2. Use Global Functions for Cross-Package Communication

**Good:**

```tsx
// From any package, add a tool
globalThis.AddTool({
  icon: "my_icon",
  label: "My Tool",
  onClick: () => {},
});
```

---

### 3. Clean Up Resources

**Good:**

```tsx
useEffect(() => {
  const manager = new BibleDataManager();

  const unsubscribe = manager.subscribe((state) => {
    console.log(state);
  });

  return () => {
    unsubscribe();
    manager.dispose();
  };
}, []);
```

---

### 4. Use TypeScript Types

**Good:**

```tsx
interface MyToolConfig {
  icon: string;
  label: string;
  onClick: () => void;
}

const tool: MyToolConfig = {
  icon: "bookmark",
  label: "Bookmarks",
  onClick: handleClick,
};
```

---

### 5. Handle Mobile Responsively

**Good:**

```tsx
const { isMobile } = useSideBarContext();

return (
  <div className={isMobile ? "mobile-layout" : "desktop-layout"}>
    {/* Content */}
  </div>
);
```

---

### 6. Track User Activity for Collaboration

**Good:**

```tsx
// Update activity when users navigate
const handleNavigation = (book, chapter) => {
  updateCurrentBookChapter(currentUserId, book, bookId, chapter, translation);
};
```

---

### 7. Use Unique IDs

**Good:**

```tsx
const uniqueId = `my-item-${Date.now()}-${Math.random()}`;
```

---

## Common Recipes

### Recipe 1: Add a Custom Toolbar Button

```tsx
import { useBibleContext } from "./hooks/bibleVariables";

function MyExtension() {
  const { addTool } = useBibleContext();

  useEffect(() => {
    addTool(
      {
        icon: "bookmark_add",
        label: "Add Bookmark",
        hasToggle: false,
        onClick: () => {
          // Handle bookmark creation
          console.log("Creating bookmark...");
        },
        onHold: async () => {
          // Handle long press (e.g., show bookmark list)
          console.log("Show all bookmarks");
        },
        showInPageToolbar: true,
      },
      { to: "tools" }
    );
  }, [addTool]);

  return null;
}
```

---

### Recipe 2: Create a Floating Note-Taking App

```tsx
import { useMouseMove } from "./hooks/mouseMove";
import { TextEditor } from "./components/editor";

function NoteTakingApp() {
  const { AddFloatingApp } = useMouseMove();
  const [notes, setNotes] = useState("");

  const openNoteApp = () => {
    AddFloatingApp({
      id: `notes-${Date.now()}`,
      App: (
        <div style={{ padding: "1rem" }}>
          <h3>My Notes</h3>
          <TextEditor
            content={notes}
            onChange={setNotes}
            placeholder="Take notes here..."
          />
        </div>
      ),
      to: "floating",
      minWidth: "400px",
      minHeight: "300px",
      title: "Notes",
      icon: "note",
      closable: true,
      resizable: true,
      draggable: true,
    });
  };

  return <button onClick={openNoteApp}>Open Notes</button>;
}
```

---

### Recipe 3: Track Reading Progress

```tsx
import { useBibleContext, useBibleData } from "./hooks";
import { saveUserReadingHistory } from "./db/annotations";

function ReadingTracker() {
  const { updateCurrentBookChapter } = useBibleContext();
  const { data } = useBibleData();

  const userId = "current-user-id";

  useEffect(() => {
    if (data) {
      // Update user activity
      updateCurrentBookChapter(
        userId,
        data.book,
        data.bookId,
        data.chapter,
        data.translation
      );

      // Save to database
      saveUserReadingHistory(data.bookId, data.chapter);
    }
  }, [data]);

  return null;
}
```

---

### Recipe 4: Create a Custom Context Menu

```tsx
import { useSideBarContext } from "./hooks/sideBar";

function VerseWithContextMenu({ verse }) {
  const { openPopupSettings, closePopupSettings } = useSideBarContext();

  const handleContextMenu = (event) => {
    event.preventDefault();

    openPopupSettings({
      x: event.clientX,
      y: event.clientY,
      content: (
        <div className="context-menu">
          <button
            onClick={() => {
              console.log("Highlight verse:", verse.number);
              closePopupSettings();
            }}
          >
            Highlight
          </button>
          <button
            onClick={() => {
              console.log("Copy verse:", verse.number);
              closePopupSettings();
            }}
          >
            Copy
          </button>
          <button
            onClick={() => {
              console.log("Add note to verse:", verse.number);
              closePopupSettings();
            }}
          >
            Add Note
          </button>
        </div>
      ),
    });
  };

  return (
    <p onContextMenu={handleContextMenu}>
      <span className="verse-number">{verse.number}</span>
      {verse.text}
    </p>
  );
}
```

---

### Recipe 5: Implement Tab Syncing Across Spaces

```tsx
import { useTabsContext } from "./hooks/tabs";

function TabSyncManager() {
  const { tabs, activeSpace, getAllTabsInSpace, addTab } = useTabsContext();

  // Sync all tabs to a new space
  const syncTabsToSpace = (targetSpaceId) => {
    const currentTabs = getAllTabsInSpace(activeSpace);

    currentTabs.forEach((tab) => {
      // Create copy of tab in target space
      addTab({
        ...tab,
        id: `${tab.id}-synced-${Date.now()}`,
      });
    });
  };

  return (
    <button onClick={() => syncTabsToSpace("target-space-id")}>
      Sync Tabs
    </button>
  );
}
```

---

### Recipe 6: Build a Verse Comparison Tool

```tsx
import { useBibleContext, useBibleData } from "./hooks";

function VerseComparison() {
  const { setScreens } = useBibleContext();
  const { open, changeTranslation } = useBibleData();

  const compareTranslations = (bookId, chapter, translations) => {
    // Set screens to match number of translations
    setScreens(translations.length);

    // Open same chapter in different translations
    translations.forEach((translation, index) => {
      // Logic to open different translation in each screen
      // This would require screen-specific API
      console.log(`Screen ${index + 1}: ${translation}`);
    });
  };

  return (
    <button
      onClick={() => compareTranslations("GEN", 1, ["BSB", "KJV", "NIV"])}
    >
      Compare Genesis 1 (BSB, KJV, NIV)
    </button>
  );
}
```

---

## Debugging Tips

### 1. Inspect Global State

```tsx
// In browser console
console.log("Tools:", globalThis.tools);
console.log("Canvas Mode:", globalThis.CanvasMode);
console.log(
  "All global functions:",
  Object.keys(globalThis).filter((k) => k[0] === k[0].toUpperCase())
);
```

### 2. Monitor User Activities

```tsx
const { userActivities } = useBibleContext();

useEffect(() => {
  console.log("User activities updated:", userActivities);
}, [userActivities]);
```

### 3. Track Context Changes

```tsx
const context = useBibleContext();

useEffect(() => {
  console.log("Bible context changed:", context);
}, [context]);
```

### 4. Verify Tool Registration

```tsx
const { tools, isToolActive } = useBibleContext();

console.log(
  "Registered tools:",
  tools.map((t) => t.label)
);
console.log("My tool active:", isToolActive("My Tool Label"));
```

---

## Additional Resources

### Key Files Reference

- **Main Entry:** [packages/seed-bible/app/main/main.tsx](packages/seed-bible/app/main/main.tsx)
- **Hook Definitions:** [packages/seed-bible/app/hooks/](packages/seed-bible/app/hooks/)
- **Global Functions:** [packages/seed-bible/app/components/global_functions.tsx](packages/seed-bible/app/components/global_functions.tsx)
- **Component Library:** [packages/seed-bible/app/components/](packages/seed-bible/app/components/)
- **Types:** [packages/seed-bible/app/components/types.tsx](packages/seed-bible/app/components/types.tsx)
- **User Activity Usage:** [packages/seed-bible/USER_ACTIVITIES_USAGE.md](packages/seed-bible/USER_ACTIVITIES_USAGE.md)

### Package Examples

- **Bible Stack:** [packages/BibleStack/](packages/BibleStack/)
- **Canvas:** [packages/Canvas/](packages/Canvas/)
- **Scripture Map 2D:** [packages/ScriptureMap2D/](packages/ScriptureMap2D/)

---

## AI Guardrails and Epistemic Humility

When developing AI features for Seed Bible, follow these guidelines to maintain educational integrity and epistemic humility.

### AI Assistant Principles

AI in Seed Bible should:
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- **Assist research, not provide answers** - AI suggests questions, enables discovery, and provides historical background
- **Emphasize education and epistemic humility** - AI should not respond as an authoritative interpreter
- **Redirect toward multiple perspectives** - Point users to denominational perspectives, scholarly debates, and historical context
- **Enable user control** - Users control which AI agents participate in their sessions

### What AI Should NOT Do

- Claim interpretive authority on Scripture
- Provide definitive theological answers
- Replace human study and reflection
- Hide denominational or theological perspectives behind "neutral" responses

### Developer Guidelines for AI Features

When building AI functionality:
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

1. Design AI as a **research assistant**, not a teacher
2. Always present multiple perspectives when relevant
3. Make it clear when AI is providing suggestions vs. facts
4. Allow users to choose which AI agents to include in their sessions
5. Remember that AI agents participate as peers in sessions—they observe and respond to user actions

**Example good AI behavior:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- "Here are three different interpretations of this passage from Baptist, Catholic, and Orthodox traditions..."
- "Scholars debate whether this word means X or Y. Would you like to explore the arguments?"

**Example bad AI behavior:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- "This passage means X."
- "The correct interpretation is Y."

---

## Data Philosophy

AO Lab's approach to user data reflects a commitment to user ownership and portability.

### Core Principles

1. **Users own their data**
   - All user data belongs to the user, not AO Lab
   - Users can export their data at any time

2. **No walled gardens**
   - Open data formats (.aux files are portable JSON)
   - User-owned records are fully portable
   - Extensions can be distributed independently

3. **True deletion**
   - Deleting data deletes it permanently
   - AO Lab does not retain hidden shadow copies
   - Users control their data lifecycle

4. **Portability and independence**
   - If AO Lab disappeared tomorrow, every .aux file would remain fully functional
   - Records can be migrated to any CasualOS deployment
   - No vendor lock-in

### Developer Implications

When building features:
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Design with data portability in mind
- Use Records API for persistent data (survives session expiration)
- Respect user deletion requests completely
- Document data storage locations and formats
- Enable export functionality for user data

---

## External Services

Seed Bible integrates with external services for specific functionality.

### Free Use Bible API

Seed Bible uses the **Free Use Bible API** for Scripture content.

- **Base URL:** [bible.helloao.org](https://bible.helloao.org)
- **Purpose:** Provides Bible text in multiple translations
- **Usage:** The `useBibleData` hook fetches Scripture from this API
- **Caching:** Scripture data is cached per-tab for performance

**Developer notes:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- Scripture data comes from bible.helloao.org, not from Records
- Translation availability depends on the API
- The API is maintained by AO Lab as a public service

### PostHog Analytics

Seed Bible uses **PostHog** for product analytics.

- **Purpose:** Anonymized usage metrics for product improvement
- **Data collection:** We do NOT track individual users or sell data
- **What we track:** Feature usage, performance metrics, anonymized behavior patterns
- **Privacy:** All tracking is anonymized and aggregated

**Developer notes:**
<<<<<<< HEAD

=======

> > > > > > > 50729483ec846e76589cc7c9c5086bdc6a7cbb8b

- PostHog events should not contain PII (personally identifiable information)
- Use PostHog for feature usage analytics, not user surveillance
- Follow AO Lab's privacy guidelines when adding analytics events

---

## Contributing

When creating new features or extensions:

1. **Follow existing patterns** - Study how existing packages work
2. **Use TypeScript** - Type safety helps prevent bugs
3. **Document your code** - Add comments and JSDoc
4. **Test multi-user scenarios** - Ensure collaboration features work
5. **Handle mobile** - Test on mobile devices
6. **Clean up resources** - Properly dispose of managers and subscriptions
7. **Update this documentation** - Keep docs in sync with code
8. **Follow AI guardrails** - Ensure AI features maintain epistemic humility
9. **Respect data philosophy** - Build with portability and user ownership in mind

---

## Support

For questions, issues, or feature requests:

- Check the codebase examples in `packages/`
- Review [USER_ACTIVITIES_USAGE.md](packages/seed-bible/USER_ACTIVITIES_USAGE.md) for collaboration features
- Inspect existing extensions for patterns

---

**Last Updated:** 2025-12-15
**Version:** 2.0.0
**Changes:** Added Runtime Foundation section with CasualOS architecture, session lifecycle, Records API, identity hierarchy, anonymous user handling, AI guardrails, data philosophy, and external services documentation.
