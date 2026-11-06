import { readTrustedSharedPageSeeds } from "@packages/seed-bible/seed-bible/app/sharedPageSeeds";

const PLAYLIST_SEED = {
  locator: "user-1.playlist-1",
  item: { id: "playlist-1", title: "Demo" },
  authorName: "Ruth",
};
const PLAN_SEED = {
  locator: "user-1.plan-1",
  item: { address: "plan-1", title: "Plan" },
  authorName: null,
};

/** Injects the seed tags the way `entry-ssr.tsx` does. */
function injectSeeds() {
  for (const [id, seed] of [
    ["app-playlist-page-seed", PLAYLIST_SEED],
    ["app-reading-plan-page-seed", PLAN_SEED],
  ] as const) {
    const script = document.createElement("script");
    script.type = "application/json";
    script.id = id;
    script.textContent = JSON.stringify(seed);
    document.body.appendChild(script);
  }
}

describe("readTrustedSharedPageSeeds", () => {
  beforeEach(injectSeeds);

  afterEach(() => {
    document
      .querySelectorAll("#app-playlist-page-seed, #app-reading-plan-page-seed")
      .forEach((el) => el.remove());
  });

  it("reuses the seeds when this build rendered the page", () => {
    expect(
      readTrustedSharedPageSeeds({ renderedByCommit: "abc123" }, "abc123")
    ).toEqual({ playlist: PLAYLIST_SEED, readingPlan: PLAN_SEED });
  });

  it.each([
    ["a different build", "an-older-build"],
    ["a build too old to say which it was", undefined],
  ])("ignores the seeds when %s rendered the page", (_label, renderedBy) => {
    expect(
      readTrustedSharedPageSeeds({ renderedByCommit: renderedBy }, "abc123")
    ).toEqual({ playlist: undefined, readingPlan: undefined });
  });
});
