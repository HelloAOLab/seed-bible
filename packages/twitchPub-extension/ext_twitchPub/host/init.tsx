import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { CreateTwitchPubState } from "ext_twitchPub.host.twitchPubManager";
import initializeTwitchBot from "ext_twitchPub.host.initializeTwitchBot";
import {
  createTranscriptionManager,
  type TranscriptionManager,
} from "ext_AI_Transcript.main.transcriptionManager";

registerExtension({
  id: "ext_twitchPub",
  init: function* (context: SeedBibleState) {
    const transcriptionManager: TranscriptionManager =
      createTranscriptionManager();
    const twitchPubState = CreateTwitchPubState({
      transcriptionManager: transcriptionManager,
      seedBibleState: context,
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
        if (!twitchPubState.interfaceEnabled.value) {
          twitchPubState.interfaceEnabled.value = true;
          thisBot.openInterface({ state: twitchPubState });
        } else {
          twitchPubState.interfaceEnabled.value = false;
          thisBot.closeInterface();
        }
      },
      priority: 950,
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
