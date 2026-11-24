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

const pageStartedAt = Date.now();
const { publicOrigin } = readInjectedConfig();

if (publicOrigin) {
  const context: NativeLinkContext = {
    publicOrigin,
    currentHref: () => window.location.href,
    reloadAt: (href, { replace }) => {
      // Setting `location` instead would be caught and handled in place by
      // NavigationManager wherever the Navigation API can intercept it.
      // A reload is the one navigation it lets through.
      if (replace) {
        window.history.replaceState(null, "", href);
      } else {
        window.history.pushState(null, "", href);
      }
      window.location.reload();
    },
    storage: getSessionStorage(),
    now: () => Date.now(),
    pageStartedAt,
  };

  // `pushState` rather than `location.assign`: NavigationManager picks up
  // `pushState` on every platform, but it can't catch a `location` change in
  // the iOS app (WebKit won't let `capacitor://` pages intercept navigations),
  // so there the tap would restart the app.
  document.addEventListener("click", (event) => {
    handleLinkClick(event, context, (href) =>
      window.history.pushState(null, "", href)
    );
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
