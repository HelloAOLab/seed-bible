import { TwitchIcon, AppIcon } from "./icons";
import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { CreateTwitchPubState } from "./twitchPubManager";
import initializeTwitchBot from "./initializeTwitchBot";
import { createTranscriptionManager } from "@seed-bible/ai-transcript-extension/transcriptionManager";
import App from "./App";
import TwitchHeader from "./header";

export default function initTwitchPubExtension() {
  registerExtension({
    id: "ext_twitchPub",
    init: function* (context: SeedBibleState) {
      const transcriptionManager = createTranscriptionManager(context);
      const twitchPubState = CreateTwitchPubState({
        toast: context.app.toast,
        seedBibleState: context,
        transcriptionManager,
      });
      // register a new tool
      yield context.tools.registerToolbarTool({
        id: "ext_twitchPub",
        title: {
          key: "toolbarTitle",
          defaultValue: "Twitch Panel",
          ns: "ext_twitchPub",
        },
        icon: () => <AppIcon style={{ width: "24px", height: "24px" }} />,
        onSelect: () => {
          twitchPubState.interfaceEnabled.value =
            !twitchPubState.interfaceEnabled.value;
        },
        priority: 950,
      });

      effect(() => {
        if (
          !twitchPubState.interfaceEnabled.value &&
          twitchPubState.currentPane.value
        ) {
          context.panes.closePane(twitchPubState.currentPane.value.id);
          twitchPubState.currentPane.value = null;
          transcriptionManager.stopLive();
        } else if (
          twitchPubState.interfaceEnabled.value &&
          !twitchPubState.currentPane.value
        ) {
          twitchPubState.currentPane.value = context.panes.openPane({
            placement: "floating",
            component: () => {
              return <App state={twitchPubState} i18n={context.i18n} />;
            },
            title: "Twitch",
            header: () => <TwitchHeader state={twitchPubState} />,
            icon: () => (
              <TwitchIcon style={{ width: "24px", height: "24px" }} />
            ),
            onUserClose: () => {
              twitchPubState.interfaceEnabled.value = false;
            },
          });
        }
      });

      yield effect(() => {
        if (context.app.currentReadingState.value) {
          twitchPubState.handleSeedBibleUpdate(context);
          const chapterHighlights = context.highlights.getChapterHighlights(
            context.app.currentReadingState.value.translationId ?? "ABB",
            context.app.currentReadingState.value.bookId ?? "GEN",
            context.app.currentReadingState.value.chapterNumber ?? 1
          );
          if (chapterHighlights.value.highlights.length > 0) {
            twitchPubState.handleHighlightUpdate(
              chapterHighlights.value.highlights,
              context.app.currentReadingState.value?.bookId || "GEN",
              context.app.currentReadingState.value?.chapterNumber || 1
            );
          }
        }
      });

      yield effect(() => {
        const { broadcasterId, clientId, userAccessToken, senderId } =
          twitchPubState.twitchConfig.value;
        if (
          broadcasterId.value &&
          clientId.value &&
          userAccessToken.value &&
          senderId.value
        ) {
          initializeTwitchBot({
            broadcasterId,
            senderId,
            userAccessToken,
            clientId,
            qrValue: twitchPubState.qrValue,
          });
        }
      });
    },
  });
}
