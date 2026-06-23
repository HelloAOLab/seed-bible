import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { createTranscriptionManager } from "ext_AI_Transcript.main.transcriptionManager";
import { App } from "ext_AI_Transcript.main.App";
import { ManagerProvider } from "ext_AI_Transcript.main.context";
import type { Pane } from "seed-bible.managers.PanesManager";

registerExtension({
  id: "ext_AI_Transcript",
  init: function* (context: SeedBibleState) {
    const transcriptionManager = createTranscriptionManager();

    let currentPane: Pane | null = null;
    // register a new tool
    yield context.tools.registerToolbarTool({
      id: "ext_AI_Transcript",
      title: {
        key: "toolbarTitle",
        defaultValue: "AI Transcript",
        ns: "ext_AI_Transcript",
      },
      icon: () => <span class="material-symbols-outlined">home</span>,
      onSelect: () => {
        if (!currentPane) {
          currentPane = context.panes.openPane({
            type: "attached",
            detachedAnchor: "side",
            component: () => {
              // You can use the useI18n hook in your tool component to get translated strings
              return (
                <ManagerProvider
                  value={{
                    transcriptionManager: transcriptionManager,
                    seedBibleState: context,
                  }}
                >
                  <App />
                </ManagerProvider>
              );
            },
          });
        } else {
          context.panes.closePane(currentPane.id);
          currentPane = null;
        }
      },
      priority: 950,
    });

    yield effect(() => {});
  },
});
