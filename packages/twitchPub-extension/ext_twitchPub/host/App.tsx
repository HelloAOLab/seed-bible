import Login from "./Login";
import Authorization from "./Authenticate";
import TwitchInterface from "./TwitchInterface";
import TwitchSettings from "./TwitchSettings";
import { type TwitchPubState } from "./interface";
import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n";
import type { SeedBibleState } from "seed-bible";
import "./App.css";

function App(props: { state: TwitchPubState; i18n: SeedBibleState["i18n"] }) {
  const { state, i18n } = props;
  const page = state.currentPage.value;

  return (
    <>
      <I18nProvider i18n={i18n}>
        <div className="twitchPub-container">
          {page === "login" && <Login state={state} />}
          {page === "authorization" && <Authorization />}
          {page === "interface" && <TwitchInterface state={state} />}
          {page === "settings" && <TwitchSettings state={state} />}
        </div>
      </I18nProvider>
    </>
  );
}

export default App;
