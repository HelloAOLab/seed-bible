# Extension Development Guide

## Overview

This guide provides comprehensive instructions for developing Seed Bible extensions, from basic concepts to advanced patterns. Extensions are the primary way to add functionality to Seed Bible while maintaining the platform's composability and collaborative nature.

**Terminology Note:** A Seed Bible Session is the runtime environment compiled inside an inst. This document uses "session" as the primary term; "environment" appears occasionally as a narrative synonym emphasizing the broader experiential posture.

**Prerequisites:**

- Complete [GETTING_STARTED.md](GETTING_STARTED.md) tutorial
- Understanding of React, TypeScript, and hooks
- Familiarity with CasualOS concepts

**Quick Reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common imports and patterns

## Table of Contents

1. [Platform Context](#platform-context)
2. [Extension Architecture](#extension-architecture)
3. [Extension Structure](#extension-structure)
4. [Extension Lifecycle](#extension-lifecycle)
5. [UI Integration Patterns](#ui-integration-patterns)
6. [Data Management](#data-management)
7. [Collaborative Features](#collaborative-features)
8. [Canvas Integration](#canvas-integration)
9. [Land Integration](#land-integration)
10. [AI Integration](#ai-integration)
11. [Distribution and Deployment](#distribution-and-deployment)
12. [Best Practices](#best-practices)
13. [Advanced Patterns](#advanced-patterns)

---

## Platform Context

### Session-Based Architecture

Seed Bible operates on a **session-based architecture**. Each session is a runtime environment compiled inside an inst that contains extensions, data, and state. Sessions are designed for exploration and collaboration, not permanent storage.

### Identity Hierarchy

The platform uses a three-tier identity system:

- **Profiles**: Personal identities within an Account (data is partitioned within the Account)
- **Accounts**: Personal workspace with private records
- **Studios**: Shared workspaces with collaborative records among members

Extensions should store data at the appropriate level based on the use case (see [Data Management](#data-management)).

### Shared Interaction vs Independent Visualization

A fundamental principle of Seed Bible: participants in the same session share **interaction state** (what verse they're viewing, navigation events), but not **layout** (which extensions appear, panel configuration). Your Space (personal UI configuration) does not affect another participant's view, even in the same collaborative session.

**For Comprehensive Platform Understanding:**
Refer to [DEVELOPER_DOCUMENTATION.md](DEVELOPER_DOCUMENTATION.md) for complete platform architecture, philosophy, and design principles.

---

## Extension Architecture

### What Extensions Are (and Are Not)

**Extensions are:**

- ✅ Modular React components compiled at runtime
- ✅ Declarative JSON configurations packaged as `.aux` files
- ✅ Composable tools that interoperate through shared state
- ✅ Portable data that can be exported, shared, and remixed

**Extensions are not:**

- ❌ Standalone applications or binaries
- ❌ Isolated features with private state
- ❌ Locked to specific versions or sessions
- ❌ Dependent on centralized app stores

### Design Philosophy

Seed Bible extensions follow three core principles:

#### 1. Shared Interaction, Independent Visualization

Users in the same session share **interaction state** but not **layout**:

```tsx
// ✅ Good: Emit interaction events
const handleVerseClick = (verseId: string) => {
  updateCurrentBookChapter(bookId, chapter); // Shared state
  scrollToVerse(verseId); // Shared interaction
};

// ❌ Bad: Assume everyone sees the same UI
const handleVerseClick = (verseId: string) => {
  document.querySelector(".verse").scrollIntoView(); // Not shared
};
```

**Spaces:** Spaces are personal configurations defining how a session is displayed for an individual user. Interaction state is shared across participants; visualization configuration (layout, which extensions appear where) is not. Your Space does not affect another participant's view, even in the same collaborative session.

#### 2. Composability Over Isolation

Extensions should work together, not in silos:

```tsx
// ✅ Good: Use shared data sources
const { data } = useBibleData(); // Shared chapter data

// ✅ Good: Respect other extensions
const { tools } = useBibleContext();
const hasCommentary = tools.some((t) => t.id === "commentary");

// ❌ Bad: Duplicate data fetching
const [myPrivateData, setMyPrivateData] = useState();
fetchBibleData().then(setMyPrivateData); // Wasteful
```

#### 3. Progressive Enhancement

Extensions should gracefully handle missing dependencies:

```tsx
// ✅ Good: Check for dependencies and degrade gracefully
const canvasAvailable = tools.find((t) => t.id === "canvas");

return canvasAvailable ? <EnhancedView /> : <BasicView />;

// ❌ Bad: Crash if dependency missing
const canvas = tools.find((t) => t.id === "canvas");
canvas.render(); // Error if canvas not loaded!
```

---

## Extension Structure

### Minimal Extension Structure

```
packages/MyExtension/
├── extension.json         # Extension metadata (REQUIRED)
├── extra.aux             # Extra data stub (REQUIRED)
└── myExtension/          # Source directory
    ├── index.tsx         # Entry point
    ├── MyExtension.tsx   # Main component
    ├── components/       # Sub-components
    │   └── *.tsx
    ├── hooks/            # Custom hooks
    │   └── *.tsx
    ├── utils/            # Utilities
    │   └── *.ts
    └── types/            # TypeScript definitions
        └── *.ts
```

### extension.json Reference

Complete `extension.json` specification:

```json
{
  "name": "Extension Name",
  "description": "Brief description of what the extension does",
  "id": 1734284000000,
  "mainBotTag": "namespace.main",
  "author": "Your Name or Organization",
  "license": "MIT",
  "version": "1.0.0",
  "dependencies": [
    {
      "depId": 1234567890123,
      "name": "Dependency Name",
      "type": "package"
    }
  ],
  "otherBots": [
    {
      "tag": "namespace.helper",
      "description": "Helper bot description"
    }
  ],
  "configEditor": {
    "toolbarConfig": {
      "icon": "extension",
      "label": "Extension Label",
      "run": "toggleFunction",
      "hasToggle": true,
      "active": false,
      "placement": "toolbar"
    }
  },
  "entitlements": [
    {
      "feature": "data",
      "scope": "personal"
    },
    {
      "feature": "ai",
      "scope": "session"
    }
  ]
}
```

#### Field Descriptions

| Field          | Type   | Required | Description                                                         |
| -------------- | ------ | -------- | ------------------------------------------------------------------- |
| `name`         | string | ✅       | Display name shown to users                                         |
| `description`  | string | ✅       | Brief explanation of functionality                                  |
| `id`           | number | ✅       | Unique timestamp-based identifier (milliseconds since epoch)        |
| `mainBotTag`   | string | ✅       | CasualOS bot tag for main entry point (format: `namespace.botName`) |
| `author`       | string | ❌       | Creator name or organization                                        |
| `license`      | string | ❌       | License type (e.g., MIT, GPL, proprietary)                          |
| `version`      | string | ❌       | Semantic version (e.g., 1.0.0)                                      |
| `dependencies` | array  | ❌       | Other extensions required                                           |
| `otherBots`    | array  | ❌       | Additional bot definitions                                          |
| `configEditor` | object | ❌       | UI integration configuration                                        |
| `entitlements` | array  | ❌       | Permission requests                                                 |

### Generating Extension IDs

Extension IDs must be unique timestamps:

```bash
# Generate ID in bash/terminal
node -e "console.log(Date.now())"

# Or in JavaScript
Date.now()  // Returns: 1734284123456
```

Use this value as your extension's `id` field.

### extra.aux File

Every extension must include an `extra.aux` file, even if empty:

```json
{}
```

This file can contain additional bot definitions or configuration data that doesn't fit in the main source files.

---

## Extension Lifecycle

### Loading Sequence

When an extension is loaded:

1. **Dependency Resolution** - Required extensions are loaded first
2. **Bot Initialization** - CasualOS bots are created
3. **Component Registration** - React components are registered
4. **Toolbar Integration** - UI elements are added (if configured)
5. **State Hydration** - Saved state is restored (if applicable)

### Component Lifecycle

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

const { useState, useEffect } = os.appHooks;

export function MyExtension() {
  const { addTool, removeTool } = useBibleContext();
  const [initialized, setInitialized] = useState(false);

  // 1. Mount: Component first renders
  useEffect(() => {
    console.log("Extension mounting...");

    // Register toolbar button
    addTool({
      id: "myExtension",
      icon: "extension",
      label: "My Extension",
    });

    setInitialized(true);

    // 2. Unmount: Cleanup
    return () => {
      console.log("Extension unmounting...");
      removeTool("myExtension");
    };
  }, []);

  // 3. Updates: Re-render when dependencies change
  useEffect(() => {
    if (initialized) {
      console.log("Extension updated");
    }
  }, [initialized]);

  return <div>My Extension Content</div>;
}
```

### Lazy Loading Pattern

For performance, load heavy components only when needed:

```tsx
const { lazy, Suspense } = os.appHooks;

// Lazy load heavy 3D component
const Heavy3DViewer = lazy(() => import("./Heavy3DViewer"));

export function MyExtension() {
  const [showViewer, setShowViewer] = useState(false);

  return (
    <div>
      <button onClick={() => setShowViewer(true)}>Load 3D Viewer</button>

      {showViewer && (
        <Suspense fallback={<div>Loading...</div>}>
          <Heavy3DViewer />
        </Suspense>
      )}
    </div>
  );
}
```

### Session Expiration and Data Persistence

**Important:** Default sessions expire after 12 hours and cannot be recovered. Extensions should not assume session permanence. Any data that must persist beyond the session must be saved to Records under an Account or Studio.

Use the Data Management APIs to store critical user data, preferences, or state that should survive session termination.

### Breakability Philosophy

Seed Bible prioritizes maximum flexibility; users and communities are allowed to break things. If an extension expects features not present (e.g., dependencies, specific APIs), it can request them; if unavailable, the extension may break. **This is acceptable.**

Redeployability mitigates risk: a fresh session is always one link away. Extensions should gracefully handle missing dependencies where possible, but complete functionality may not always be guaranteed.

---

## UI Integration Patterns

### Toolbar Integration

Extensions can add buttons to the Seed Bible toolbar:

```json
// In extension.json
{
  "configEditor": {
    "toolbarConfig": {
      "icon": "calculate", // Material Icon name
      "label": "My Tool",
      "run": "toggleMyTool", // Global function name
      "hasToggle": true, // Button has active/inactive state
      "active": false, // Initial state
      "placement": "toolbar" // Where button appears
    }
  }
}
```

Register the toggle function:

```tsx
// In index.tsx
import { MyExtension } from "./MyExtension";

(globalThis as any).toggleMyTool = function () {
  const context = (window as any).getBibleContext();
  const { tools, addTool, removeTool } = context;

  const existing = tools.find((t) => t.id === "myTool");

  if (existing) {
    removeTool("myTool");
  } else {
    addTool({
      id: "myTool",
      icon: "calculate",
      label: "My Tool",
      component: MyExtension,
      active: true,
      placement: "panel", // or 'toolbar', 'sidebar', 'floating'
    });
  }
};
```

### Placement Options

Extensions can appear in multiple locations:

```tsx
addTool({
  id: "myExtension",
  placement: "panel", // Main content area
});

addTool({
  id: "myExtension",
  placement: "toolbar", // Top toolbar
});

addTool({
  id: "myExtension",
  placement: "sidebar", // Left/right sidebar
});

addTool({
  id: "myExtension",
  placement: "floating", // Floating window
});
```

### Multi-Panel Layout Support

Respect the user's panel configuration:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { screens } = useBibleContext();

  // Screens can be 1, 2, 3, or 4
  const layout = {
    1: { columns: 1, width: "100%" },
    2: { columns: 2, width: "50%" },
    3: { columns: 3, width: "33.33%" },
    4: { columns: 2, width: "50%" }, // 2x2 grid
  }[screens];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
        gap: "16px",
      }}
    >
      {/* Your content adapts to panel count */}
    </div>
  );
}
```

### Responsive Design

Support various devices and screen sizes:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

const { useState, useEffect } = os.appHooks;

function MyExtension() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### Sidebar Panels

Use sidebar context for panel management:

```tsx
import { useSideBarContext } from "@packages/seed-bible/app/hooks/sideBar";

function MyExtension() {
  const { openPopupSettings, closePopupSettings, sidebarMode } =
    useSideBarContext();

  const handleOpenSettings = () => {
    openPopupSettings({
      title: "My Extension Settings",
      content: <SettingsPanel />,
    });
  };

  return (
    <div>
      <button onClick={handleOpenSettings}>Settings</button>
    </div>
  );
}
```

### Floating Windows

Create floating windows that can be moved:

```tsx
import { useMouseMove } from "@packages/seed-bible/app/hooks/mouseMove";

function MyExtension() {
  const { addFloatingWindow, removeFloatingWindow } = useMouseMove();

  const handleOpenFloating = () => {
    addFloatingWindow({
      id: "myFloatingWindow",
      title: "My Window",
      content: <MyContent />,
      initialPosition: { x: 100, y: 100 },
      width: 400,
      height: 300,
      resizable: true,
      draggable: true,
    });
  };

  return <button onClick={handleOpenFloating}>Open Floating Window</button>;
}
```

---

## Data Management

### Using Bible Data

Access Scripture content through the `useBibleData` hook:

```tsx
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

function MyExtension() {
  const {
    data, // Chapter data
    footnotes, // Footnotes for chapter
    loading, // Loading state
    error, // Error state
    open, // Navigate to passage
    changeTranslation, // Change Bible translation
  } = useBibleData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>
        {data.bookName} {data.chapter}
      </h2>
      {data.verseContent.map((verse) => (
        <p key={verse.verse}>
          <strong>{verse.verse}.</strong> {verse.content}
        </p>
      ))}
    </div>
  );
}
```

### Bible Data Structure

```typescript
interface BibleData {
  bookId: number;
  bookName: string;
  chapter: number;
  translation: string;
  verseContent: Array<{
    verse: number;
    content: string;
    verseId: string;
  }>;
  footnotes?: Array<{
    id: string;
    verse: number;
    content: string;
  }>;
}
```

### Persisting Extension Data

Store extension-specific data in CasualOS records:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

const { useState, useEffect } = os.appHooks;

function MyExtension() {
  const [settings, setSettings] = useState({ theme: "light" });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const stored = await os.getData("myExtension.settings");
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    };
    loadSettings();
  }, []);

  // Save settings when changed
  const updateSettings = async (newSettings) => {
    setSettings(newSettings);
    await os.setData("myExtension.settings", JSON.stringify(newSettings));
  };

  return (
    <div>
      <select
        value={settings.theme}
        onChange={(e) => updateSettings({ ...settings, theme: e.target.value })}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
```

### Record Markers for Access Control

Record markers control who can access stored data:

```tsx
// Store private data (only current user)
await os.setData("myExtension.private", data, {
  markers: ["private"],
});

// Store public data (all users can read)
await os.setData("myExtension.public", data, {
  markers: ["publicRead"],
});

// Store collaborative data (all users can read/write)
await os.setData("myExtension.shared", data, {
  markers: ["publicRead", "publicWrite"],
});

// Store Account-scoped data (Account's bots/insts can access)
await os.setData("myExtension.accountData", data, {
  markers: ["account"],
});
```

**Available Markers:**

- `private`: Only the current user
- `publicRead`: All users can read
- `publicWrite`: All users can write
- `account`: Account-scoped access (allows an Account's bots or insts to access certain records without exposing them to Studios)

**Multiple Markers:** A resource can have multiple markers assigned. When multiple markers are present, any permission from either marker can grant access.

### Caching Strategies

Implement caching for expensive operations:

```tsx
const { useState, useEffect, useMemo } = os.appHooks;

function MyExtension() {
  const { data } = useBibleData();
  const [cache, setCache] = useState({});

  // Memoize expensive computation
  const processedData = useMemo(() => {
    const cacheKey = `${data.bookId}-${data.chapter}`;

    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    // Expensive processing
    const result = expensiveProcessing(data);

    setCache((prev) => ({ ...prev, [cacheKey]: result }));
    return result;
  }, [data, cache]);

  return <div>{/* Use processedData */}</div>;
}
```

### Identity Hierarchy and Data Storage

Extension data storage relates to the Profiles/Accounts/Studios hierarchy:

- **Profile data**: Partitioned within an Account; personal to the Profile
- **Account records**: Personal to the Account holder
- **Studio records**: Shared among Studio members

Extensions should store data at the appropriate level for the use case. Use Account-scoped storage for personal preferences, and Studio-scoped storage for collaborative resources.

### Data Philosophy

**"Data As Liability"**: Extensions should collect minimum necessary data. Only request and store data that is essential for functionality.

**"Anonymous Users"**: Extensions should support anonymous usage where possible. Do not require login for basic functionality unless absolutely necessary.

**"Local-First Posture"**: Design with offline capability in mind where feasible. Consider how your extension behaves when network connectivity is limited or unavailable.

**For detailed Records API documentation and AI capabilities**, see the CasualOS documentation at [docs.casualos.com](https://docs.casualos.com).

---

## Collaborative Features

### User Activity Tracking

Track and display user locations in collaborative sessions:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { userActivities, updateCurrentBookChapter } = useBibleContext();

  const handleNavigate = (bookId: number, chapter: number) => {
    // Update your location for other users
    updateCurrentBookChapter(bookId, chapter);
  };

  return (
    <div>
      <h3>Active Users ({userActivities.length})</h3>
      {userActivities.map((activity) => (
        <div key={activity.userId} style={{ marginBottom: "8px" }}>
          <strong>{activity.userName}</strong>
          <br />
          Reading: {activity.bookName} {activity.chapter}
          <br />
          <small>
            Last active: {new Date(activity.timestamp).toLocaleTimeString()}
          </small>
        </div>
      ))}
    </div>
  );
}
```

### User Activity Structure

```typescript
interface UserActivity {
  userId: string;
  userName: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verse?: number;
  timestamp: number;
  color?: string; // User's assigned color
}
```

### Presence Indicators

Show which users are currently viewing the same passage:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

function MyExtension() {
  const { userActivities } = useBibleContext();
  const { data } = useBibleData();

  // Find users on the same chapter
  const usersHere = userActivities.filter(
    (activity) =>
      activity.bookId === data.bookId && activity.chapter === data.chapter
  );

  return (
    <div>
      {usersHere.length > 1 && (
        <div
          style={{ background: "#e3f2fd", padding: "8px", borderRadius: "4px" }}
        >
          👥 {usersHere.length} users reading this chapter
        </div>
      )}
    </div>
  );
}
```

### Shared Interaction Events

Emit events that other participants can observe:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { updateCurrentBookChapter, scrollToVerse } = useBibleContext();

  const handleVerseClick = (
    verseId: string,
    bookId: number,
    chapter: number
  ) => {
    // These actions are shared with all participants
    updateCurrentBookChapter(bookId, chapter);
    scrollToVerse(verseId);

    // Optionally notify via CasualOS shout
    os.shout("verseSelected", { verseId, bookId, chapter });
  };

  return (
    <div onClick={() => handleVerseClick("John.3.16", 43, 3)}>
      Click to navigate everyone to John 3:16
    </div>
  );
}
```

### Listening for Shared Events

```tsx
const { useEffect } = os.appHooks;

function MyExtension() {
  useEffect(() => {
    // Listen for verse selection events
    const unsubscribe = os.onShout("verseSelected", (event) => {
      const { verseId, bookId, chapter } = event.arg;
      console.log("Another user selected:", verseId);

      // Respond to the event (e.g., highlight, focus)
      highlightVerse(verseId);
    });

    return () => unsubscribe();
  }, []);

  return <div>Listening for shared events...</div>;
}
```

---

## Canvas Integration

**Canvas Context:** Canvas is the gridPortal from CasualOS, integrated into Seed Bible as a spatial service. It uses abstract 3D coordinates (x, y, z) for positioning objects, providing immersive 3D visualization capabilities. Extensions can create, manipulate, and respond to 3D objects.

### Checking Canvas Availability

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { tools } = useBibleContext();
  const canvasAvailable = tools.some((t) => t.id === "canvas" && t.active);

  if (!canvasAvailable) {
    return <div>This extension requires Canvas</div>;
  }

  return <CanvasIntegratedView />;
}
```

### Creating 3D Objects

```tsx
function MyExtension() {
  const create3DObject = () => {
    os.shout("createBot", {
      tags: {
        auxPosition: { x: 0, y: 0, z: 0 },
        auxShape: "cube",
        auxColor: "#ff0000",
        auxScale: { x: 1, y: 1, z: 1 },
        auxLabel: "My Object",
        auxLabelSize: 0.5,
        "myExtension.data": JSON.stringify({ type: "marker" }),
      },
    });
  };

  return <button onClick={create3DObject}>Create 3D Marker</button>;
}
```

### Responding to 3D Interactions

```tsx
const { useEffect } = os.appHooks;

function MyExtension() {
  useEffect(() => {
    // Listen for clicks on 3D objects
    const unsubscribe = os.onShout("onClick", (event) => {
      const bot = event.arg.bot;

      // Check if this is your extension's object
      if (bot.tags["myExtension.data"]) {
        const data = JSON.parse(bot.tags["myExtension.data"]);
        console.log("Clicked on:", data);

        // Respond to the interaction
        handleObjectClick(bot);
      }
    });

    return () => unsubscribe();
  }, []);

  return <div>3D objects are interactive</div>;
}
```

### Synchronizing Text and 3D

Link Bible text with 3D visualizations:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

function MyExtension() {
  const { scrollToVerse } = useBibleContext();
  const { data } = useBibleData();

  const handleTextClick = (verseId: string) => {
    // Scroll to verse in text
    scrollToVerse(verseId);

    // Highlight corresponding 3D object
    os.shout("highlight3DObject", { verseId });
  };

  const handle3DClick = (verseId: string) => {
    // Scroll to corresponding text
    scrollToVerse(verseId);
  };

  useEffect(() => {
    const unsubscribe = os.onShout("onClick", (event) => {
      const bot = event.arg.bot;
      const verseId = bot.tags["verseId"];
      if (verseId) {
        handle3DClick(verseId);
      }
    });

    return () => unsubscribe();
  }, []);

  return <div>Text and 3D are synchronized</div>;
}
```

### Example: Tabernacle Extension Pattern

Study the Tabernacle extension for complex Canvas integration:

```tsx
// Simplified example based on Tabernacle extension
function TabernacleExtension() {
  const [selectedObject, setSelectedObject] = useState(null);

  const createTabernacleModel = () => {
    // Create altar
    os.shout("createBot", {
      tags: {
        auxPosition: { x: 0, y: 0, z: -5 },
        auxShape: "cube",
        auxColor: "#8B4513",
        auxScale: { x: 2, y: 1, z: 2 },
        auxLabel: "Altar of Burnt Offering",
        "tabernacle.object": "altar",
        "scripture.reference": "Exodus 27:1-8",
      },
    });

    // Create menorah
    os.shout("createBot", {
      tags: {
        auxPosition: { x: -3, y: 0.5, z: -8 },
        auxFormAddress: "menorah.glb", // 3D model file
        auxLabel: "Menorah",
        "tabernacle.object": "menorah",
        "scripture.reference": "Exodus 25:31-40",
      },
    });
  };

  useEffect(() => {
    const unsubscribe = os.onShout("onClick", (event) => {
      const bot = event.arg.bot;
      if (bot.tags["tabernacle.object"]) {
        setSelectedObject(bot);

        // Show scripture reference
        const reference = bot.tags["scripture.reference"];
        showScripturePanel(reference);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <button onClick={createTabernacleModel}>Load Tabernacle</button>
      {selectedObject && (
        <div>
          <h3>{selectedObject.tags["auxLabel"]}</h3>
          <p>{selectedObject.tags["scripture.reference"]}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Land Integration

**Land Context:** Land is the mapPortal from CasualOS, integrated into Seed Bible as a geographic service. It uses geographic coordinates (longitude, latitude, altitude) and ArcGIS map layers rather than abstract 3D coordinates, providing real-world geographic visualization for biblical locations.

**Note:** Land integration is ongoing; these APIs may change. Check current CasualOS documentation at [docs.casualos.com](https://docs.casualos.com) for latest behavior.

### Checking Land Availability

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { tools } = useBibleContext();
  const landAvailable = tools.some((t) => t.id === "land" && t.active);

  if (!landAvailable) {
    return <div>This extension requires Land</div>;
  }

  return <LandIntegratedView />;
}
```

### Adding Map Markers

```tsx
function MyExtension() {
  const addLocationMarker = (name: string, lat: number, lng: number) => {
    os.shout("addMapMarker", {
      id: `marker-${name}`,
      position: { lat, lng },
      label: name,
      icon: "place",
      metadata: {
        type: "biblical-location",
        references: ["Genesis 12:1", "Genesis 13:3"],
      },
    });
  };

  const showJerusalem = () => {
    addLocationMarker("Jerusalem", 31.7683, 35.2137);
  };

  return <button onClick={showJerusalem}>Show Jerusalem</button>;
}
```

### Journey Visualization

```tsx
function JourneyExtension() {
  const showPaulsFirstJourney = () => {
    const journey = [
      { name: "Antioch", lat: 36.2, lng: 36.16 },
      { name: "Seleucia", lat: 36.09, lng: 35.94 },
      { name: "Salamis", lat: 35.18, lng: 33.91 },
      { name: "Paphos", lat: 34.75, lng: 32.42 },
      { name: "Perga", lat: 36.96, lng: 30.85 },
      { name: "Antioch in Pisidia", lat: 38.35, lng: 31.18 },
    ];

    // Add markers
    journey.forEach((location) => {
      os.shout("addMapMarker", {
        id: `journey-${location.name}`,
        position: { lat: location.lat, lng: location.lng },
        label: location.name,
      });
    });

    // Draw path
    os.shout("drawMapPath", {
      id: "pauls-first-journey",
      points: journey.map((loc) => ({ lat: loc.lat, lng: loc.lng })),
      color: "#1976d2",
      width: 3,
      label: "Paul's First Missionary Journey",
    });
  };

  return <button onClick={showPaulsFirstJourney}>Show Paul's Journey</button>;
}
```

---

## AI Integration

Extensions can integrate AI capabilities for generative content, conversation, and realtime voice.

### Text Generation

```tsx
function MyExtension() {
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);

  const generateCommentary = async (passage: string) => {
    setLoading(true);
    try {
      const result = await os.aiChat({
        messages: [
          {
            role: "system",
            content:
              "You are a biblical scholar assistant. Provide brief historical context.",
          },
          {
            role: "user",
            content: `Provide historical context for: ${passage}`,
          },
        ],
      });

      setGenerated(result.content);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => generateCommentary("John 3:16")}>
        Generate Commentary
      </button>
      {loading && <div>Generating...</div>}
      {generated && <div>{generated}</div>}
    </div>
  );
}
```

### Conversational AI

```tsx
function ChatExtension() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const response = await os.aiChat({
      messages: [...messages, userMessage],
    });

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: response.content },
    ]);
  };

  return (
    <div>
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              margin: "8px 0",
            }}
          >
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### Context-Aware AI

Integrate AI with current Bible reading:

```tsx
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

function ContextualAIExtension() {
  const { data } = useBibleData();
  const [response, setResponse] = useState("");

  const askAboutCurrentPassage = async (question: string) => {
    const passage = `${data.bookName} ${data.chapter}`;
    const text = data.verseContent
      .map((v) => `${v.verse}. ${v.content}`)
      .join(" ");

    const result = await os.aiChat({
      messages: [
        {
          role: "system",
          content: `You are discussing ${passage}. Here is the text: ${text}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    setResponse(result.content);
  };

  return (
    <div>
      <h3>
        Ask about {data.bookName} {data.chapter}
      </h3>
      <button onClick={() => askAboutCurrentPassage("What is the main theme?")}>
        What is the main theme?
      </button>
      <button
        onClick={() =>
          askAboutCurrentPassage("What is the historical context?")
        }
      >
        Historical Context
      </button>
      {response && (
        <div
          style={{ marginTop: "16px", padding: "12px", background: "#f5f5f5" }}
        >
          {response}
        </div>
      )}
    </div>
  );
}
```

### AI Guardrails (AO Lab Philosophy)

**Important Context:** AO Lab is a toolmaker and platform service provider, not a governance body. These guardrails represent AO Lab's strong recommendations for AI behavior in Scripture contexts; they are not enforced platform constraints. Partners and developers may implement different approaches, but we encourage alignment with these principles:

**AO Lab's recommended guardrails:**

- Do NOT provide definitive interpretations of Scripture
- Do NOT claim theological authority
- DO suggest questions to explore
- DO provide historical and cultural context
- DO acknowledge multiple valid perspectives
- DO redirect to pastoral care when appropriate

**Example Implementation:**

```tsx
const generateResponse = async (question: string) => {
  const result = await os.aiChat({
    messages: [
      {
        role: "system",
        content: `You are a research assistant for Bible study.

        IMPORTANT GUARDRAILS:
        - Do NOT provide definitive interpretations of Scripture
        - Do NOT claim theological authority
        - DO suggest questions to explore
        - DO provide historical and cultural context
        - DO acknowledge multiple valid perspectives
        - DO redirect to pastoral care when appropriate

        Your role is to assist research and prompt discovery, not replace
        communal discernment or pastoral guidance.`,
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  return result.content;
};
```

---

## Distribution and Deployment

### Packaging Extensions

```bash
# Build TypeScript
pnpm build

# Package single extension to .aux file
pnpm extension package "My Extension"

# Package all extensions
pnpm package

# Output: dist/My_Extension.aux
```

### .aux File Structure

The compiled `.aux` file contains:

```json
{
  "version": 1,
  "state": {
    "myExtension.main": {
      "id": "myExtension.main",
      "tags": {
        "code": "// Compiled JavaScript code...",
        "metadata": "{ ... extension.json content ... }",
        "assets": "{ ... bundled assets ... }"
      }
    }
  }
}
```

**Note on .aux File Versioning:** The `.aux` format has two versions:

- **Version 1**: Pure JSON snapshots for saving exact state (typically used for extension packaging)
- **Version 2**: Conflict-free updates encoded as Base64 for collaborative deployments

Extension packaging typically produces Version 1 files.

### Distribution Methods

#### 1. Direct Download

Host `.aux` files on any web server:

```
https://your-domain.com/extensions/MyExtension.aux
```

Users download and drag-drop into Seed Bible.

#### 2. Extension Registry

Upload to AO Lab's registry:

```bash
pnpm extension upload "My Extension"
```

Users can then install via:

```bash
pnpm extension download "My Extension"
```

#### 3. GitHub Releases

Attach `.aux` files to GitHub releases for version control and distribution.

#### 4. Direct Link Loading

```
https://ao.bot/?pattern=SeedBible&extensions=true
```

_(Note: Extension URL loading is subject to security policies)_

### Versioning

Follow Semantic Versioning:

```json
{
  "version": "1.2.3"
  //        ^ ^ ^
  //        | | patch - bug fixes
  //        | minor - new features (backward compatible)
  //        major - breaking changes
}
```

Update version in `extension.json` before publishing.

### Dependency Management

Specify required extensions:

```json
{
  "dependencies": [
    {
      "depId": 1234567890123,
      "name": "Canvas",
      "type": "package",
      "minVersion": "1.0.0"
    }
  ]
}
```

At load time:

- Seed Bible checks if dependencies are installed
- Prompts user to install missing dependencies
- Loads dependencies in correct order

### Update Strategy

**For users:**

1. Download new `.aux` file
2. Drag-drop to replace existing version
3. Reload session

**For developers:**

1. Increment version in `extension.json`
2. Build and package
3. Distribute new `.aux` file
4. Document changes in release notes

---

## Best Practices

### Performance

✅ **Use React memoization:**

```tsx
const { useMemo, useCallback } = os.appHooks;

const expensiveValue = useMemo(() => {
  return expensiveComputation(data);
}, [data]);

const handleClick = useCallback(() => {
  doSomething();
}, []);
```

✅ **Lazy load heavy components:**

```tsx
const HeavyComponent = lazy(() => import("./HeavyComponent"));
```

✅ **Debounce frequent updates:**

```tsx
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

❌ **Avoid:**

- Unnecessary re-renders
- Large inline objects in JSX
- Uncontrolled side effects

### Accessibility

✅ **Keyboard navigation:**

```tsx
<button
  onClick={handleClick}
  onKeyPress={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick();
    }
  }}
>
  Action
</button>
```

✅ **ARIA labels:**

```tsx
<button aria-label="Close panel" onClick={handleClose}>
  ✕
</button>
```

✅ **Semantic HTML:**

```tsx
<nav aria-label="Extension navigation">
  <ul>
    <li>
      <a href="#section1">Section 1</a>
    </li>
  </ul>
</nav>
```

### Error Handling

✅ **Graceful degradation:**

```tsx
const { useState, useEffect } = os.appHooks;

function MyExtension() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchData();
        // ... process result
      } catch (err) {
        setError(err);
        os.toast("Failed to load data", "error");
      }
    };
    loadData();
  }, []);

  if (error) {
    return (
      <div>
        <p>Something went wrong</p>
        <button onClick={() => setError(null)}>Try Again</button>
      </div>
    );
  }

  return <div>Normal content</div>;
}
```

✅ **Boundary protection:**

```tsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Extension error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h2>Extension failed to load</h2>;
    }
    return this.props.children;
  }
}
```

### Security

✅ **Validate user input:**

```tsx
const handleSubmit = (input: string) => {
  // Sanitize input
  const sanitized = input.trim().slice(0, 1000);

  // Validate
  if (!isValid(sanitized)) {
    os.toast("Invalid input", "error");
    return;
  }

  processInput(sanitized);
};
```

✅ **Request minimal entitlements:**

```json
{
  "entitlements": [
    { "feature": "data", "scope": "personal" }
    // Only request what you actually need
  ]
}
```

❌ **Never:**

- Execute arbitrary code from user input
- Store sensitive data unencrypted
- Make unauthenticated API calls with user data

### Code Organization

✅ **Separate concerns:**

```
myExtension/
├── index.tsx              # Entry point and registration
├── MyExtension.tsx        # Main component
├── components/
│   ├── Panel.tsx         # UI components
│   └── Controls.tsx
├── hooks/
│   ├── useMyData.tsx     # Custom hooks
│   └── useMyLogic.tsx
├── utils/
│   ├── calculations.ts   # Pure functions
│   └── formatters.ts
└── types/
    └── index.ts          # TypeScript definitions
```

✅ **Extract reusable logic:**

```tsx
// hooks/useChapterWordCount.tsx
export function useChapterWordCount() {
  const { data } = useBibleData();

  return useMemo(() => {
    if (!data?.verseContent) return 0;
    const text = data.verseContent.map((v) => v.content).join(" ");
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }, [data]);
}

// Usage in component
function MyExtension() {
  const wordCount = useChapterWordCount();
  return <div>{wordCount} words</div>;
}
```

---

## Advanced Patterns

### Multi-Extension Coordination

Extensions can coordinate through shared events:

```tsx
// Extension A: Emits events
function ExtensionA() {
  const notifyOthers = () => {
    os.shout("extensionA.dataUpdated", {
      timestamp: Date.now(),
      data: {
        /* ... */
      },
    });
  };

  return <button onClick={notifyOthers}>Update</button>;
}

// Extension B: Listens for events
function ExtensionB() {
  const { useEffect, useState } = os.appHooks;
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const unsubscribe = os.onShout("extensionA.dataUpdated", (event) => {
      setLastUpdate(event.arg);
    });

    return () => unsubscribe();
  }, []);

  return <div>Last update: {lastUpdate?.timestamp}</div>;
}
```

### Extension Composition

Build higher-level extensions from simpler ones:

```tsx
// Base extension: Verse highlighter
function VerseHighlighter({ verses }: { verses: string[] }) {
  return verses.map((v) => <HighlightedVerse key={v} verseId={v} />);
}

// Composed extension: Commentary with highlights
function CommentaryExtension() {
  const [highlightedVerses, setHighlightedVerses] = useState([]);

  const handleCommentary = (verseIds: string[]) => {
    setHighlightedVerses(verseIds);
    // Show commentary...
  };

  return (
    <div>
      <Commentary onHighlight={handleCommentary} />
      <VerseHighlighter verses={highlightedVerses} />
    </div>
  );
}
```

### Dynamic Extension Loading

Load extensions based on context:

```tsx
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

const { lazy, Suspense, useState, useEffect } = os.appHooks;

function DynamicExtensionLoader() {
  const { data } = useBibleData();
  const [ExtensionComponent, setExtensionComponent] = useState(null);

  useEffect(() => {
    // Load different extensions based on book
    const loadExtension = async () => {
      if (data.bookName === "Exodus") {
        const Tabernacle = lazy(() => import("../Tabernacle"));
        setExtensionComponent(() => Tabernacle);
      } else if (data.bookName === "Acts") {
        const Map = lazy(() => import("../Scripture Map 2D"));
        setExtensionComponent(() => Map);
      }
    };

    loadExtension();
  }, [data.bookName]);

  if (!ExtensionComponent) return null;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExtensionComponent />
    </Suspense>
  );
}
```

### State Machines for Complex Workflows

```tsx
const { useReducer } = os.appHooks;

type State = "idle" | "loading" | "displaying" | "error";

function reducer(state: State, action: { type: string; payload?: any }): State {
  switch (action.type) {
    case "LOAD":
      return "loading";
    case "SUCCESS":
      return "displaying";
    case "ERROR":
      return "error";
    case "RESET":
      return "idle";
    default:
      return state;
  }
}

function StatefulExtension() {
  const [state, dispatch] = useReducer(reducer, "idle");

  const load = async () => {
    dispatch({ type: "LOAD" });
    try {
      await fetchData();
      dispatch({ type: "SUCCESS" });
    } catch (error) {
      dispatch({ type: "ERROR" });
    }
  };

  return (
    <div>
      {state === "idle" && <button onClick={load}>Load</button>}
      {state === "loading" && <div>Loading...</div>}
      {state === "displaying" && <Content />}
      {state === "error" && <div>Error occurred</div>}
    </div>
  );
}
```

### WebSocket Integration for External Services

```tsx
const { useState, useEffect } = os.appHooks;

function ExternalServiceExtension() {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("wss://api.example.com/stream");

    ws.onopen = () => {
      setConnected(true);
      console.log("Connected to external service");
    };

    ws.onmessage = (event) => {
      const received = JSON.parse(event.data);
      setData(received);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <div>Status: {connected ? "Connected" : "Disconnected"}</div>
      {data && <div>Received: {JSON.stringify(data)}</div>}
    </div>
  );
}
```

---

## Summary

You now have comprehensive knowledge of extension development:

✅ Extension architecture and philosophy
✅ Standard project structure
✅ Complete lifecycle management
✅ UI integration patterns (toolbar, panels, floating windows)
✅ Data management and persistence
✅ Collaborative features and user tracking
✅ Canvas 3D integration
✅ Land geographic visualization
✅ AI capabilities integration
✅ Distribution and deployment strategies
✅ Best practices for performance, accessibility, and security
✅ Advanced patterns for complex extensions

**Next Steps:**

1. Build your first extension following the patterns in this guide
2. Study existing extensions in `packages/` for real-world examples
3. Refer to [API_REFERENCE.md](API_REFERENCE.md) for complete hook documentation
4. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design deep dive
5. Join the community and share your extensions

Happy building! 🎉
