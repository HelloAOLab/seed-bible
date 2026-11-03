import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The track must not ask for its own GPU layer from the stylesheet. Kept on
// one permanently, Android Chrome left stale tiles of the outgoing chapter
// painted over the end of the new one after a swipe. TabsLayout requests the
// layer inline, only while a finger drags the track.
describe("mobile swipe track stylesheet", () => {
  it("does not keep the swipe track on its own layer", () => {
    const css = readFileSync(
      resolve(
        __dirname,
        "../../../../packages/seed-bible/seed-bible/components/BibleReader/BibleReader.inline.css"
      ),
      "utf8"
    );
    const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter(([, s]) =>
      s.includes(".sb-reader-swipe-track")
    );

    expect(rules.length).toBeGreaterThan(0);
    for (const [, , body] of rules) {
      expect(body).not.toMatch(/will-change/);
    }
  });
});
