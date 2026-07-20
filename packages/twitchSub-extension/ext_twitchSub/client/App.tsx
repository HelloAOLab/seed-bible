import TwitchSettings from "./TwitchSettings";
import { type TwitchSubInterface } from "./interface";
import "./App.css";
import type { SeedBibleState } from "seed-bible";
import { I18nProvider } from "seed-bible/i18n";

function App(props: {
  twitchSubState: TwitchSubInterface;
  context: SeedBibleState;
}) {
  const { twitchSubState, context } = props;
  return (
    <>
      <I18nProvider i18n={context.i18n}>
        {
          (
            <div className="twitchSub-container">
              <TwitchSettings
                twitchSubState={twitchSubState}
                context={context}
              />
            </div>
          ) as unknown as HTMLElement
        }
      </I18nProvider>
    </>
  );
}

export default App;
