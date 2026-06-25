import DraggableContainer from "./DraggableContainer";
import TwitchSettings from "./TwitchSettings";
import { type TwitchSubInterface } from "./interface";
import "./App.css";
import type { SeedBibleState } from "seed-bible";
import { I18nProvider } from "seed-bible/i18n";

function App(props: {
  settings: TwitchSubInterface["settings"];
  wsPaused: TwitchSubInterface["wsPaused"];
  settingsOpened: TwitchSubInterface["settingsOpened"];
  i18n: SeedBibleState["i18n"];
}) {
  return (
    <>
      <I18nProvider i18n={props.i18n}>
        <DraggableContainer>
          {
            (
              <div className="twitchSub-container">
                <TwitchSettings
                  settings={props.settings}
                  wsPaused={props.wsPaused}
                  settingsOpened={props.settingsOpened}
                />
              </div>
            ) as unknown as HTMLElement
          }
        </DraggableContainer>
      </I18nProvider>
    </>
  );
}

export default App;
