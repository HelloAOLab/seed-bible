import { MainContent } from "app.main.main";
import { BibleVariablesProvider } from "app.hooks.bibleVariables";
import { TabsProvider } from "app.hooks.tabs";
import { SideBarProvider } from "app.hooks.sideBar";
import { mainController } from "app.controller.controllerBuilder";
import { LanguageSelectModal } from "app.components.languageSelectModal";

const { useState } = os.appHooks;

/**
 * The default application component concerned with root composition.
 */
export function App() {
  const hasSelected = localStorage.getItem("seedBibleLangSelected") === "true";
  const [showLangModal, setShowLangModal] = useState(!hasSelected);

  return (
    <BibleVariablesProvider>
      <TabsProvider>
        <SideBarProvider>
          {showLangModal && (
            <LanguageSelectModal onComplete={() => setShowLangModal(false)} />
          )}
          <MainContent controller={mainController} />
        </SideBarProvider>
      </TabsProvider>
    </BibleVariablesProvider>
  );
}
