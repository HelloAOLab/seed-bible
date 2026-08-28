/**
 * Stops any test from opening a real WebSocket, and fails the test that tried.
 *
 * Unit tests should never reach the network, but the CasualOS client will: a
 * shared document calls `doc.connect()` as soon as it is resolved, so a test
 * that signs a user in can start a real connection through a manager it never
 * mentions. When the handshake completes, undici dispatches an `open` event
 * built from jsdom's `Event` onto a Node `EventTarget`, which rejects it with
 * `ERR_INVALID_ARG_TYPE`. That surfaces as an unhandled error attributed to
 * whichever file happened to be running — so it fails the run without failing a
 * test, names an innocent file, and only happens when the network cooperates.
 *
 * Blocking construction here turns all of that into a plain failure in the file
 * that caused it. The attempts are also recorded and asserted after each test,
 * because the throw alone can be swallowed by a `.catch` inside the client.
 */
const attempts: string[] = [];

class BlockedWebSocket {
  // Some clients read these off the constructor before connecting.
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string | URL) {
    const target = String(url);
    attempts.push(target);
    throw new Error(
      `Blocked a real WebSocket connection to ${target}. Stub the boundary that ` +
        `opens it — for a shared document that is \`os.getSharedDocument\`, which ` +
        `\`createTestSeedBibleState\` already points at a local Yjs document.`
    );
  }
}

(globalThis as unknown as { WebSocket: unknown }).WebSocket = BlockedWebSocket;

afterEach(() => {
  if (attempts.length === 0) {
    return;
  }
  const attempted = attempts.splice(0);
  throw new Error(
    `This test tried to open ${attempted.length} real WebSocket connection(s): ` +
      `${attempted.join(", ")}`
  );
});
