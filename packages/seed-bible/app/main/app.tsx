const { useState } = os.appHooks;

import { MainContent } from "app.main.main";
import { BibleVariablesProvider } from "app.hooks.bibleVariables";
import { TabsProvider } from "app.hooks.tabs";
import { SideBarProvider } from "app.hooks.sideBar";
import { mainController } from "app.controller.controllerBuilder";
import { getBrowserLanguage, changeLanguage } from "app.hooks.i18n";
import { WelcomeModal } from "app.components.welcomeModal";
import { AddToHomeScreen } from "app.components.addToHomeScreen";

function getPWADisplayMode() {
  if (document.referrer.startsWith("android-app://")) return "twa";
  if (window.matchMedia("(display-mode: browser)").matches) return "browser";
  if (window.matchMedia("(display-mode: standalone)").matches)
    return "standalone";
  if (window.matchMedia("(display-mode: minimal-ui)").matches)
    return "minimal-ui";
  if (window.matchMedia("(display-mode: fullscreen)").matches)
    return "fullscreen";
  if (window.matchMedia("(display-mode: window-controls-overlay)").matches)
    return "window-controls-overlay";
  return "unknown";
}

function isPWA() {
  const mode = getPWADisplayMode();
  return mode !== "unknown" && mode !== "browser";
}

type ModalState = "welcome" | "postEnter" | "none";

/**
 * The default application component concerned with root composition.
 */
export function App() {
  if (localStorage.getItem("seedBibleLangSelected") !== "true") {
    const lang = getBrowserLanguage();
    changeLanguage(lang);
    localStorage.setItem("seedBibleLangSelected", "true");
  }

  const [modalState, setModalState] = useState<ModalState>(() => {
    if (localStorage.getItem("seedBibleWelcomeShown") === "true") return "none";
    if (isPWA()) return "none";
    return "welcome";
  });

  const handleWelcomeContinue = () => {
    localStorage.setItem("seedBibleWelcomeShown", "true");
    setModalState("postEnter");
  };

  const handleDismiss = () => {
    localStorage.setItem("seedBibleWelcomeShown", "true");
    setModalState("none");
  };

  return (
    <BibleVariablesProvider>
      <TabsProvider>
        <SideBarProvider>
          {modalState === "welcome" && (
            <WelcomeModal
              onContinue={handleWelcomeContinue}
              onDismiss={handleDismiss}
            />
          )}
          {modalState === "postEnter" && (
            <AddToHomeScreen onDismiss={handleDismiss} />
          )}
          <MainContent controller={mainController} />
        </SideBarProvider>
      </TabsProvider>
    </BibleVariablesProvider>
  );
}
