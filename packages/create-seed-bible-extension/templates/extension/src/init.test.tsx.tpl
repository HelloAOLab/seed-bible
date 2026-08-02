import { describe, expect, it, vi } from "vitest";
import { signal } from "@preact/signals";

// There's no real "seed-bible" package to import at test time (see
// docs/developer-guide.md in the seed-bible repo for why) — mock it and
// build just the slice of `SeedBibleState` this extension actually reads,
// using real `@preact/signals` signals. This mirrors how extensions inside
// the seed-bible monorepo itself test against a mocked app state (see e.g.
// test/unit/twitchSub-extension/).
const registerExtension = vi.fn();
vi.mock("seed-bible", () => ({ registerExtension }));
vi.mock("seed-bible/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const init = (await import("./init")).default;

function createFakeContext() {
  return {
    tools: {
      registerToolbarTool: vi.fn(() => () => {}),
    },
    panes: {
      openPane: vi.fn(),
    },
    app: {
      currentReadingState: signal(null),
    },
  };
}

describe("{{extensionId}}", () => {
  it("registers itself with the expected id", () => {
    init();

    expect(registerExtension).toHaveBeenCalledTimes(1);
    expect(registerExtension.mock.calls[0]![0]).toMatchObject({
      id: "{{extensionId}}",
    });
  });

  it("registers a toolbar tool when initialized", () => {
    init();
    const registration = registerExtension.mock.calls.at(-1)![0];
    const context = createFakeContext();

    // `init` can be a generator (yielding cleanup functions, then returning
    // its public export) or a plain function returning that export directly
    // — drive it either way.
    const result = registration.init(context, {});
    if (typeof result?.next === "function") {
      let step = result.next();
      while (!step.done) {
        step = result.next();
      }
    }

    expect(context.tools.registerToolbarTool).toHaveBeenCalledWith(
      expect.objectContaining({ id: "{{extensionId}}-tool" })
    );
  });
});
