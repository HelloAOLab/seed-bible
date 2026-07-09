import { I18nProvider, useI18n } from "../i18n/I18nManager";
import {} from "../i18n/I18nManager";
import { PaneLayout } from "../components/PaneLayout/PaneLayout";
import { BibleSelector } from "../components/BibleSelector/BibleSelector";
import { BibleReaderToolbar } from "../components/BibleReaderToolbar/BibleReaderToolbar";
import { FloatingReaderPanels } from "../components/FloatingReaderPanels/FloatingReaderPanels";
import { Sidebar, SharedSessionsToasts } from "../components/Tabs/Tabs";
import { createSeedBibleState } from "../managers/SeedBibleStateManager";
import { useEffect } from "preact/hooks";
import { useSignalEffect, type ReadonlySignal } from "@preact/signals";
import { closeContextMenus } from "../components/ContextMenu/ContextMenu";
import { ModalHost } from "../components/ModalHost/ModalHost";
import { ToastHost } from "../components/ToastHost/ToastHost";
import { LoginModal } from "../components/LoginModal/LoginModal";
import { TermsOfServiceModal } from "../components/TermsOfServiceModal/TermsOfServiceModal";
import { PrivacyPolicyModal } from "../components/PrivacyPolicyModal/PrivacyPolicyModal";
import { CodeOfConductModal } from "../components/CodeOfConductModal/CodeOfConductModal";
import { useMemo } from "preact/hooks";
import {
  AppConfigProvider,
  DEFAULT_APP_CONFIG,
  type AppConfig,
} from "./appConfig";
// Foundation stylesheets — must load before any component's co-located CSS.
// `variables` (the :root tokens) and `base` (html/body reset) come first so
// every component rule resolves against them.
import "./styles/base.css";
import "./styles/utilities.css";
import {
  OnboardingModals,
  LanguageUnavailableModal,
} from "../components/Onboarding/Onboarding";
import { Tutorial } from "../components/Tutorial/Tutorial";
import { TutorialPrompt } from "../components/TutorialPrompt/TutorialPrompt";

/**
 * A collection of link/script's providing expected resources from external sources.
 * @returns
 */
export function ExternalResourceDependencies({
  themeCssVariables,
  themeCssClasses,
}: {
  themeCssVariables: ReadonlySignal<string>;
  themeCssClasses: ReadonlySignal<string>;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@100,200,300,400,500,600,700,800,900&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
      <style>{`body {\n${themeCssVariables}\n}`}</style>
      <style>{themeCssClasses}</style>
    </>
  );
}

export function Main({
  config: appConfig = DEFAULT_APP_CONFIG,
  initialHref,
  initialState,
}: {
  /** Deployment config (base path + asset host) injected by the host server. */
  config?: AppConfig;
  /** Full initial URL — passed during SSR where `window` is absent. */
  initialHref?: string;

  initialState?: ReturnType<typeof createSeedBibleState>;
} = {}) {
  const state =
    initialState ??
    useMemo(() => createSeedBibleState({ config: appConfig, initialHref }), []);

  useEffect(() => {
    state.extensions.loadDefaultExtensions();
  }, []);

  if (typeof document !== "undefined") {
    useSignalEffect(() => {
      document.title = state.app.title.value;
    });
  }

  return (
    <AppConfigProvider value={appConfig}>
      <I18nProvider i18n={state.i18n}>
        <MainContent state={state} />
      </I18nProvider>
    </AppConfigProvider>
  );
}

// From https://rnwest.engineer/detect-webkit/
function isWebKit() {
  const ua = navigator.userAgent;
  // As far as I can tell, Chromium-based desktop browsers are the only browsers
  // that pretend to be WebKit-based but aren't.
  return (
    (/AppleWebKit/.test(ua) && !/Chrome/.test(ua)) ||
    /\b(iPad|iPhone|iPod)\b/.test(ua)
  );
}

const isWebKitBrowser = isWebKit();
const webkitClass = isWebKitBrowser ? "is-webkit" : "";

function MainContent(props: {
  state: ReturnType<typeof createSeedBibleState>;
}) {
  const { state } = props;
  const { isRtl } = useI18n();
  const appDirection = isRtl ? "rtl" : "ltr";
  const { theme, selector } = state;

  return (
    <>
      <div
        className={`sb-app-root ${webkitClass}`}
        dir={appDirection}
        onClick={(e) => {
          if (!e.defaultPrevented) {
            closeContextMenus();
          }
        }}
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <ExternalResourceDependencies
          themeCssVariables={theme.themeCssVariables}
          themeCssClasses={theme.themeCssClasses}
        />
        <Sidebar state={state} />

        <main className="sb-main-content">
          <PaneLayout state={state} />
        </main>

        <ToastHost app={state.app} />

        {/* The selector draws its own tour spotlight/popover internally
              (CSS dim toggled off the tutorial signals), since its elements
              live in this portal's shadow root and can't be measured from
              the main tour overlay. */}
        <BibleSelector
          className={`${webkitClass}`}
          isOpen={selector.isOpen.value}
          onClose={() => selector.setOpen(false)}
          app={state.app}
          selectorState={selector}
          bibleDataManager={state.bibleData}
          tutorial={state.tutorial}
        />

        <FloatingReaderPanels state={state} />

        <BibleReaderToolbar state={state} />

        <SharedSessionsToasts state={state} />

        <ModalHost manager={state.modals} />

        <LoginModal login={state.login} navigation={state.navigation} />

        <TermsOfServiceModal
          isOpen={state.isTermsOpen.value}
          onClose={() => state.closeTerms()}
        />

        <PrivacyPolicyModal
          isOpen={state.isPrivacyOpen.value}
          onClose={() => state.closePrivacy()}
        />

        <CodeOfConductModal
          isOpen={state.isCodeOfConductOpen.value}
          onClose={() => state.closeCodeOfConduct()}
        />

        <OnboardingModals
          onboarding={state.onboarding}
          os={state.os}
          toast={state.app.toast}
          className={`${webkitClass}`}
        />

        <TutorialPrompt
          tutorial={state.tutorial}
          className={`${webkitClass}`}
        />

        <Tutorial
          tutorial={state.tutorial}
          className={`${webkitClass}`}
          groupFilter="non-selector"
        />

        <LanguageUnavailableModal className={`${webkitClass}`} />
      </div>
    </>
  );
}
