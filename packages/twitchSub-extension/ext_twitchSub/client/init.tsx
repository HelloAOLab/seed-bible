import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { CreateTwitchSubState } from "./twitchSubManager";
import TwitchHeader from "./header";
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
              return (
                <App
                  wsPaused={twitchSubState.wsPaused}
                  settingsOpened={twitchSubState.settingsOpened}
                  settings={twitchSubState.settings}
                  i18n={context.i18n}
                  isMobile={context.app.isMobile.value}
                />
              );
            },
            title: "Twitch Settings",
            header: () => (
              <TwitchHeader settingsOpened={twitchSubState.settingsOpened} />
            ),
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
