import DraggableContainer from "./DraggableContainer";
import TwitchSettings from "./TwitchSettings";
import { type TwitchSubInterface } from "./interface";
import "./App.css";

function App(props: {
  settings: TwitchSubInterface["settings"];
  wsPaused: TwitchSubInterface["wsPaused"];
  settingsOpened: TwitchSubInterface["settingsOpened"];
}) {
  return (
    <>
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
    </>
  );
}

export default App;
