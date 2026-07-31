# Seed Bible Architecture Deep Dive

## Overview

This document provides an in-depth technical exploration of Seed Bible's architecture, design patterns, and implementation details. It is intended for developers who want to understand how the system works internally, contribute to core development, or build advanced integrations.

**Prerequisites:**

- Read [DEVELOPER_DOCUMENTATION.md](DEVELOPER_DOCUMENTATION.md) for ecosystem context
- Complete [GETTING_STARTED.md](GETTING_STARTED.md) for development setup
- Familiarity with [EXTENSION_DEVELOPMENT_GUIDE.md](EXTENSION_DEVELOPMENT_GUIDE.md)

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Runtime Model](#runtime-model)
3. [State Management](#state-management)
4. [Data Flow](#data-flow)
5. [Extension System](#extension-system)
6. [Collaborative Architecture](#collaborative-architecture)
7. [Canvas and Land Integration](#canvas-and-land-integration)
8. [Build System](#build-system)
9. [Performance Considerations](#performance-considerations)
10. [Security Model](#security-model)

---

## System Architecture

### Architectural Layers

Seed Bible is built as a layered system where each layer has specific responsibilities:

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERFACE                       │
│  (React Components, Toolbar, Panels, Sidebar)           │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│  (Hooks API, State Management, Extension Manager)       │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                         │
│  (Bible Data, Canvas, Land, AI, Records)                │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                   CASUALOS RUNTIME                       │
│  (Bot System, Real-time Sync, Permissions, Shouts)      │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                    BROWSER APIs                          │
│  (WebGL, WebRTC, IndexedDB, Service Workers)           │
└─────────────────────────────────────────────────────────┘
```

### Component Organization

```
seed-bible/
├── app/
│   ├── main/                    # Application entry points
│   │   ├── index.tsx           # Primary entry
│   │   └── bootstrap.tsx       # Initialization logic
│   │
│   ├── hooks/                   # React hooks (PRIMARY API)
│   │   ├── bibleVariables.tsx  # Central state management
│   │   ├── tabs.tsx            # Workspace management
│   │   ├── sideBar.tsx         # UI state
│   │   ├── mouseMove.tsx       # Mouse tracking
│   │   ├── bibleData.tsx       # Scripture data
│   │   └── bibleDataManager.tsx # Data utilities
│   │
│   ├── components/              # UI components
│   │   ├── layout.tsx          # App shell
│   │   ├── thePage.tsx         # Main page component
│   │   ├── editor.tsx          # Scripture editor/viewer
│   │   ├── toolbar.tsx         # Toolbar component
│   │   ├── sideBar.tsx         # Sidebar component
│   │   └── settings.tsx        # Settings panel
│   │
│   ├── managers/                # Business logic
│   │   ├── dataManager.ts      # Data management
│   │   ├── extensionManager.ts # Extension lifecycle
│   │   └── syncManager.ts      # Real-time sync
│   │
│   ├── db/                      # Database/annotations
│   │   ├── schema.ts           # Data schema
│   │   ├── queries.ts          # Query functions
│   │   └── migrations.ts       # Schema migrations
│   │
│   ├── experience/              # UX features
│   │   ├── navigation.ts       # Navigation logic
│   │   ├── shortcuts.ts        # Keyboard shortcuts
│   │   └── gestures.ts         # Touch gestures
│   │
│   ├── aiApps/                  # AI features
│   │   ├── chatbot.tsx         # Conversational AI
│   │   ├── voice.tsx           # Voice interface
│   │   └── generation.tsx      # Content generation
│   │
│   ├── styles/                  # Styling
│   │   ├── global.css          # Global styles
│   │   ├── themes/             # Theme definitions
│   │   └── utils.css           # Utility classes
│   │
│   ├── emitter/                 # Event system
│   │   └── events.ts           # Event definitions
│   │
│   └── reciver/                 # Data streaming
│       └── stream.ts           # Stream handlers
```

### Design Principles

#### 1. Hooks-First API

All state access flows through React hooks:

```tsx
// ✅ Correct: Use hooks
const { Open, tools, updateCurrentBookChapter } = useBibleContext();

// ❌ Wrong: Direct state access
const state = window.__seedBibleState__; // Don't do this
```

**Why:** Hooks provide:

- Type safety
- Automatic re-renders
- Cleanup on unmount
- Consistent API surface

#### 2. Unidirectional Data Flow

Data flows in one direction:

```
User Action → Hook → Manager → Service → State Update → Re-render
```

```tsx
// Example flow:
// 1. User clicks "Next Chapter"
<button onClick={() => OpenNextChapter()}>Next</button>;

// 2. Hook calls manager
const OpenNextChapter = () => {
  navigationManager.goToNextChapter();
};

// 3. Manager updates service
navigationManager.goToNextChapter = () => {
  const next = calculateNextChapter(currentBookId, currentChapter);
  bibleDataService.loadChapter(next.bookId, next.chapter);
};

// 4. Service updates state
bibleDataService.loadChapter = async (bookId, chapter) => {
  const data = await fetchChapter(bookId, chapter);
  setState({ currentBookId: bookId, currentChapter: chapter, data });
};

// 5. Components re-render automatically
```

#### 3. Component Composition

Build complex UIs from simple, reusable components:

```tsx
// Atomic components
const VerseText = ({ content }) => <span>{content}</span>;
const VerseNumber = ({ number }) => <strong>{number}</strong>;

// Composed component
const Verse = ({ verse }) => (
  <div>
    <VerseNumber number={verse.verse} />
    <VerseText content={verse.content} />
  </div>
);

// Page-level component
const Chapter = ({ data }) => (
  <div>
    {data.verseContent.map((verse) => (
      <Verse key={verse.verse} verse={verse} />
    ))}
  </div>
);
```

#### 4. Extension Isolation

Extensions operate independently but share common state:

```tsx
// Extension A
function ExtensionA() {
  const { tools } = useBibleContext();
  // Can read tools but modifications go through hooks
}

// Extension B
function ExtensionB() {
  const { tools } = useBibleContext();
  // Sees same tools array, React handles synchronization
}
```

#### 5. Progressive Enhancement

Core functionality works without extensions:

```tsx
// Core: Basic Bible reading
<BibleReader />

// + Extension: Commentary
<BibleReader />
<CommentaryExtension />

// + Extension: 3D Visualization
<BibleReader />
<CommentaryExtension />
<CanvasExtension />
```

---

## Runtime Model

### Instance (Inst) Lifecycle

```
1. URL Load
   ↓
2. CasualOS Initialization
   ↓
3. BIOS Configuration
   ↓
4. App Bundle Loading (.aux file)
   ↓
5. Bot Creation
   ↓
6. React App Bootstrap
   ↓
7. Context Providers Mount
   ↓
8. Extension Loading
   ↓
9. Session Active
   ↓
10. Session Expiration (default: 12 hours)
    ↓
11. Cleanup & Deletion
```

### App Bundle Compilation

When a Seed Bible Session starts:

```typescript
// 1. URL specifies app bundle
// https://ao.bot/?ab=SeedBible

// 2. CasualOS fetches .aux file
const auxFile = await fetch('/bundles/SeedBible.aux');
const bundle = await auxFile.json();

// 3. Bots are created from bundle
bundle.state.forEach(bot => {
  createBot(bot.id, bot.tags);
});

// 4. Main bot tag executes
const mainBot = getBot(bundle.mainBotTag);
eval(mainBot.tags.code);  // Runs React app

// 5. React app renders
ReactDOM.render(<SeedBibleApp />, document.getElementById('root'));
```

### BIOS Configuration

BIOS determines instance capabilities:

```typescript
// Static (non-collaborative)
// https://ao.bot/?ab=SeedBible&bios=static

const bios = {
  collaborative: false,
  persistSession: false,
  allowExtensions: true,
  aiEnabled: false,
};

// Free (collaborative)
// https://ao.bot/?ab=SeedBible&bios=free

const bios = {
  collaborative: true,
  persistSession: true,
  allowExtensions: true,
  aiEnabled: true,
};
```

### Bootstrap Sequence

```tsx
// 1. main/index.tsx - Entry point
import { bootstrap } from "./bootstrap";

bootstrap();

// 2. bootstrap.tsx - Initialize app
export function bootstrap() {
  // A. Initialize CasualOS integration
  initializeCasualOS();

  // B. Set up global functions
  setupGlobalFunctions();

  // C. Load saved state (if any)
  loadPersistedState();

  // D. Render React app
  const rootElement = document.getElementById("root");
  const { createRoot } = os.appHooks;
  const root = createRoot(rootElement);

  root.render(
    <BibleVariablesProvider>
      <TabsProvider>
        <SideBarProvider>
          <MouseMoveProvider>
            <App />
          </MouseMoveProvider>
        </SideBarProvider>
      </TabsProvider>
    </BibleVariablesProvider>
  );
}

// 3. App.tsx - Main application
function App() {
  return (
    <Layout>
      <Toolbar />
      <MainContent />
      <Sidebar />
    </Layout>
  );
}
```

---

## State Management

### Context Architecture

Seed Bible uses nested React Context for state management:

```tsx
// 1. BibleVariablesContext - Root context
const BibleVariablesContext = createContext<BibleContextValue>(null);

export function BibleVariablesProvider({ children }) {
  const [state, setState] = useState<BibleState>({
    screens: 1,
    panelMode: true,
    canvasMode: false,
    mapMode: false,
    tools: [],
    currentBookId: 1,
    currentChapter: 1,
    currentTranslation: "ESV",
    userActivities: [],
    elements: new Map(),
    isDragging: false,
  });

  // Hook functions
  const contextValue = useMemo(
    () => ({
      ...state,
      setScreens: (count) => setState((s) => ({ ...s, screens: count })),
      addTool: (tool) => setState((s) => ({ ...s, tools: [...s.tools, tool] })),
      // ... other functions
    }),
    [state]
  );

  return (
    <BibleVariablesContext.Provider value={contextValue}>
      {children}
    </BibleVariablesContext.Provider>
  );
}

// 2. TabsContext - Nested context
export function TabsProvider({ children }) {
  const bibleContext = useBibleContext(); // Access parent context
  const [tabState, setTabState] = useState<TabState>({
    spaces: [],
    activeSpace: null,
    tabs: [],
    activeTab: null,
    folders: [],
  });

  // ... tab management logic

  return (
    <TabsContext.Provider value={tabContextValue}>
      {children}
    </TabsContext.Provider>
  );
}
```

### State Persistence

```typescript
// Save state to CasualOS records
async function persistState(state: BibleState) {
  await os.setData("seedBible.state", JSON.stringify(state), {
    markers: ["account"], // Scoped to user's account
  });
}

// Load state on bootstrap
async function loadPersistedState(): Promise<BibleState | null> {
  const saved = await os.getData("seedBible.state");
  return saved ? JSON.parse(saved) : null;
}

// Auto-save on state changes (debounced)
useEffect(() => {
  const timeoutId = setTimeout(() => {
    persistState(state);
  }, 1000); // Save 1 second after last change

  return () => clearTimeout(timeoutId);
}, [state]);
```

### State Synchronization (Collaborative)

```typescript
// In collaborative sessions, state syncs via CasualOS shouts
function BibleVariablesProvider({ children }) {
  const [state, setState] = useState<BibleState>(initialState);

  // Broadcast state changes
  useEffect(() => {
    os.shout("state.update", {
      userId: os.getUserId(),
      state: {
        currentBookId: state.currentBookId,
        currentChapter: state.currentChapter,
        userActivity: state.userActivities.find(
          (a) => a.userId === os.getUserId()
        ),
      },
    });
  }, [state.currentBookId, state.currentChapter]);

  // Listen for other users' state changes
  useEffect(() => {
    const unsubscribe = os.onShout("state.update", (event) => {
      if (event.arg.userId !== os.getUserId()) {
        // Update userActivities with remote user's state
        setState((s) => ({
          ...s,
          userActivities: updateUserActivity(s.userActivities, event.arg.state),
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // ... rest of provider
}
```

---

## Data Flow

### Bible Data Loading

```
User Action → Hook → Manager → Cache Check → API Call → State Update
                                    ↓
                              Cache Hit: Return
                                    ↓
                              Cache Miss: Fetch
```

**Implementation:**

```typescript
// 1. User navigates to chapter
const { Open } = useBibleContext();
Open(43, 3, 'ESV');  // John 3, ESV

// 2. Hook calls manager
function useBibleContext() {
  const Open = (bookId: number, chapter: number, translation?: string) => {
    bibleDataManager.loadChapter(bookId, chapter, translation);
  };

  return { Open, /* ... */ };
}

// 3. Manager checks cache
class BibleDataManager {
  private cache: Map<string, BibleChapterData> = new Map();

  async loadChapter(bookId: number, chapter: number, translation: string) {
    const cacheKey = `${bookId}-${chapter}-${translation}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      this.setState({ data: this.cache.get(cacheKey), loading: false });
      return;
    }

    // Fetch from API
    this.setState({ loading: true });
    try {
      const data = await this.fetchFromAPI(bookId, chapter, translation);
      this.cache.set(cacheKey, data);
      this.setState({ data, loading: false, error: null });
    } catch (error) {
      this.setState({ loading: false, error });
    }
  }

  private async fetchFromAPI(bookId: number, chapter: number, translation: string) {
    const response = await fetch(
      `https://vmfnri.helloao.org/api/verses?book=${bookId}&chapter=${chapter}&translation=${translation}`
    );
    return response.json();
  }
}

// 4. State updates, components re-render
function ChapterView() {
  const { data, loading } = useBibleData();

  if (loading) return <Spinner />;
  return <Chapter data={data} />;  // Renders with new data
}
```

### Event Propagation

```
Extension A → os.shout() → CasualOS → Extension B's os.onShout()
```

**Example:**

```tsx
// Extension A: Verse Highlighter
function VerseHighlighter() {
  const handleHighlight = (verseId: string) => {
    // Emit event
    os.shout("verse.highlighted", { verseId, color: "#ffeb3b" });
  };

  return (
    <div onClick={() => handleHighlight("John.3.16")}>Highlight John 3:16</div>
  );
}

// Extension B: 3D Canvas
function CanvasExtension() {
  useEffect(() => {
    // Listen for highlighting events
    const unsubscribe = os.onShout("verse.highlighted", (event) => {
      const { verseId, color } = event.arg;

      // Find 3D object associated with verse
      const object = find3DObjectByVerseId(verseId);
      if (object) {
        // Highlight in 3D space
        set3DObjectColor(object, color);
      }
    });

    return () => unsubscribe();
  }, []);

  return <Canvas3D />;
}

// Extension C: Commentary
function CommentaryExtension() {
  useEffect(() => {
    // Also listens for same event
    const unsubscribe = os.onShout("verse.highlighted", (event) => {
      const { verseId } = event.arg;

      // Load commentary for highlighted verse
      loadCommentary(verseId);
    });

    return () => unsubscribe();
  }, []);

  return <CommentaryPanel />;
}
```

### User Activity Sync

```
Local Action → Update Local State → Broadcast via Shout → Remote State Update
```

```typescript
// Update local user activity
function updateCurrentBookChapter(
  bookId: number,
  chapter: number,
  verse?: number
) {
  const userId = os.getUserId();
  const userName = os.getUserName();

  // Update local state
  setState((s) => ({
    ...s,
    userActivities: s.userActivities.map((activity) =>
      activity.userId === userId
        ? { ...activity, bookId, chapter, verse, timestamp: Date.now() }
        : activity
    ),
  }));

  // Broadcast to other users
  os.shout("user.activityUpdate", {
    userId,
    userName,
    bookId,
    chapter,
    verse,
    timestamp: Date.now(),
  });
}

// Remote users listen and update their state
useEffect(() => {
  const unsubscribe = os.onShout("user.activityUpdate", (event) => {
    const { userId, userName, bookId, chapter, verse, timestamp } = event.arg;

    setState((s) => {
      const existing = s.userActivities.find((a) => a.userId === userId);

      if (existing) {
        // Update existing user
        return {
          ...s,
          userActivities: s.userActivities.map((a) =>
            a.userId === userId
              ? { ...a, bookId, chapter, verse, timestamp }
              : a
          ),
        };
      } else {
        // Add new user
        return {
          ...s,
          userActivities: [
            ...s.userActivities,
            { userId, userName, bookId, chapter, verse, timestamp },
          ],
        };
      }
    });
  });

  return () => unsubscribe();
}, []);
```

---

## Extension System

### Extension Loading

```
Extension .aux File → Bot Creation → Code Execution → Component Registration
```

**Detailed flow:**

```typescript
// 1. Extension is requested (drag-drop, URL parameter, or programmatic)
async function loadExtension(extensionId: string) {
  // 2. Fetch .aux file
  const response = await fetch(`/extensions/${extensionId}.aux`);
  const auxData = await response.json();

  // 3. Create bots from .aux file
  for (const [botId, botData] of Object.entries(auxData.state)) {
    createBot(botId, botData.tags);
  }

  // 4. Execute main bot code
  const mainBot = getBot(auxData.mainBotTag);
  if (mainBot?.tags.code) {
    // Code is executed in CasualOS context
    eval(mainBot.tags.code);
  }

  // 5. Register global toggle function (if toolbar config exists)
  const metadata = JSON.parse(mainBot.tags.metadata || "{}");
  if (metadata.configEditor?.toolbarConfig) {
    const toggleFn = metadata.configEditor.toolbarConfig.run;
    // Global function is now available: globalThis[toggleFn]
  }
}
```

### Extension Isolation

Extensions operate in a shared JavaScript context but maintain isolation through:

#### 1. Namespace Conventions

```typescript
// Extension A
const extensionA = {
  state: {},
  init() {
    /* ... */
  },
  cleanup() {
    /* ... */
  },
};

// Extension B
const extensionB = {
  state: {},
  init() {
    /* ... */
  },
  cleanup() {
    /* ... */
  },
};

// No collision because of namespace objects
```

#### 2. Bot Tag Namespacing

```typescript
// Extension A's bots
"extensionA.main";
"extensionA.helper";
"extensionA.config";

// Extension B's bots
"extensionB.main";
"extensionB.helper";
"extensionB.config";

// No collision because of tag prefixes
```

#### 3. Event Namespacing

```typescript
// Extension A
os.shout("extensionA.dataChanged", data);

// Extension B
os.shout("extensionB.dataChanged", data);

// Different event names prevent cross-talk
```

### Dependency Resolution

```typescript
// extension.json
{
  "id": 1234567890123,
  "dependencies": [
    { "depId": 1111111111111, "name": "Canvas", "type": "package" },
    { "depId": 2222222222222, "name": "Object Pooler", "type": "package" }
  ]
}

// Extension manager resolves dependencies
async function loadExtensionWithDependencies(extensionId: string) {
  const extension = await loadExtensionMetadata(extensionId);

  // Load dependencies first (recursive)
  for (const dep of extension.dependencies) {
    if (!isExtensionLoaded(dep.depId)) {
      await loadExtensionWithDependencies(dep.depId);
    }
  }

  // Load main extension
  await loadExtension(extensionId);
}
```

### Extension Communication

Extensions communicate through:

#### 1. Shared State (Hooks)

```tsx
// Extension A modifies shared state
function ExtensionA() {
  const { addTool } = useBibleContext();

  addTool({ id: "extensionA" /* ... */ });
}

// Extension B reads shared state
function ExtensionB() {
  const { tools } = useBibleContext();

  const extensionATool = tools.find((t) => t.id === "extensionA");
  // Can check if Extension A is active
}
```

#### 2. Events (Shouts)

```tsx
// Extension A emits
os.shout("extensionA.action", { data: "value" });

// Extension B listens
os.onShout("extensionA.action", (event) => {
  console.log("Extension A did something:", event.arg);
});
```

#### 3. Bot Tags

```tsx
// Extension A stores data in bot
const bot = getBot("#extensionA.config");
bot.tags["sharedData"] = "value";

// Extension B reads from bot
const bot = getBot("#extensionA.config");
const data = bot.tags["sharedData"];
```

---

## Collaborative Architecture

### Real-Time Synchronization

CasualOS handles real-time sync at the bot level:

```
User A changes bot tag → CasualOS detects change → Broadcasts to all users
→ User B's bot updates → React components re-render
```

**Implementation detail:**

```typescript
// When a bot tag changes
function updateBotTag(botId: string, tagName: string, value: any) {
  const bot = getBot(botId);
  bot.tags[tagName] = value;

  // CasualOS automatically:
  // 1. Persists change to backend
  // 2. Broadcasts to all connected users
  // 3. Triggers tag change events
}

// Users listen for bot changes
os.onBotChanged((bot) => {
  // React state update
  setState((s) => updateWithBotData(s, bot));
});
```

### Shared Interaction State

```typescript
// Shared: Current passage
const { currentBookId, currentChapter, updateCurrentBookChapter } =
  useBibleContext();

// When one user navigates
updateCurrentBookChapter(43, 3);

// Other users see the activity
const { userActivities } = useBibleContext();
userActivities.forEach((activity) => {
  console.log(
    `${activity.userName} is reading ${activity.bookName} ${activity.chapter}`
  );
});
```

### Independent Visualization

```typescript
// Each user has their own Space configuration
const { activeSpace } = useTabsContext(); // User A: Space "Study"
// User B: Space "Reading"

// Spaces are stored per-account, not shared
await os.setData("spaces", JSON.stringify(spaces), {
  markers: ["account"], // Account-scoped, not shared
});
```

### Conflict Resolution

CasualOS uses Operational Transformation (OT) for conflict-free updates:

```typescript
// User A and User B edit the same bot tag simultaneously

// User A: Sets tag to "value A" at time T1
bot.tags["data"] = "value A";

// User B: Sets tag to "value B" at time T2 (before receiving A's update)
bot.tags["data"] = "value B";

// CasualOS resolves:
// - Uses timestamps and vector clocks
// - Applies deterministic merge strategy
// - Final value: Depends on resolution policy (last-write-wins, custom merge, etc.)
```

For most Seed Bible use cases, last-write-wins is sufficient. For collaborative text editing, custom merge strategies can be implemented.

---

## Canvas and Land Integration

### Canvas (gridPortal) Architecture

```
React Component → Canvas Manager → CasualOS gridPortal → Three.js → WebGL
```

**Implementation:**

```tsx
// 1. Canvas component
function CanvasExtension() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Initialize gridPortal
      initializeCanvas(canvasRef.current);
    }
  }, []);

  return <div ref={canvasRef} id="gridPortal" />;
}

// 2. Canvas manager
function initializeCanvas(element: HTMLElement) {
  // CasualOS creates Three.js scene
  const portal = os.registerPortal("grid", element);

  // Configure portal
  portal.setCameraPosition({ x: 0, y: 5, z: 10 });
  portal.setGridVisible(true);

  return portal;
}

// 3. Creating 3D objects
function create3DObject(position: Vector3, shape: string) {
  os.shout("createBot", {
    tags: {
      auxPosition: position,
      auxShape: shape,
      auxColor: "#ff0000",
      auxScale: { x: 1, y: 1, z: 1 },
    },
  });
}
```

### Land (mapPortal) Architecture

```
React Component → Land Manager → CasualOS mapPortal → ArcGIS JS API → Map Rendering
```

**Implementation:**

```tsx
// 1. Land component
function LandExtension() {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) {
      initializeMap(mapRef.current);
    }
  }, []);

  return <div ref={mapRef} id="mapPortal" />;
}

// 2. Land manager
function initializeMap(element: HTMLElement) {
  const portal = os.registerPortal("map", element);

  // Configure map
  portal.setCenter({ lat: 31.7683, lng: 35.2137 }); // Jerusalem
  portal.setZoom(10);
  portal.setBasemap("satellite");

  return portal;
}

// 3. Adding markers
function addMapMarker(location: { lat: number; lng: number }, label: string) {
  os.shout("addMapMarker", {
    position: location,
    label,
    icon: "place",
    metadata: { type: "biblical-location" },
  });
}
```

### Synchronizing Text and Visualization

```tsx
// Text click → Canvas highlight
function TextPanel() {
  const { scrollToVerse } = useBibleContext();

  const handleVerseClick = (verseId: string) => {
    // Update text
    scrollToVerse(verseId);

    // Notify Canvas
    os.shout("verse.selected", { verseId });
  };

  return <div onClick={() => handleVerseClick("Exodus.25.31")}>Menorah</div>;
}

// Canvas listens and highlights
function CanvasExtension() {
  useEffect(() => {
    const unsubscribe = os.onShout("verse.selected", (event) => {
      const { verseId } = event.arg;

      // Find associated 3D object
      const bot = findBotByVerseId(verseId);
      if (bot) {
        // Highlight in 3D
        highlightBot(bot);
        // Focus camera
        focusCameraOnBot(bot);
      }
    });

    return () => unsubscribe();
  }, []);

  return <Canvas3D />;
}

// Canvas click → Text scroll
function CanvasExtension() {
  useEffect(() => {
    const unsubscribe = os.onShout("onClick", (event) => {
      const bot = event.arg.bot;
      const verseId = bot.tags["verseId"];

      if (verseId) {
        // Notify text panel
        os.shout("canvas.verseClicked", { verseId });
      }
    });

    return () => unsubscribe();
  }, []);

  return <Canvas3D />;
}

function TextPanel() {
  const { scrollToVerse } = useBibleContext();

  useEffect(() => {
    const unsubscribe = os.onShout("canvas.verseClicked", (event) => {
      scrollToVerse(event.arg.verseId);
    });

    return () => unsubscribe();
  }, []);

  return <ChapterView />;
}
```

---

## Build System

### Build Pipeline

```
TypeScript Source → esbuild → Compiled JavaScript → casualos pack-aux → .aux File
```

**Detailed steps:**

```bash
# 1. TypeScript compilation
pnpm build
# Runs: tsx script/build.ts

# script/build.ts
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['packages/*/index.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' }
});

# 2. Package to .aux format
pnpm package
# Runs: tsx script/package.ts

# script/package.ts
import { exec } from 'child_process';

const extensions = getExtensionList();

for (const ext of extensions) {
  await exec(`casualos pack-aux "packages/${ext}" --output "dist/${ext}.aux"`);
}
```

### Development Workflow

```bash
# Start dev server with Puppeteer
pnpm dev

# script/dev.ts
import puppeteer from 'puppeteer';
import repl from 'repl';

(async () => {
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-web-security']  // For local development
  });

  const page = await browser.newPage();

  // Load Seed Bible
  await page.goto('http://localhost:3000?ab=SeedBible');

  // Start REPL
  const replServer = repl.start({
    prompt: '> ',
    eval: async (cmd, context, filename, callback) => {
      // Execute command in browser context
      const result = await page.evaluate(cmd);
      callback(null, result);
    }
  });

  // Add helpers
  replServer.context.save = async (extension) => {
    await page.evaluate(`downloadAux('${extension}')`);
  };

  replServer.context.reload = async () => {
    await page.reload();
  };
})();
```

### Packaging Extensions

```bash
# Package single extension
pnpm extension package "My Extension"

# Script finds extension directory and packages
const extensionDir = findExtensionDir("My Extension");
const metadata = JSON.parse(fs.readFileSync(`${extensionDir}/extension.json`));

# Creates .aux file with:
# - Compiled JavaScript
# - extension.json metadata
# - extra.aux data (if any)
# - Asset files (images, models, etc.)
```

---

## Performance Considerations

### Rendering Optimization

```tsx
// 1. Memoize expensive computations
const { useMemo } = os.appHooks;

function ChapterView({ data }) {
  const processedVerses = useMemo(() => {
    return data.verseContent.map((verse) => ({
      ...verse,
      formatted: formatVerse(verse.content),
    }));
  }, [data]);

  return <div>{/* render processedVerses */}</div>;
}

// 2. Use React.memo for expensive components
const VerseComponent = React.memo(
  ({ verse }) => {
    return <div>{verse.content}</div>;
  },
  (prevProps, nextProps) => {
    // Only re-render if verse content changed
    return prevProps.verse.content === nextProps.verse.content;
  }
);

// 3. Virtualize long lists
import { FixedSizeList } from "react-window";

function ChapterView({ data }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={data.verseContent.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Verse verse={data.verseContent[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### Data Caching

```typescript
// Implement multi-level cache
class BibleDataCache {
  private memoryCache: Map<string, BibleChapterData> = new Map();
  private maxSize: number = 50; // Keep 50 chapters in memory

  async get(key: string): Promise<BibleChapterData | null> {
    // 1. Check memory cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    // 2. Check IndexedDB
    const fromDB = await this.getFromIndexedDB(key);
    if (fromDB) {
      this.memoryCache.set(key, fromDB);
      return fromDB;
    }

    // 3. Fetch from network
    return null;
  }

  set(key: string, value: BibleChapterData) {
    // Add to memory cache
    this.memoryCache.set(key, value);

    // Evict if over limit (LRU)
    if (this.memoryCache.size > this.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    // Store in IndexedDB
    this.saveToIndexedDB(key, value);
  }

  private async getFromIndexedDB(
    key: string
  ): Promise<BibleChapterData | null> {
    const db = await openDB("seedBible", 1);
    return db.get("chapters", key);
  }

  private async saveToIndexedDB(key: string, value: BibleChapterData) {
    const db = await openDB("seedBible", 1);
    await db.put("chapters", value, key);
  }
}
```

### Debouncing Updates

```typescript
// Debounce frequent state updates
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

---

## Security Model

### Entitlements System

```typescript
// Extension requests permissions
// extension.json
{
  "entitlements": [
    {
      "feature": "data",
      "scope": "personal"      // Can access user's personal data
    },
    {
      "feature": "ai",
      "scope": "session"       // Can use AI in current session
    }
  ]
}

// User is prompted on first load
async function loadExtension(extensionId: string) {
  const extension = await fetchExtension(extensionId);

  if (extension.entitlements.length > 0) {
    const approved = await promptUserForEntitlements(extension.entitlements);

    if (!approved) {
      throw new Error('User denied permissions');
    }
  }

  // Proceed with loading
  await initializeExtension(extension);
}
```

### Data Isolation

```typescript
// Personal data (private to user)
await os.setData("myExtension.private", data, {
  markers: ["account"], // Only this account can access
});

// Studio data (shared with studio members)
await os.setData("myExtension.shared", data, {
  markers: ["studio:abc123"], // Only studio abc123 members
});

// Public data (readable by anyone)
await os.setData("myExtension.public", data, {
  markers: ["publicRead"], // Anyone can read
});
```

### Input Sanitization

```typescript
// Sanitize user input before rendering
import DOMPurify from 'dompurify';

function CommentaryPanel({ content }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Validate Bible references
function validateReference(ref: string): boolean {
  const pattern = /^[1-3]?\s?[A-Za-z]+\s\d+:\d+(-\d+)?$/;
  return pattern.test(ref);
}
```

### Extension Sandboxing

```typescript
// Extensions run in the same JavaScript context as core
// Security relies on:

// 1. Code review before distribution
// 2. Entitlements system
// 3. CasualOS permissions

// Future: Consider iframe sandboxing for untrusted extensions
function loadUntrustedExtension(extensionCode: string) {
  const iframe = document.createElement("iframe");
  iframe.sandbox = "allow-scripts";
  iframe.srcdoc = `
    <script>
      ${extensionCode}
    </script>
  `;
  document.body.appendChild(iframe);

  // Communication via postMessage
  window.addEventListener("message", (event) => {
    if (event.source === iframe.contentWindow) {
      // Handle extension messages
    }
  });
}
```

---

## Summary

This architecture document covers:

✅ **System Architecture** - Layered design and component organization
✅ **Runtime Model** - Instance lifecycle and bootstrap process
✅ **State Management** - Context architecture and persistence
✅ **Data Flow** - Bible data loading and event propagation
✅ **Extension System** - Loading, isolation, and communication
✅ **Collaborative Architecture** - Real-time sync and conflict resolution
✅ **Canvas and Land Integration** - 3D and geographic visualization
✅ **Build System** - Compilation and packaging pipeline
✅ **Performance** - Optimization strategies and caching
✅ **Security** - Entitlements, isolation, and sanitization

**For practical development:**

- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup and first extension
- [EXTENSION_DEVELOPMENT_GUIDE.md](EXTENSION_DEVELOPMENT_GUIDE.md) - Development patterns
- [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation

**For platform details:**

- [CasualOS Documentation](https://docs.casualos.com) - Runtime platform reference
- [DEVELOPER_DOCUMENTATION.md](DEVELOPER_DOCUMENTATION.md) - Ecosystem overview
