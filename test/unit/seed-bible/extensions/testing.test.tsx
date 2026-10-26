import {
  defineExtension,
  type SandboxChapter,
  type SandboxContext,
} from "@packages/seed-bible/seed-bible/extensions";
import { createTestHost } from "@packages/seed-bible/seed-bible/extensions/testing";

/*
 * The test host extension authors use. It has to behave like the app where
 * it matters, or tests written against it would pass for code that fails
 * in Seed Bible: permissions, background-only calls, and the SDK's own
 * wire protocol.
 */
describe("createTestHost", () => {
  const hosts: { dispose: () => void }[] = [];
  afterEach(() => {
    for (const host of hosts.splice(0)) host.dispose();
    document.body.innerHTML = "";
  });

  async function start(
    extension: ReturnType<typeof defineExtension>,
    options?: Parameters<typeof createTestHost>[1]
  ) {
    const host = await createTestHost(extension, options);
    hosts.push(host);
    return host;
  }

  it("runs main and lets the test click its tools", async () => {
    const host = await start(
      defineExtension({
        main: async (sb) => {
          await sb.tools.registerToolbarTool({
            id: "hello",
            title: "Hello",
            icon: { material: "waving_hand" },
            onSelect: async () => {
              await sb.app.toast("Hello!");
              await sb.storage.set("greeted", true);
            },
          });
        },
      })
    );
    await host.ready;

    expect(host.tools.get("hello")).toMatchObject({ surface: "toolbar" });
    await host.selectTool("hello");

    expect(host.toasts).toEqual(["Hello!"]);
    expect(host.storage.get("greeted")).toBe(true);
  });

  it("refuses what isn't granted, the way the app does", async () => {
    let sb!: SandboxContext;
    const host = await start(defineExtension({ main: (s) => void (sb = s) }));
    await host.ready;

    await expect(
      sb.reading.open({ bookId: "JHN", chapter: 3 })
    ).rejects.toMatchObject({ code: "permission_denied" });

    const granted = await start(
      defineExtension({ main: (s) => void (sb = s) }),
      { granted: ["reading:navigate"] }
    );
    await granted.ready;
    await sb.reading.open({ bookId: "JHN", chapter: 3 });
    expect(granted.opened).toEqual([{ bookId: "JHN", chapter: 3 }]);
  });

  it("grants an optional permission when asked, unless told the user says no", async () => {
    const asks = async (allowRequests: boolean) => {
      let sb!: SandboxContext;
      const host = await start(
        defineExtension({ main: (s) => void (sb = s) }),
        { optional: ["highlights:write"], allowRequests }
      );
      await host.ready;
      const answer = await sb.permissions.request("highlights:write");
      await host.flush();
      return { answer, has: sb.permissions.has("highlights:read"), host };
    };

    const yes = await asks(true);
    expect(yes.answer).toBe(true);
    expect(yes.has).toBe(true);
    expect(yes.host.requests).toEqual([
      { permissions: ["highlights:write"], granted: true },
    ]);
    const no = await asks(false);
    expect(no.answer).toBe(false);
    expect(no.has).toBe(false);
  });

  it("only lets main code register providers, and asks them like the app", async () => {
    let viewSb: SandboxContext | null = null;
    const host = await start(
      defineExtension({
        main: async (sb) => {
          await sb.discover.registerProvider({
            id: "notes",
            title: "Notes",
            description: "",
            discover: (request) => [
              {
                type: "study-note",
                reference: { bookId: request.bookId, chapter: request.chapter },
                text: `About ${request.bookId} ${request.chapter}`,
              },
            ],
          });
        },
        views: {
          panel: ({ sb }) => {
            viewSb = sb;
            return <p>In a pane</p>;
          },
        },
      }),
      { granted: ["reading:position"] }
    );
    await host.ready;

    expect(
      await host.discover("notes", {
        translationId: "BSB",
        bookId: "JHN",
        chapter: 3,
        language: "en",
      })
    ).toEqual([
      {
        type: "study-note",
        reference: { bookId: "JHN", chapter: 3 },
        text: "About JHN 3",
      },
    ]);

    const container = await host.renderView("panel");
    expect(container.textContent).toBe("In a pane");
    await expect(
      viewSb!.discover.registerProvider({
        id: "x",
        title: "X",
        description: "",
        discover: () => [],
      })
    ).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("keeps views up to date with the app's state", async () => {
    let viewSb!: SandboxContext;
    const host = await start(
      defineExtension({
        views: {
          v: ({ sb }) => {
            viewSb = sb;
            return null;
          },
        },
      }),
      {
        granted: ["reading:position"],
        state: {
          position: { translationId: "BSB", bookId: "JHN", chapterNumber: 3 },
        },
      }
    );
    await host.renderView("v");
    expect(viewSb.reading.position.value?.chapterNumber).toBe(3);

    await host.setState({
      position: { translationId: "BSB", bookId: "JHN", chapterNumber: 4 },
    });

    expect(viewSb.reading.position.value?.chapterNumber).toBe(4);
  });

  it("says plainly when a call needs an answer the test didn't give, and uses one that's given", async () => {
    let sb!: SandboxContext;
    const host = await start(defineExtension({ main: (s) => void (sb = s) }));
    await host.ready;

    await expect(
      sb.bible.chapter({ translationId: "BSB", bookId: "JHN", chapter: 1 })
    ).rejects.toMatchObject({
      code: "unavailable",
      message: expect.stringContaining("answers"),
    });

    const chapter: SandboxChapter = {
      translationId: "BSB",
      bookId: "JHN",
      chapter: 1,
      verses: [{ number: 1, text: "Hi" }],
      content: [{ type: "verse", number: 1, text: "Hi", footnotes: [] }],
      footnotes: [],
      next: { bookId: "JHN", chapter: 2 },
      previous: null,
    };
    const answered = await start(
      defineExtension({ main: (s) => void (sb = s) }),
      { answers: { "bible.chapter": () => chapter } }
    );
    await answered.ready;
    expect(
      await sb.bible.chapter({
        translationId: "BSB",
        bookId: "JHN",
        chapter: 1,
      })
    ).toEqual(chapter);
    expect(answered.calls.map((call) => call.method)).toEqual([
      "bible.chapter",
    ]);
  });

  it("reports main's failure through ready", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const host = await start(
      defineExtension({
        main: () => {
          throw new Error("Broken");
        },
      })
    );

    await expect(host.ready).rejects.toThrow("Broken");
  });
});
