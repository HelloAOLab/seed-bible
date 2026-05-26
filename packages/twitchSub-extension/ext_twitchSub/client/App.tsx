import DraggableContainer from "ext_twitchSub.client.DraggableContainer";
import TwitchSettings from "ext_twitchSub.client.TwitchSettings";
import { type TwitchSubInterface } from "ext_twitchSub.client.interface";
const style = thisBot.tags["App.css"];

function App(props: {
  settings: TwitchSubInterface["settings"];
  wsPaused: TwitchSubInterface["wsPaused"];
  settingsOpened: TwitchSubInterface["settingsOpened"];
}) {
  return (
    <>
      <style>{style}</style>
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
