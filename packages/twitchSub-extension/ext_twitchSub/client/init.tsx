import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { CreateTwitchSubState } from "./twitchSubManager";

registerExtension({
  id: "ext_twitchSub",
  init: function* (context: SeedBibleState) {
    const twitchSubState = CreateTwitchSubState(context);

    yield effect(() => {
      console.log("Current Twitch Sub State:", twitchSubState);
    });
  },
});
