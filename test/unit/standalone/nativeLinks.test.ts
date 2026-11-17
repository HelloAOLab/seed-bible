import {
  handleLinkClick,
  openLaunchLinkInApp,
  openLinkInApp,
  type NativeLinkContext,
} from "../../../standalone/nativeLinks";

/**
 * An in-memory stand-in for one app session: each restart starts a new page
 * at the current time, and storage survives it.
 */
function createApp(startHref = "capacitor://localhost/en/BSB/genesis/1") {
  const store = new Map<string, string>();
  let href = startHref;
  let time = 1_000_000;
  const reloads: { href: string; replace: boolean }[] = [];
  const context: NativeLinkContext = {
    publicOrigin: "https://seedbible.org",
    currentHref: () => href,
    reloadAt: (next, { replace }) => {
      reloads.push({ href: next, replace });
      href = next;
      // A real reload takes some milliseconds before the new page starts.
      time += 1;
      context.pageStartedAt = time;
    },
    pageStartedAt: time,
    storage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
    },
    now: () => time,
  };
  return {
    context,
    reloads,
    advance: (ms: number) => (time += ms),
    setHref: (next: string) => (href = next),
  };
}

const INVITE = "https://seedbible.org/en/BSB/john/3?sessionId=abc";

describe("openLinkInApp", () => {
  it("reloads the app at the same page as the opened link", () => {
    const app = createApp();

    expect(openLinkInApp(INVITE, app.context)).toBe(true);
    expect(app.reloads).toEqual([
      {
        href: "capacitor://localhost/en/BSB/john/3?sessionId=abc",
        replace: false,
      },
    ]);
  });

  it("ignores links to other sites", () => {
    const app = createApp();

    expect(openLinkInApp("https://example.com/", app.context)).toBe(false);
    expect(app.reloads).toEqual([]);
  });

  // The OS can report one tap twice; the first report restarts the page, and
  // the repeat arrives in the restarted page as soon as it starts listening.
  it("acts on one tap reported twice only once", () => {
    const app = createApp();

    openLinkInApp(INVITE, app.context);
    app.advance(300);
    openLinkInApp(INVITE, app.context);

    expect(app.reloads).toHaveLength(1);
  });

  it("ignores a repeat that arrives before the page has restarted", () => {
    const app = createApp();
    app.context.reloadAt = (next, { replace }) => {
      app.reloads.push({ href: next, replace });
    };

    openLinkInApp(INVITE, app.context);
    app.advance(50);
    openLinkInApp(INVITE, app.context);

    expect(app.reloads).toHaveLength(1);
  });

  // Regression: any repeat within 10 seconds used to be swallowed, so opening
  // an invite, going back, and tapping it again right away did nothing.
  it("opens the same link again when the reader taps it again soon after", () => {
    const app = createApp();

    openLinkInApp(INVITE, app.context);
    app.advance(4_000);
    app.setHref("capacitor://localhost/en/BSB/genesis/1");
    openLinkInApp(INVITE, app.context);

    expect(app.reloads).toHaveLength(2);
  });

  it("swallows only one repeat, so a quick second tap after it still works", () => {
    const app = createApp();

    openLinkInApp(INVITE, app.context);
    app.advance(200);
    openLinkInApp(INVITE, app.context); // the OS's repeat
    app.advance(1_500);
    openLinkInApp(INVITE, app.context); // the reader again

    expect(app.reloads).toHaveLength(2);
  });

  it("still opens links when storage is unavailable", () => {
    const app = createApp();
    app.context.storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(openLinkInApp(INVITE, app.context)).toBe(true);
  });
});

describe("openLaunchLinkInApp", () => {
  it("opens the link the app was launched with, replacing the start page", () => {
    const app = createApp("https://localhost/");

    openLaunchLinkInApp(INVITE, app.context);

    expect(app.reloads).toEqual([
      { href: "https://localhost/en/BSB/john/3?sessionId=abc", replace: true },
    ]);
  });

  // The OS keeps returning the launch link for as long as the app runs, so
  // every later page load asks again — including after the reader has moved on.
  it("doesn't drag the reader back to the launch link on later reloads", () => {
    const app = createApp("https://localhost/");

    openLaunchLinkInApp(INVITE, app.context);
    app.advance(5 * 60_000);
    app.setHref("https://localhost/en/BSB/romans/8");
    openLaunchLinkInApp(INVITE, app.context);

    expect(app.reloads).toHaveLength(1);
  });

  it("doesn't open a cold-start link twice when it is also reported as opened", () => {
    const app = createApp("https://localhost/");

    openLaunchLinkInApp(INVITE, app.context);
    app.advance(800);
    openLinkInApp(INVITE, app.context);

    expect(app.reloads).toHaveLength(1);
  });
});

describe("handleLinkClick", () => {
  function clickOn(
    html: string,
    init: MouseEventInit = {}
  ): {
    handled: boolean;
    navigated: string[];
    restarted: string[];
    event: MouseEvent;
  } {
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const navigated: string[] = [];
    const restarted: string[] = [];
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...init,
    });
    const target = container.querySelector("[data-target]") ?? container;
    Object.defineProperty(event, "target", { value: target });
    const handled = handleLinkClick(
      event,
      {
        publicOrigin: "https://seedbible.org",
        currentHref: () => "https://localhost/en/BSB/genesis/1",
        reloadAt: (href) => restarted.push(href),
      },
      (href) => navigated.push(href)
    );
    container.remove();
    return { handled, navigated, restarted, event };
  }

  it("opens a tapped seedbible.org passage link in place, inside the app", () => {
    const result = clickOn(
      '<a href="https://seedbible.org/en/BSB/john/3?verse=16" target="_blank"><span data-target>John 3:16</span></a>'
    );

    expect(result.handled).toBe(true);
    expect(result.event.defaultPrevented).toBe(true);
    expect(result.navigated).toEqual([
      "https://localhost/en/BSB/john/3?verse=16",
    ]);
    expect(result.restarted).toEqual([]);
  });

  it("restarts the app for a link carrying something read only at startup", () => {
    const result = clickOn(
      '<a data-target href="https://seedbible.org/en/BSB/john/3?sessionId=abc">Join</a>'
    );

    expect(result.handled).toBe(true);
    expect(result.navigated).toEqual([]);
    expect(result.restarted).toEqual([
      "https://localhost/en/BSB/john/3?sessionId=abc",
    ]);
  });

  it("leaves links to other sites alone", () => {
    const result = clickOn('<a data-target href="https://example.com/">x</a>');

    expect(result.handled).toBe(false);
    expect(result.event.defaultPrevented).toBe(false);
  });

  it("leaves a click the app already handled alone", () => {
    const event = new MouseEvent("click", { cancelable: true });
    event.preventDefault();

    expect(
      handleLinkClick(
        event,
        {
          publicOrigin: "https://seedbible.org",
          currentHref: () => "https://localhost/",
          reloadAt: () => {},
        },
        () => {}
      )
    ).toBe(false);
  });

  it("leaves modifier-clicks alone", () => {
    const result = clickOn(
      '<a data-target href="https://seedbible.org/">x</a>',
      { ctrlKey: true }
    );

    expect(result.handled).toBe(false);
  });
});
