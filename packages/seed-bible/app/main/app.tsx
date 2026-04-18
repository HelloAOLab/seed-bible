const { useState } = os.appHooks;

import { MainContent } from "app.main.main";
import { BibleVariablesProvider } from "app.hooks.bibleVariables";
import { TabsProvider } from "app.hooks.tabs";
import { SideBarProvider } from "app.hooks.sideBar";
import { mainController } from "app.controller.controllerBuilder";
import { getBrowserLanguage, changeLanguage } from "app.hooks.i18n";
import { WelcomeModal } from "app.components.welcomeModal";

/**
 * The default application component concerned with root composition.
 */
export function App() {
  if (localStorage.getItem("seedBibleLangSelected") !== "true") {
    const lang = getBrowserLanguage();
    changeLanguage(lang);
    localStorage.setItem("seedBibleLangSelected", "true");
  }

  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem("seedBibleWelcomeShown") !== "true"
  );

  const handleWelcomeContinue = () => {
    localStorage.setItem("seedBibleWelcomeShown", "true");
    setShowWelcome(false);
  };

  return (
    <BibleVariablesProvider>
      <TabsProvider>
        <SideBarProvider>
          {showWelcome && <WelcomeModal onContinue={handleWelcomeContinue} />}
          <MainContent controller={mainController} />
        </SideBarProvider>
      </TabsProvider>
    </BibleVariablesProvider>
  );
}
