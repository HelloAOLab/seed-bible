import { MainContent } from "app.main.main";
import { BibleVariablesProvider } from "app.hooks.bibleVariables";
import { TabsProvider } from "app.hooks.tabs";
import { SideBarProvider } from "app.hooks.sideBar";
import { mainController } from "app.controller.controllerBuilder";
import { getBrowserLanguage, changeLanguage } from "app.hooks.i18n";

/**
 * The default application component concerned with root composition.
 */
export function App() {
  if (localStorage.getItem("seedBibleLangSelected") !== "true") {
    const lang = getBrowserLanguage();
    changeLanguage(lang);
    localStorage.setItem("seedBibleLangSelected", "true");
  }

  return (
    <BibleVariablesProvider>
      <TabsProvider>
        <SideBarProvider>
          <MainContent controller={mainController} />
        </SideBarProvider>
      </TabsProvider>
    </BibleVariablesProvider>
  );
}
