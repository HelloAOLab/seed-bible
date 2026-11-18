import { createSandboxClient } from "@packages/seed-bible/seed-bible/extensions";
import {
  SANDBOX_PROTOCOL_VERSION,
  type SandboxState,
} from "@packages/seed-bible/seed-bible/extensions/protocol";

const STATE: SandboxState = {
  themeCss: "--sb-background: rgb(9, 9, 9);",
  language: "en",
  direction: "ltr",
  strings: {},
  isMobile: false,
  position: null,
  selection: [],
  identity: null,
  fontStylesheets: [],
  session: null,
  playback: null,
};

describe("the frame's page styles", () => {
  const channels: MessageChannel[] = [];
  afterEach(() => {
    for (const channel of channels.splice(0)) {
      channel.port1.close();
      channel.port2.close();
    }
    document.head.innerHTML = "";
    document.documentElement.removeAttribute("data-sb-app-layout");
  });

  // Shared components' phone styles key off `<html data-sb-app-layout>`, and the
  // frame has its own `<html>`, so it needs the app's layout copied in.
  it("mark the frame's <html> with the app's layout, and follow it when it changes", async () => {
    const channel = new MessageChannel();
    channels.push(channel);
    createSandboxClient(channel.port2, {
      protocol: SANDBOX_PROTOCOL_VERSION,
      extensionId: "layout-extension",
      mode: { kind: "background" },
      granted: [],
      optional: [],
      state: { ...STATE, isMobile: true },
    });
    expect(document.documentElement.dataset.sbAppLayout).toBe("mobile");

    channel.port1.postMessage({ type: "state", state: { isMobile: false } });

    await vi.waitFor(() =>
      expect(document.documentElement.dataset.sbAppLayout).toBe("desktop")
    );
  });

  it("put the theme's page background before the extension's own CSS, so the extension's can override it", () => {
    // What the extension's bundle adds when it loads, before the SDK starts.
    const own = document.createElement("style");
    own.textContent = "body { background-color: rgb(1, 2, 3); }";
    document.head.append(own);

    const channel = new MessageChannel();
    channels.push(channel);
    createSandboxClient(channel.port2, {
      protocol: SANDBOX_PROTOCOL_VERSION,
      extensionId: "page-styles-extension",
      mode: { kind: "background" },
      granted: [],
      optional: [],
      state: STATE,
    });

    // Of two equally specific rules the later one wins, so the theme's
    // `html, body` rule has to come first. (JSDOM doesn't apply that order,
    // so a computed style can't show it here.)
    const theme = document.getElementById("sb-theme")!;
    expect(theme.textContent).toContain("html, body");
    expect(
      theme.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
