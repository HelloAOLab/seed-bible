import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { createTranscriptionManager } from "@seed-bible/ai-transcript-extension/transcriptionManager";
import { App } from "./App";
import { ManagerProvider } from "./context";
import type { Pane } from "seed-bible/managers";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";

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
              placement: "side",
              component: () => {
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
              title: () => {
                const { t } = useI18n();
                return t("title", {
                  ns: "ext_AI_Transcript_UI",
                  defaultValue: "AI Transcript",
                });
              },
              onClose: () => {
                if (currentPane) {
                  context.panes.closePane(currentPane.id);
                  currentPane = null;
                }
              },
            });

            const { login } = context;
            if (!login.userId.value && currentPane) {
              const userInfo = await login.login().catch(() => {
                if (currentPane) {
                  context.panes.closePane(currentPane.id);
                  currentPane = null;
                }
              });
              if (!userInfo) {
                context.panes.closePane(currentPane.id);
                currentPane = null;
              } else {
                transcriptionManager.askForDonation();
              }
            } else {
              transcriptionManager.askForDonation();
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
