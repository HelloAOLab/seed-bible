import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { createTranscriptionManager } from "@seed-bible/ai-transcript-extension/transcriptionManager";
import { App } from "./App";
import { ManagerProvider } from "./context";
import type { Pane } from "seed-bible/managers";

export default function initTranscriptUI() {
  registerExtension({
    id: "ext_AI_Transcript_UI",
    init: function* (context: SeedBibleState) {
      const transcriptionManager = createTranscriptionManager(context);

      let currentPane: Pane | null = null;
      // register a new tool
      yield context.tools.registerToolbarTool({
        id: "ext_AI_Transcript_UI",
        title: {
          key: "toolbarTitle",
          defaultValue: "AI Transcript",
          ns: "ext_AI_Transcript_UI",
        },
        icon: () => (
          <span class="material-symbols-outlined">speaker_notes</span>
        ),
        onSelect: async () => {
          if (!currentPane) {
            currentPane = context.panes.openPane({
              type: "attached",
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

            await transcriptionManager.checkLogin();

            if (!transcriptionManager.isLoggedIn && currentPane) {
              context.panes.closePane(currentPane.id);
              currentPane = null;
            }
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
}
