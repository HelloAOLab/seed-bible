import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { CreateTwitchSubState } from "ext_twitchSub.client.twitchSubManager";

registerExtension({
  id: "ext_twitchSub.client",
  init: function* (context: SeedBibleState) {
    const twitchSubState = CreateTwitchSubState(context);

    yield effect(() => {
      console.log("Current Twitch Sub State:", twitchSubState);
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
