import DraggableContainer from "./DraggableContainer";
import Login from "./Login";
import Authorization from "./Authenticate";
import TwitchInterface from "./TwitchInterface";
import TwitchSettings from "./TwitchSettings";
import { type TwitchPubState } from "./interface";
const style = thisBot.tags["App.css"];

function App(props: { state: TwitchPubState }) {
  const { state } = props;
  const page = state.currentPage.value;
  const appContent = (
    <div className="twitchPub-container">
      {page === "login" && <Login state={state} />}
      {page === "authorization" && <Authorization />}
      {page === "interface" && <TwitchInterface state={state} />}
      {page === "settings" && <TwitchSettings state={state} />}
    </div>
  ) as unknown as HTMLElement;

  return (
    <>
      <style>{style}</style>
      <DraggableContainer children={appContent} />
    </>
  );
}

export default App;
