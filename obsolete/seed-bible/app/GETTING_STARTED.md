# Getting Started with Seed Bible Development

## Overview

Welcome to Seed Bible development! This guide will help you set up your development environment and understand the fundamental concepts needed to start building extensions and contributing to the platform.

**Prerequisites:**

- Read the [DEVELOPER_DOCUMENTATION.md](DEVELOPER_DOCUMENTATION.md) for ecosystem context
- Familiarity with React, TypeScript, and modern JavaScript
- Basic understanding of CasualOS concepts (see [docs.casualos.com](https://docs.casualos.com))

## Quick Reference

For quick lookups during development, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md) which contains:

- Most-used hooks and imports
- Common Bible reference codes
- Material Icons list
- Debugging shortcuts
- File location reference

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Core Concepts](#core-concepts)
4. [Your First Extension](#your-first-extension)
5. [Development Workflow](#development-workflow)
6. [Common Patterns](#common-patterns)
7. [Debugging and Testing](#debugging-and-testing)
8. [Next Steps](#next-steps)

---

## Development Environment Setup

### Initial Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/HelloAOLab/seed-bible.git
   cd seed-bible
   ```

2. **Install dependencies:**

   ```bash
   # Requires pnpm v10.17.1 or higher
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

This launches a Puppeteer-controlled Chrome instance with Seed Bible loaded in a clean state, plus a REPL (Read-Eval-Print Loop) for interactive development.

### REPL Commands

The development REPL provides powerful commands for rapid iteration:

```
.save [extension]    Save current state to filesystem
.reload              Reload from filesystem (hot reload)
.system              Open system portal for debugging
.chat [message]      Send a chat message to the session
.download            Download current state as .aux file
run(script)          Execute AUX script
shout(name, arg)     Trigger CasualOS shouts
```

**Example workflow:**

```
> .system                    # Open developer tools
> .save MyExtension          # Save changes to disk
> .reload                    # Hot reload to see changes
```

---

## Project Structure

Seed Bible is organized as a pnpm monorepo with 23 packages:

```
seed-bible/
├── packages/
│   ├── seed-bible/              # Core application
│   │   ├── app/
│   │   │   ├── components/      # UI components (47 files)
│   │   │   ├── hooks/           # React hooks - PRIMARY API (13 hooks)
│   │   │   ├── managers/        # Business logic
│   │   │   ├── db/              # Database/annotations
│   │   │   ├── experience/      # UX features
│   │   │   ├── aiApps/          # AI features
│   │   │   └── main/            # Entry points
│   │   └── dist/                # Built .aux files
│   │
│   └── [22 Extension Packages]   # Individual extensions
│       ├── Assistant/
│       ├── Bible Stack/
│       ├── Tabernacle/
│       ├── Scripture Map/
│       ├── Scripture Map 3D/
│       └── ...
│
├── script/                      # Build and CLI tools
│   ├── dev.ts                   # Development server
│   ├── build.ts                 # esbuild compilation
│   ├── extension.ts             # Extension CLI
│   ├── package.ts               # Package to .aux
│   └── pattern.ts               # Pattern management
│
└── typings/
    └── AuxLibraryDefinitions.d.ts  # CasualOS type definitions
```

### Key Directories for Development

| Directory                             | Purpose                                                    |
| ------------------------------------- | ---------------------------------------------------------- |
| `packages/seed-bible/app/hooks/`      | **Most important for developers** - Core React hooks API   |
| `packages/seed-bible/app/components/` | Reusable UI components                                     |
| `packages/[Extension]/`               | Individual extension source code                           |
| `script/`                             | CLI tools for building, packaging, and managing extensions |
| `dist/`                               | Compiled `.aux` files ready for distribution               |

---

## Core Concepts

### 1. React Context Hierarchy

Seed Bible uses nested React Context providers for state management:

```tsx
<BibleVariablesProvider>
  {" "}
  // Bible state, toolbar, user activities
  <TabsProvider>
    {" "}
    // Tabs, spaces, folders
    <SideBarProvider>
      {" "}
      // UI state, popups
      <MouseMoveProvider>
        {" "}
        // Mouse tracking, floating windows
        <Layout>
          <YourComponent />
        </Layout>
      </MouseMoveProvider>
    </SideBarProvider>
  </TabsProvider>
</BibleVariablesProvider>
```

Access these contexts through custom hooks:

- `useBibleContext()` - Primary state and navigation
- `useTabsContext()` - Workspace management
- `useSideBarContext()` - UI state
- `useMouseMove()` - Mouse tracking and floating windows

### 2. The Hooks API Pattern

**All feature development should use the hooks API rather than direct state manipulation.**

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const {
    screens, // Number of panels (1-4)
    tools, // Toolbar items
    addTool, // Add toolbar button
    removeTool, // Remove toolbar button
    Open, // Navigate to passage
    scrollToVerse, // Scroll to specific verse
    userActivities, // Collaborative user tracking
    updateCurrentBookChapter, // Update user's current location
  } = useBibleContext();

  // Your extension logic here
}
```

See [API_REFERENCE.md](API_REFERENCE.md) for complete hook documentation.

### 3. Extensions Are Data, Not Apps

**Critical mindset shift:** Extensions are not standalone applications. They are:

- **Declarative JSON** packaged as `.aux` files
- **Compiled at runtime** inside a CasualOS instance
- **Composable modules** that interoperate through shared primitives
- **Portable data** that can be exported, shared, and remixed

An extension doesn't "run by itself" - it's loaded into a Seed Bible Session where it becomes part of a collaborative environment.

### 4. Shared Interaction, Independent Visualization

Users in the same session share **interaction state** but not **visualization layout**:

- **Shared:** Verse selections, highlights, object interactions, user presence
- **Not shared:** Panel layouts, toolbar configurations, theme preferences, Space settings

This means your extension should:

- Emit interaction events that other participants can observe
- Not assume all users see the same visual layout
- Support multiple devices and modalities simultaneously

### 5. CasualOS Integration

Seed Bible runs on CasualOS, so extensions use CasualOS primitives:

```tsx
// React hooks from CasualOS
const { useState, useEffect, useContext } = os.appHooks;

// Bot access
const myBot = getBot("#myBotTag");

// Communication via shouts
os.toast("Hello from my extension!");
```

**Important:** Always use `os.appHooks` for React hooks, not direct React imports, to ensure proper CasualOS integration.

---

## Your First Extension

Let's create a simple "Verse Counter" extension that counts words in the current chapter.

### Step 1: Create Extension Structure

```bash
# Create new extension package
mkdir -p packages/VerseCounter/verseCounter
cd packages/VerseCounter
```

### Step 2: Create extension.json

```json
{
  "name": "Verse Counter",
  "description": "Displays word count for the current chapter",
  "id": 1734284000000,
  "mainBotTag": "verseCounter.main",
  "author": "Your Name",
  "license": "MIT",
  "version": "1.0.0",
  "dependencies": [],
  "configEditor": {
    "toolbarConfig": {
      "icon": "calculate",
      "label": "Verse Counter",
      "run": "toggleVerseCounter",
      "hasToggle": true,
      "active": false
    }
  }
}
```

### Step 3: Create extra.aux

```json
{}
```

_(This is a required stub file for extension packaging)_

### Step 4: Create Main Component

Create `packages/VerseCounter/verseCounter/VerseCounter.tsx`:

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

const { useState, useEffect } = os.appHooks;

export function VerseCounter() {
  const { tools, removeTool } = useBibleContext();
  const { data, loading } = useBibleData();
  const [wordCount, setWordCount] = useState(0);

  // Calculate word count when chapter data loads
  useEffect(() => {
    if (data?.verseContent) {
      const text = data.verseContent.map((v) => v.content).join(" ");
      const words = text.split(/\s+/).filter((w) => w.length > 0);
      setWordCount(words.length);
    }
  }, [data]);

  const handleClose = () => {
    removeTool("verseCounter");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        padding: "16px",
        background: "#f5f5f5",
        borderRadius: "8px",
        margin: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Verse Counter</h3>
        <button onClick={handleClose}>✕</button>
      </div>
      <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "8px" }}>
        {wordCount} words
      </div>
      <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
        {data?.bookName} {data?.chapter}
      </div>
    </div>
  );
}
```

### Step 5: Register Extension

Extensions are registered through the toolbar system. When the user clicks your toolbar button, your component should be added to the display.

Create `packages/VerseCounter/verseCounter/index.tsx`:

```tsx
import { VerseCounter } from "./VerseCounter";

// Export the component so it can be registered
export { VerseCounter };

// Global registration function (called by Seed Bible)
(globalThis as any).toggleVerseCounter = function () {
  const { tools, addTool, removeTool } = (window as any).getBibleContext();

  const existing = tools.find((t) => t.id === "verseCounter");

  if (existing) {
    removeTool("verseCounter");
  } else {
    addTool({
      id: "verseCounter",
      icon: "calculate",
      label: "Verse Counter",
      component: VerseCounter,
      active: true,
      placement: "panel", // or 'toolbar', 'sidebar', 'floating'
    });
  }
};
```

### Step 6: Build and Test

```bash
# From repository root
pnpm build                # Compile TypeScript
pnpm package              # Package to .aux file

# Start development server
pnpm dev

# In the REPL:
> .system                 # Open system portal
> .save VerseCounter      # Save your extension
> .reload                 # Reload to see changes
```

Your extension should now appear in the toolbar! Click the "Verse Counter" button to toggle it on/off.

---

## Development Workflow

### Standard Development Cycle

1. **Make changes** to your extension source files
2. **Save state** with `.save [ExtensionName]` in REPL
3. **Reload** with `.reload` to see changes
4. **Test** the functionality
5. **Iterate** until satisfied
6. **Package** with `pnpm package` to create distributable `.aux` file

### Building Extensions

```bash
# Build all TypeScript
pnpm build

# Package all extensions to .aux files
pnpm package

# Package specific extension
pnpm extension package VerseCounter

# Build and package in one step
pnpm build && pnpm package
```

### Working with .aux Files

```bash
# Download extension from server
pnpm extension download "Extension Name"

# Upload extension to server
pnpm extension upload "Extension Name"

# List available extensions
pnpm extension list
```

### Hot Reloading Tips

The `.reload` command is your best friend during development:

```
> .save MyExtension       # Save current work
> .reload                 # Hot reload without full restart
```

This is **much faster** than restarting the entire development server.

---

## Common Patterns

### Pattern 1: Adding a Toolbar Button

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { addTool, removeTool, tools } = useBibleContext();

  useEffect(() => {
    // Add toolbar button when extension loads
    addTool({
      id: "myExtension",
      icon: "extension", // Material Icon name
      label: "My Extension",
      active: true,
      hasToggle: true,
      onToggle: (active) => {
        console.log("Button toggled:", active);
      },
    });

    // Cleanup: remove button when extension unloads
    return () => {
      removeTool("myExtension");
    };
  }, []);
}
```

### Pattern 2: Responding to Navigation

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";
import { useBibleData } from "@packages/seed-bible/app/hooks/bibleData";

function MyExtension() {
  const { userActivities } = useBibleContext();
  const { data } = useBibleData();

  useEffect(() => {
    if (data) {
      console.log("User navigated to:", data.bookName, data.chapter);
      // Your logic here
    }
  }, [data]);
}
```

### Pattern 3: Multi-Screen Layout Support

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { screens } = useBibleContext();

  // Adjust layout based on number of visible panels
  const columnCount = screens === 1 ? 1 : screens === 2 ? 2 : 3;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      }}
    >
      {/* Your content */}
    </div>
  );
}
```

### Pattern 4: User Activity Tracking (Collaborative)

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const { updateCurrentBookChapter, userActivities } = useBibleContext();

  const handleNavigate = (bookId: number, chapter: number) => {
    // Update your location so other users can see where you are
    updateCurrentBookChapter(bookId, chapter);
  };

  // Display other users' locations
  return (
    <div>
      <h3>Active Users:</h3>
      {userActivities.map((activity) => (
        <div key={activity.userId}>
          {activity.userName}: {activity.bookName} {activity.chapter}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 5: Accessing Global Functions

```tsx
// Global functions are available on globalThis
function MyExtension() {
  const handleOpenPassage = () => {
    // Navigate to John 3:16
    (globalThis as any).Open(43, 3, "ESV");
  };

  const handleNextChapter = () => {
    (globalThis as any).OpenNextChapter();
  };

  return (
    <div>
      <button onClick={handleOpenPassage}>Go to John 3:16</button>
      <button onClick={handleNextChapter}>Next Chapter</button>
    </div>
  );
}
```

### Pattern 6: Working with Spaces

```tsx
import { useTabsContext } from "@packages/seed-bible/app/hooks/tabs";

function MyExtension() {
  const { spaces, activeSpace, addSpace, updateSpace } = useTabsContext();

  const createCustomSpace = () => {
    addSpace({
      id: "mySpace",
      name: "My Custom Space",
      theme: "dark",
      layout: {
        panels: 2,
        tools: ["verseCounter", "myExtension"],
      },
    });
  };

  return (
    <div>
      <h3>Current Space: {activeSpace?.name}</h3>
      <button onClick={createCustomSpace}>Create Space</button>
    </div>
  );
}
```

---

## Debugging and Testing

### Opening System Portal

The System Portal provides deep access to CasualOS internals:

```bash
# In REPL
> .system
```

Or launch with system portal enabled:

```
https://ao.bot/?pattern=SeedBibleDev&systemPortal=true
```

### Console Debugging

```tsx
// CasualOS toast notifications
os.toast("Debug message");

// Standard console
console.log("Data:", data);

// Inspect bot state
const bot = getBot("#myBotTag");
console.log("Bot state:", bot);
```

### Debugging Hooks

```tsx
import { useBibleContext } from "@packages/seed-bible/app/hooks/bibleVariables";

function MyExtension() {
  const context = useBibleContext();

  useEffect(() => {
    console.log("Context updated:", context);
  }, [context]);
}
```

### Common Issues

**Issue:** Extension doesn't appear in toolbar

- **Solution:** Check that `configEditor.toolbarConfig` is properly configured in `extension.json`
- Verify the global toggle function is registered: `globalThis.toggleMyExtension`

**Issue:** Hook returns undefined

- **Solution:** Ensure you're using hooks inside the React component tree
- Verify the provider is mounted above your component

**Issue:** Changes don't appear after reload

- **Solution:** Use `.save [Extension]` before `.reload`
- Check that TypeScript compiled successfully with `pnpm build`

**Issue:** CasualOS shout not working

- **Solution:** Check shout name spelling (case-sensitive)
- Verify bot is listening for that shout in its tags

### Testing Extensions

```bash
# Run Jest tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests for specific extension
pnpm test packages/MyExtension
```

Example test:

```tsx
import { render, screen } from "@testing-library/react";
import { VerseCounter } from "./VerseCounter";

describe("VerseCounter", () => {
  it("displays word count", () => {
    render(<VerseCounter />);
    expect(screen.getByText(/words/i)).toBeInTheDocument();
  });
});
```

---

## Next Steps

### Learn More

1. **[EXTENSION_DEVELOPMENT_GUIDE.md](EXTENSION_DEVELOPMENT_GUIDE.md)** - Deep dive into extension architecture
2. **[API_REFERENCE.md](API_REFERENCE.md)** - Complete hooks and API documentation
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
4. **[CasualOS Documentation](https://docs.casualos.com)** - Platform fundamentals

### Explore Example Extensions

Study existing extensions to learn patterns:

- **[Assistant](../Assistant/)** - AI Voice Assistant integration
- **[Bible Stack](../Bible%20Stack/)** - 3D visualization with Canvas
- **[Tabernacle](../Tabernacle/)** - Complex 3D environment
- **[Scripture Map](../Scripture%20Map%202D/)** - Geographic visualization
- **[Playlist](../Playlist/)** - Recording and playback features

### Join the Community

- **GitHub:** [github.com/HelloAOLab/seed-bible](https://github.com/HelloAOLab/seed-bible)
- **Issues:** Report bugs and request features
- **Discussions:** Ask questions and share ideas
- **Pull Requests:** Contribute code and documentation

### Contribution Guidelines

1. **Fork the repository** and create a feature branch
2. **Follow existing patterns** and code style
3. **Write tests** for new functionality
4. **Update documentation** for API changes
5. **Submit a pull request** with clear description

---

## Summary

You now have:

✅ A working development environment
✅ Understanding of core concepts
✅ Your first extension built and running
✅ Knowledge of common development patterns
✅ Debugging and testing strategies

**Next:** Dive into [EXTENSION_DEVELOPMENT_GUIDE.md](EXTENSION_DEVELOPMENT_GUIDE.md) to learn advanced extension patterns, or explore [API_REFERENCE.md](API_REFERENCE.md) for complete API documentation.

Happy coding! 🚀
