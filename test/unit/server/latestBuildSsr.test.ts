// @vitest-environment node
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Drives the real production host over HTTP against a local artifact store.
 * Each stand-in SSR bundle names itself in the HTML it renders, and logs to a
 * file when it is imported, so the tests can see which build's code ran and
 * which builds were ever loaded.
 */
const bundleSource = (buildId: string, importLog: string) => `
import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(importLog)}, ${JSON.stringify(buildId)} + "\\n");
export async function render(opts) {
  return { html: "rendered by ${buildId} over [" + opts.html + "]" };
}
`;

describe("production host: SSR runs only a branch's latest build", () => {
  let dir: string;
  let importLog: string;
  let server: Server;
  let baseUrl: string;
  const savedEnv = { ...process.env };

  async function writeBuild(branch: string, buildId: string) {
    const buildDir = path.join(dir, "branches", branch, buildId);
    await mkdir(buildDir, { recursive: true });
    await writeFile(
      path.join(buildDir, "server.mjs"),
      bundleSource(buildId, importLog)
    );
    await writeFile(path.join(buildDir, "index.html"), `html of ${buildId}`);
  }

  async function setLatest(branch: string, buildId: string) {
    await writeFile(
      path.join(dir, "branches", branch, "current.json"),
      JSON.stringify({ buildId })
    );
  }

  async function importedBuilds(): Promise<string[]> {
    const log = await readFile(importLog, "utf8").catch(() => "");
    return log.split("\n").filter(Boolean);
  }

  async function get(pathname: string) {
    const res = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
    return { status: res.status, body: await res.text() };
  }

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "latest-build-ssr-"));
    importLog = path.join(dir, "imports.log");
    await writeBuild("main", "old");
    await writeBuild("main", "new");
    await setLatest("main", "new");
    // Whitelisted, but with no live pointer.
    await writeBuild("retired", "only");

    Object.assign(process.env, {
      STORE_BACKEND: "local",
      STORE_DIR: dir,
      ROOT_BRANCH: "main",
      ALLOWED_SSR_BRANCHES: "main,retired",
      DEFAULT_SSR_BRANCH: "",
    });
    vi.resetModules();
    const { startProdServer } = await import("../../../server/index");
    server = startProdServer(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    // Retires the cached build workers so none outlive the file.
    await fetch(`${baseUrl}/__invalidate?branch=main`, { method: "POST" });
    await new Promise((resolve) => server.close(resolve));
    process.env = savedEnv;
    await rm(dir, { recursive: true, force: true });
  });

  it("renders a pinned old build's HTML with the latest build, never importing the old one", async () => {
    const page = await get("/b/main/old/en/AAB/genesis/1");

    expect(page.status).toBe(200);
    expect(page.body).toBe("rendered by new over [html of old]");
    expect(await importedBuilds()).not.toContain("old");
  });

  it("renders the latest build over its own HTML, pinned or not", async () => {
    expect((await get("/b/main/new/en/AAB/genesis/1")).body).toBe(
      "rendered by new over [html of new]"
    );
    expect((await get("/en/AAB/genesis/1")).body).toBe(
      "rendered by new over [html of new]"
    );
    expect(await importedBuilds()).toEqual(["new"]);
  });

  it("serves a pinned build's HTML as-is when its branch has no latest build", async () => {
    const page = await get("/b/retired/only/en/AAB/genesis/1");

    expect(page.status).toBe(200);
    expect(page.body).toBe("html of only");
    expect(await importedBuilds()).not.toContain("only");
  });
});
