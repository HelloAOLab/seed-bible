import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { CreateTwitchPubState } from "ext_twitchPub.host.twitchPubManager";
import initializeTwitchBot from "ext_twitchPub.host.initializeTwitchBot";

const twitchPubState = CreateTwitchPubState();

registerExtension({
  id: "example-extension",
  init: function* (context: SeedBibleState) {
    console.log("Example extension initialized with context:", context);

    // register a new tool
    yield context.tools.registerToolbarTool({
      id: "ext_twitchPub",
      title: {
        key: "title",
        defaultValue: "Twitch Pub Extension",
        ns: "ext_twitchPub",
      },
      icon: () => (
        <img
          src="https://res.cloudinary.com/dacw0qnpr/image/upload/v1774035767/Vector_6_if8usw.svg"
          style={{
            width: "25px",
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
      priority: 100,
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
      const bId = twitchPubState.broadcasterId;
      const cId = twitchPubState.clientId;
      const uat = twitchPubState.userAccessToken;
      const senderId = twitchPubState.senderId;
      if (bId && cId && uat && senderId) {
        initializeTwitchBot({
          broadcasterId: bId,
          senderId: senderId,
          userAccessToken: uat,
          clientId: cId,
          qrValue: twitchPubState.qrValue,
        });
      }
    });

    // You can return a value to export functions or data from your extension that can be used by other extensions.
    // For example, this will export a function called "abc" that other extensions can call if they have a reference to this extension.
    return {
      abc: () => {
        console.log("This is an exported function from the example extension!");
      },
    };
  },
});
