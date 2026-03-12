import { registerExtension, type ExtensionContext } from "seed-bible.app.api";

registerExtension({
  id: "example-extension",
  init: (context: ExtensionContext) => {
    console.log("Example extension initialized with context:", context);

    // register a new tool
    context.tools.registerToolbarTool({
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
  },
});
