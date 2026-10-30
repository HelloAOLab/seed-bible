import { App } from "@capacitor/app";
import { readInjectedConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import {
  handleLinkClick,
  openLaunchLinkInApp,
  openLinkInApp,
  type NativeLinkContext,
} from "./nativeLinks";

// Entry point loaded only by the native app build (added to index.html by
// `script/lib/vite-plugin-native-shell.ts`), so the website never downloads
// Capacitor.

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const { publicOrigin } = readInjectedConfig();

if (publicOrigin) {
  const context: NativeLinkContext = {
    publicOrigin,
    currentHref: () => window.location.href,
    reloadAt: (href, { replace }) => {
      // Setting `location` directly would be caught by the app's own
      // Navigation API handler (NavigationManager) and turned into an
      // in-page update instead of a fresh start.
      if (replace) {
        window.history.replaceState(null, "", href);
      } else {
        window.history.pushState(null, "", href);
      }
      window.location.reload();
    },
    storage: getSessionStorage(),
    now: () => Date.now(),
  };

  document.addEventListener("click", (event) => {
    handleLinkClick(event, context, (href) => window.location.assign(href));
  });

  void App.addListener("appUrlOpen", ({ url }) => {
    openLinkInApp(url, context);
  });

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      openLaunchLinkInApp(launch.url, context);
    }
  });
}
