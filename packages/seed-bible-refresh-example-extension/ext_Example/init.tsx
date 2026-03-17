import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

const cleanup = registerExtension({
  id: "example-extension",
  init: function* (context: SeedBibleState) {
    console.log("Example extension initialized with context:", context);

    // register a new tool
    yield context.tools.registerToolbarTool({
      id: "my-example-tool",
      title: "My Example Tool",
      icon: () => <span>TOOL!</span>,
      onSelect: () => {
        console.log("Example tool selected!");
        context.panes.openDetachedPane(
          <div style={{ padding: 20 }}>Hello from the example extension!</div>
        );
      },
      priority: 100,
    });

    yield context.tools.registerVerseToolbarTool({
      id: "my-verse-tool",
      title: "My Verse Tool",
      icon: () => <span>VERSE!</span>,
      onSelect: (context) => {
        console.log("Example verse tool selected with context:", context);
        console.log(
          "Selected verse:",
          context.readingState.selectedVerses.value
        );
      },
      priority: 100,
    });

    yield context.tools.registerBelowReaderTool({
      id: "my-below-reader-tool",
      title: "My Below Reader Tool",
      icon: () => <span>BELOW!</span>,
      priority: 100,
    });
  },
});

setTimeout(() => {
  cleanup();
}, 5000);
