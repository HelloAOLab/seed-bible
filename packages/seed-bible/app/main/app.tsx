import { MainContent } from "app.main.main";
import { BibleVariablesProvider } from "app.hooks.bibleVariables";
import { GlobalsContextProvider } from "app.hooks.globalsContext";
import { TabsProvider } from "app.hooks.tabs";
import { SideBarProvider } from "app.hooks.sideBar";
import { mainController } from "app.controller.controllerBuilder";

/**
 * The default application component concerned with root composition.
 */
export function App() {
  return (
    <GlobalsContextProvider>
      <BibleVariablesProvider>
        <TabsProvider>
          <SideBarProvider>
            <MainContent controller={mainController} />
          </SideBarProvider>
        </TabsProvider>
      </BibleVariablesProvider>
    </GlobalsContextProvider>
  );
}
