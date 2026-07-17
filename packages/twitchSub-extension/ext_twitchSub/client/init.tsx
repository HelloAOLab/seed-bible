import { TwitchIcon } from "./icons";
import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { CreateTwitchSubState } from "./twitchSubManager";
import App from "./App";

export default function initTwitchSubExtension() {
  registerExtension({
    id: "ext_twitchSub",
    init: function* (context: SeedBibleState) {
      const twitchSubState = CreateTwitchSubState(context);

      yield effect(() => {
        if (
          twitchSubState.settingsOpened.value &&
          !twitchSubState.currentPane.value
        ) {
          twitchSubState.currentPane.value = context.panes.openPane({
            placement: "floating",
            component: () => {
              return <App twitchSubState={twitchSubState} context={context} />;
            },
            title: "Twitch",
            icon: () => (
              <TwitchIcon style={{ width: "24px", height: "24px" }} />
            ),
            onClose: () => {
              twitchSubState.settingsOpened.value = false;
            },
          });
        } else if (
          !twitchSubState.settingsOpened.value &&
          twitchSubState.currentPane.value
        ) {
          context.panes.closePane(twitchSubState.currentPane.value.id);
          twitchSubState.currentPane.value = null;
        }
      });
    },
  });
}
