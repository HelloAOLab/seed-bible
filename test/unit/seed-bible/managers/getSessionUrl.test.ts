import {
  getSessionUrl,
  type BibleReadingSession,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { injectNativeAppConfig } from "../testUtils/nativeAppConfig";

const session = { id: "session-1" } as BibleReadingSession;

describe("getSessionUrl", () => {
  afterEach(() => {
    jsdom.reconfigure({ url: "https://example.test/" });
  });

  it("links to the current page with only the session to join", () => {
    jsdom.reconfigure({
      url: "https://example.test/en/AAB/genesis/1?verse=3",
    });

    expect(getSessionUrl(session).href).toBe(
      "https://example.test/en/AAB/genesis/1?sessionId=session-1"
    );
  });

  it("points at the public website when shared from the native apps", () => {
    jsdom.reconfigure({ url: "https://localhost/en/AAB/genesis/1" });
    const remove = injectNativeAppConfig();
    try {
      expect(getSessionUrl(session).href).toBe(
        "https://seedbible.org/en/AAB/genesis/1?sessionId=session-1"
      );
    } finally {
      remove();
    }
  });
});
