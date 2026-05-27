import DraggableContainer from "ext_twitchPub.host.DraggableContainer";
import Login from "ext_twitchPub.host.Login";
import Authorization from "ext_twitchPub.host.Authenticate";
import TwitchInterface from "ext_twitchPub.host.TwitchInterface";
import TwitchSettings from "ext_twitchPub.host.TwitchSettings";
import { type TwitchPubState } from "ext_twitchPub.host.interface";
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
