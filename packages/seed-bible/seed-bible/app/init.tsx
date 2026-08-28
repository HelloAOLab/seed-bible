import "./initPostHog";
import { Main } from "../app/main";
import { render } from "preact";
import { readInjectedConfig } from "../app/appConfig";
import { readInjectedApiResponseSnapshot } from "../app/apiResponseSeed";
import { createSeedBibleState } from "../managers/SeedBibleStateManager";
import { decideHydration, type HydrationDecision } from "../app/hydrationGate";
import { hydrateWithFallback } from "../app/hydrateWithFallback";
import { waitForInitialChapterLoads } from "../app/initialChapterLoadWait";

// Config (base path + asset host, plus SSR-verification metadata) injected
// by the host server. Reading it on the client is what lets the hydration
// gate below tell a trustworthy SSR document from one it should discard.
const config = readInjectedConfig();

// The API responses the server already fetched to render this page
// (translations, book catalog, chapter content) — seeding the client's own
// API cache with them means the manager creation below doesn't re-fetch data
// the page already contains.
const apiResponseSnapshot = readInjectedApiResponseSnapshot();

const container = document.getElementById("app") ?? document.body;

console.log("Starting APP");

// Create the app state up front so we can wait for the detected language's
// translations, and every initial tab's chapter load, before the first
// paint. This keeps the initial paint on the correct-language, correct-
// content SSR markup instead of flashing a fallback that a moment later
// gets replaced.
const state = createSeedBibleState({ config, apiResponseSnapshot });

/**
 * Every initial tab's chapter fetch is already in flight by the time
 * `createSeedBibleState` above returns (see `BibleReadingManager.tsx`'s
 * `loadInitialData`) — this just waits for them, the same promises the SSR
 * render already suspends on internally via `BibleReader`.
 *
 * Bounded by a timeout (see `initialChapterLoadWait.ts`): mounting is gated
 * on this, so an unbounded wait on a stalled fetch would leave the whole app
 * uninteractive — no sidebar, no menus, no tab switching — rather than just
 * the reader subtree waiting on its own Suspense fallback.
 */
function waitForThisPagesChapterLoads() {
  return waitForInitialChapterLoads(
    state.tabs.tabs.value.map((tab) => tab.readingState.chapterDataPromise)
  );
}

void Promise.all([state.i18n.ready, waitForThisPagesChapterLoads()]).then(
  ([, chapterLoads]) => {
    // A timed-out chapter load means this client never finished loading the
    // content the server rendered from, so the first client render can't be
    // trusted to match the markup on screen — render() instead of hydrate(),
    // same as any other gate decline.
    const decision: HydrationDecision =
      chapterLoads === "timed-out"
        ? { hydrate: false, reason: "chapter-load-timed-out" }
        : decideHydration({
            config,
            pathname: location.pathname,
            search: location.search,
            container,
          });

    const app = <Main initialState={state} config={config} />;

    if (decision.hydrate) {
      const result = hydrateWithFallback(app, container);
      if (result.outcome !== "hydrated") {
        console.error(
          "Hydration failed; falling back to a full render():",
          result.hydrateError
        );
        if (typeof posthog !== "undefined" && posthog) {
          posthog.capture("hydration_failed", {
            error:
              result.hydrateError instanceof Error
                ? result.hydrateError.message
                : String(result.hydrateError),
          });
        }
      }
      if (result.outcome === "failed") {
        console.error("Fallback render() also failed:", result.renderError);
        if (typeof posthog !== "undefined" && posthog) {
          posthog.capture("hydration_fallback_failed", {
            error:
              result.renderError instanceof Error
                ? result.renderError.message
                : String(result.renderError),
          });
        }
      }
    } else {
      // Preact does not warn on a hydration mismatch — it silently patches
      // the DOM to match, which can leave stale attributes in place. Falling
      // back to a full render() here is the deliberate, visible alternative
      // whenever the SSR document can't be trusted (see hydrationGate.ts).
      console.warn(
        `Hydration skipped (${decision.reason}); falling back to render().`
      );
      render(app, container);
    }
  }
);
