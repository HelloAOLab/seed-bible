import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { CreateTwitchPubState } from "./twitchPubManager";
import initializeTwitchBot from "./initializeTwitchBot";
import { closeInterface } from "./closeInterface";
import { openInterface } from "./openInterface";
import { createTranscriptionManager } from "@seed-bible/ai-transcript-extension/transcriptionManager";

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
      icon: () => (
        <img
          src="https://res.cloudinary.com/dacw0qnpr/image/upload/v1774035767/Vector_6_if8usw.svg"
          style={{
            width: "24px",
            height: "24px",
            objectFit: "contain",
          }}
        />
      ),
      onSelect: () => {
        twitchPubState.interfaceEnabled.value =
          !twitchPubState.interfaceEnabled.value;
      },
      priority: 950,
    });

    effect(() => {
      if (!twitchPubState.interfaceEnabled.value) {
        console.log("Closing interface");
        closeInterface();
        transcriptionManager.stopLive();
      } else {
        openInterface({ state: twitchPubState, context });
        console.log("Opening interface");
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
