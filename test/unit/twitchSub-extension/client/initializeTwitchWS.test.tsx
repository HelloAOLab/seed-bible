import { signal } from "@preact/signals";
import { initializeTwitchWS } from "@packages/twitchSub-extension/ext_twitchSub/client/initializeTwitchWS";
import type { Mock } from "vitest";

function createTwitchSubManagerMock(accessToken: string | null = "token-1") {
  return {
    config: signal({
      accessToken: signal(accessToken),
      eventSubWebsocketUrl: signal("wss://eventsub.wss.twitch.tv/ws"),
      channelId: signal("channel-1"),
      broadcasterId: signal("broadcaster-1"),
      clientId: signal("client-1"),
      botUserId: signal("bot-1"),
    }),
    websocketSessionID: signal<string | null>(null),
    webSocketClient: signal<any>(null),
    handleWSEvents: vi.fn(),
  } as any;
}

describe("initializeTwitchWS", () => {
  let websocketCtorMock: Mock<any>;
  let warnSpy: Mock;
  let errorSpy: Mock;

  beforeEach(() => {
    vi.useFakeTimers();

    websocketCtorMock = vi.fn(
      class {
        onerror = null;
        onopen = null;
        onmessage = null;
        onclose = null;
      }
    );
    (globalThis as any).WebSocket = websocketCtorMock;

    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("restarts the websocket client when the connection closes", async () => {
    const manager = createTwitchSubManagerMock("token-1");

    await initializeTwitchWS(manager);

    expect(websocketCtorMock).toHaveBeenCalledTimes(1);
    expect(websocketCtorMock).toHaveBeenLastCalledWith(
      "wss://eventsub.wss.twitch.tv/ws"
    );

    const firstClient = websocketCtorMock.mock.results[0]?.value;
    expect(firstClient).toBeTruthy();
    manager.websocketSessionID.value = "session-1";

    firstClient.onclose({ code: 1006, reason: "network error" });

    expect(warnSpy).toHaveBeenCalled();
    expect(manager.webSocketClient.value).toBeNull();
    expect(manager.websocketSessionID.value).toBeNull();

    vi.advanceTimersByTime(1000);

    expect(websocketCtorMock).toHaveBeenCalledTimes(2);
    expect(websocketCtorMock).toHaveBeenLastCalledWith(
      "wss://eventsub.wss.twitch.tv/ws"
    );
  });

  it("does not start the websocket client when access token is missing", async () => {
    const manager = createTwitchSubManagerMock(null);

    await initializeTwitchWS(manager);

    expect(websocketCtorMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "wsss:- Twitch config not available."
    );
  });
});
