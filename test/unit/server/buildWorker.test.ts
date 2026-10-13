// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  startBuildWorker,
  type BuildWorker,
} from "../../../server/buildWorker";

// Stand-in SSR bundles, run in a real worker thread exactly as a deployed
// build's server.mjs would be.
const BUNDLE = `
export async function render(opts) {
  if (opts.path === "/throw") throw new Error("render exploded");
  if (opts.path === "/hang") return new Promise(() => {});
  if (opts.path === "/crash") process.exit(3);
  if (opts.path === "/slow") await new Promise((r) => setTimeout(r, 200));
  return { html: "rendered " + opts.path + " over " + opts.html };
}
`;
const NO_RENDER_BUNDLE = `export const somethingElse = 1;`;

const OPTS = {
  config: {
    basePath: "",
    assetHost: "",
    renderedAsMobile: false,
    renderedAsWebKit: false,
    acceptedLanguages: [],
  },
  html: "<shell>",
};

describe("startBuildWorker", () => {
  let dir: string;
  let bundlePath: string;
  const started: BuildWorker[] = [];

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "build-worker-test-"));
    bundlePath = path.join(dir, "server.mjs");
    await writeFile(bundlePath, BUNDLE);
    await writeFile(path.join(dir, "no-render.mjs"), NO_RENDER_BUNDLE);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  afterEach(() => {
    for (const worker of started.splice(0)) worker.retire();
  });

  async function start(
    options: { timeoutMs?: number; onExit?: () => void } = {}
  ) {
    const worker = await startBuildWorker({
      modulePath: bundlePath,
      timeoutMs: options.timeoutMs ?? 5_000,
      onExit: options.onExit,
    });
    started.push(worker);
    return worker;
  }

  function exitSignal() {
    let onExit!: () => void;
    const exited = new Promise<void>((resolve) => (onExit = resolve));
    return { exited, onExit };
  }

  it("renders through the bundle's render() in the worker", async () => {
    const worker = await start();

    await expect(worker.render({ ...OPTS, path: "/a" })).resolves.toEqual({
      html: "rendered /a over <shell>",
    });
  });

  it("rejects with the bundle's own error when render() throws", async () => {
    const worker = await start();

    await expect(worker.render({ ...OPTS, path: "/throw" })).rejects.toThrow(
      "render exploded"
    );
    // The worker survives a failed render.
    await expect(worker.render({ ...OPTS, path: "/b" })).resolves.toEqual({
      html: "rendered /b over <shell>",
    });
  });

  it("refuses a bundle that doesn't export render()", async () => {
    await expect(
      startBuildWorker({
        modulePath: path.join(dir, "no-render.mjs"),
        timeoutMs: 5_000,
      })
    ).rejects.toThrow("does not export render()");
  });

  it("refuses a bundle that can't be loaded", async () => {
    await expect(
      startBuildWorker({
        modulePath: path.join(dir, "missing.mjs"),
        timeoutMs: 5_000,
      })
    ).rejects.toThrow();
  });

  it("gives up on a render that runs past the timeout", async () => {
    const worker = await start({ timeoutMs: 300 });

    await expect(worker.render({ ...OPTS, path: "/hang" })).rejects.toThrow(
      "timed out"
    );
  });

  it("lets an in-flight render finish before stopping a retired worker", async () => {
    const { exited, onExit } = exitSignal();
    const worker = await start({ onExit });

    const inFlight = worker.render({ ...OPTS, path: "/slow" });
    worker.retire();

    await expect(inFlight).resolves.toEqual({
      html: "rendered /slow over <shell>",
    });
    await exited;
    await expect(worker.render({ ...OPTS, path: "/c" })).rejects.toThrow(
      "stopped"
    );
  });

  it("keeps a retired worker running while it is held, and stops it once released", async () => {
    let stopped = false;
    const { exited, onExit } = exitSignal();
    const worker = await start({
      onExit: () => {
        stopped = true;
        onExit();
      },
    });

    // Handed out, but not yet rendering, when a deploy retires it.
    const release = worker.acquire()!;
    worker.retire();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(stopped).toBe(false);
    await expect(worker.render({ ...OPTS, path: "/held" })).resolves.toEqual({
      html: "rendered /held over <shell>",
    });
    expect(stopped).toBe(false);

    release();
    await exited;
  });

  it("can't be acquired once it has stopped", async () => {
    const { exited, onExit } = exitSignal();
    const worker = await start({ onExit });

    worker.retire();
    await exited;

    expect(worker.acquire()).toBeNull();
  });

  it("stops a retired worker whose holder never lets go, after the grace period", async () => {
    const { exited, onExit } = exitSignal();
    const worker = await start({ timeoutMs: 200, onExit });

    worker.acquire();
    worker.retire();

    await exited;
  });

  it("stops a retired worker right away when nothing is rendering", async () => {
    const { exited, onExit } = exitSignal();
    const worker = await start({ onExit });

    worker.retire();

    await exited;
  });

  it("fails in-flight renders and reports the exit when the worker dies", async () => {
    const { exited, onExit } = exitSignal();
    const worker = await start({ onExit });

    const slow = worker.render({ ...OPTS, path: "/slow" });
    const crash = worker.render({ ...OPTS, path: "/crash" });

    await expect(crash).rejects.toThrow("exited with code 3");
    await expect(slow).rejects.toThrow("exited with code 3");
    await exited;
  });
});
