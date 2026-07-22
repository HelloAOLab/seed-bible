import { TwitchIcon } from "./icons";
import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { CreateTwitchSubState, addTwitchIcon } from "./twitchSubManager";
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

      // Inject the Twitch icon into the reader header once the socket is live
      // and there's a reading state. The header renders a beat after the
      // reading state is set, so wait briefly for its container to exist.
      // Re-runs when the viewport switches between mobile/desktop so the icon
      // lands in the right header at the right size. The timeout is cleared on
      // each re-run and on teardown so stale timers can't stack up or fire
      // after the extension is gone.
      yield effect(() => {
        void context.app.isMobile.value;
        if (
          twitchSubState.websocketSessionID.value &&
          twitchSubState.webSocketClient.value &&
          context.app.currentReadingState.value
        ) {
          const timeoutId = setTimeout(() => {
            addTwitchIcon({
              wsPaused: twitchSubState.wsPaused,
              settingsOpened: twitchSubState.settingsOpened,
              isMobile: context.app.isMobile.value,
            });
          }, 200);
          return () => clearTimeout(timeoutId);
        }
        return undefined;
      });

      // Remove the injected icon when the extension is torn down so it isn't
      // left orphaned in the reader header.
      yield () => {
        document.getElementById("twitch-extension-icon")?.remove();
      };
    },
  });
}
