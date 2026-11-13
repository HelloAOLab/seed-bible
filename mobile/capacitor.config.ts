import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.seedbible.app",
  appName: "Seed Bible",
  // Built by `vite build --mode native` (see the root vite.config.ts).
  webDir: "../standalone/dist/native",
  ios: {
    // Keeps the page inside the safe area (below the status bar, above the
    // home indicator). Capacitor's default, "never", draws the page under
    // them, which only works for pages built edge-to-edge with
    // `viewport-fit=cover` — the reader isn't yet.
    contentInset: "automatic",
  },
  plugins: {
    SystemBars: {
      // Pads the web view so it sits between the Android system bars rather
      // than under them, for the same reason as `ios.contentInset` above.
      insetsHandling: "native",
    },
  },
};

export default config;
