import { I18nProvider, useI18n } from "../i18n/I18nManager";
import { TabsLayout } from "../components/TabsLayout";
import {
  PaneLayout,
  SidePane,
  FullscreenPane,
} from "../components/PaneLayout/PaneLayout";
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
  useAppConfig,
  type AppConfig,
} from "./appConfig";
import { isWebKit } from "./ssrEnv";
// Foundation stylesheets — must load before any component's co-located CSS.
// `variables` (the :root tokens) and `base` (html/body reset) come first so
// every component rule resolves against them.
import "./styles/base.css";
import "./styles/utilities.css";
import {
  OnboardingModals,
  LanguageUnavailableModal,
  UiLanguageSwitchModal,
} from "../components/Onboarding/Onboarding";
import { Tutorial } from "../components/Tutorial/Tutorial";
import { TutorialPrompt } from "../components/TutorialPrompt/TutorialPrompt";
import { OfflineDownloadPrompt } from "../components/OfflineDownloadPrompt/OfflineDownloadPrompt";

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
      <link
        href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
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
  // Split into two components rather than conditionally skipping `useMemo`
  // below (`initialState ?? useMemo(...)`): every real caller always passes
  // `initialState`, but if one ever didn't across a re-render, that would
  // change which hooks this component instance calls, which Preact requires
  // to stay identical for the component's lifetime. Choosing which of two
  // components to render carries no such requirement — each has its own,
  // internally-fixed hook sequence.
  return initialState ? (
    <MainWithState appConfig={appConfig} initialState={initialState} />
  ) : (
    <MainCreatingState appConfig={appConfig} initialHref={initialHref} />
  );
}

function MainWithState({
  appConfig,
  initialState,
}: {
  appConfig: AppConfig;
  initialState: ReturnType<typeof createSeedBibleState>;
}) {
  return <MainBody appConfig={appConfig} state={initialState} />;
}

function MainCreatingState({
  appConfig,
  initialHref,
}: {
  appConfig: AppConfig;
  initialHref?: string;
}) {
  const state = useMemo(
    () => createSeedBibleState({ config: appConfig, initialHref }),
    []
  );
  return <MainBody appConfig={appConfig} state={state} />;
}

function MainBody({
  appConfig,
  state,
}: {
  appConfig: AppConfig;
  state: ReturnType<typeof createSeedBibleState>;
}) {
  // Dev-only escape hatch for poking at live managers from the browser
  // console (e.g. `window.__seedBible.login`) — never runs in production.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __seedBible?: typeof state }).__seedBible = state;
  }

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

function MainContent(props: {
  state: ReturnType<typeof createSeedBibleState>;
}) {
  const { state } = props;
  const { isRtl } = useI18n();
  const { renderedAsWebKit } = useAppConfig();
  const webkitClass = isWebKit(renderedAsWebKit) ? "is-webkit" : "";
  const appDirection = isRtl ? "rtl" : "ltr";
  const { theme, selector } = state;
  const sidePane =
    state.app.effectivePanes.value.find((pane) => pane.placement === "side") ??
    null;
  const fullscreenPane =
    state.app.effectivePanes.value.find(
      (pane) => pane.placement === "fullscreen"
    ) ?? null;

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
          height: "100dvh",
          overflow: "hidden",
        }}
      >
        <ExternalResourceDependencies
          themeCssVariables={theme.themeCssVariables}
          themeCssClasses={theme.themeCssClasses}
        />
        <Sidebar state={state} />

        <div className="sb-content-row">
          <main className="sb-main-content">
            <TabsLayout state={state} />
          </main>
          {sidePane && <SidePane state={state} pane={sidePane} />}
          {fullscreenPane && (
            <FullscreenPane state={state} pane={fullscreenPane} />
          )}
        </div>

        <PaneLayout state={state} />

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

        <OfflineDownloadPrompt
          offline={state.bibleData.offline}
          toast={state.app.toast}
          className={`${webkitClass}`}
        />

        <Tutorial
          tutorial={state.tutorial}
          className={`${webkitClass}`}
          groupFilter="non-selector"
        />

        <LanguageUnavailableModal className={`${webkitClass}`} />

        <UiLanguageSwitchModal className={`${webkitClass}`} />
      </div>
    </>
  );
}
