import { afterEach, describe, expect, it } from "vitest";
import { createTestHost, type TestHost } from "seed-bible/extensions/testing";
import extension from "./init";
import manifest from "../extension.json";

// `createTestHost` runs the extension exactly as Seed Bible would, against a
// stand-in for the app: every call is checked against the permissions you
// grant here, and what the extension does (tools, panes, storage, toasts…)
// is recorded for the test to look at.
describe("{{extensionId}}", () => {
  let host: TestHost;
  afterEach(() => host.dispose());

  it("adds a toolbar button that opens its pane", async () => {
    host = await createTestHost(extension, {
      optional: ["reading:position"],
    });
    await host.ready;

    expect(host.tools.get("open")).toMatchObject({ surface: "toolbar" });
    await host.selectTool("open");

    expect([...host.panes.values()]).toEqual([
      expect.objectContaining({ view: "main" }),
    ]);
    expect(host.storage.get("opened")).toBe(1);
  });

  it("shows where the user is reading, once they allow it", async () => {
    host = await createTestHost(extension, {
      granted: ["reading:position"],
      state: {
        position: { translationId: "BSB", bookId: "JHN", chapterNumber: 3 },
      },
      translations: manifest.translations,
    });

    const pane = await host.renderView("main", { props: { opened: 1 } });

    expect(pane.textContent).toContain("You're reading JHN 3.");
  });

  it("counts how many times it has been opened", async () => {
    // The strings from `extension.json`, so the test reads what users see.
    host = await createTestHost(extension, {
      translations: manifest.translations,
    });

    const once = await host.renderView("main", { props: { opened: 1 } });
    const thrice = await host.renderView("main", { props: { opened: 3 } });

    expect(once.textContent).toContain("Opened once.");
    expect(thrice.textContent).toContain("Opened 3 times.");
  });

  it("still opens its pane when the user says no", async () => {
    host = await createTestHost(extension, {
      optional: ["reading:position"],
      allowRequests: false,
    });
    await host.ready;

    await host.selectTool("open");

    expect(host.panes.size).toBe(1);
    expect(host.granted()).toEqual([]);
  });
});
