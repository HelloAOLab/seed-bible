import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { loadExtensionProjectInfo } from "./project.js";

export interface DevExtensionServer {
  /** Where the `ExtensionSet` is served, for `?extensionSet=`. */
  setUrl: string;
  close: () => Promise<void>;
}

/**
 * Serves a sandboxed extension the way `publish` hosts it, but from this
 * machine and always current: the bundle `dev` keeps rebuilding, and an
 * `ExtensionSet` whose `integrity` is the hash of that bundle as it is
 * right now, and whose `meta` is `extension.json` as it is right now. A
 * reload in Seed Bible fetches both again, so it runs the latest code;
 * a manifest change that asks for more shows the update prompt, as a real
 * update would.
 */
export async function startDevExtensionServer(options: {
  root: string;
  bundlePath: string;
  /** 0 picks a free one. */
  port: number;
}): Promise<DevExtensionServer> {
  const { root, bundlePath } = options;
  // Known once listening, when `port` is 0.
  let base = "";

  const server: Server = createServer((request, response) => {
    // Any page may fetch these, as from a real host: Seed Bible's dev server
    // runs on another port.
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Cache-Control", "no-store");
    const pathname = new URL(request.url ?? "/", base).pathname;
    const send = async () => {
      if (pathname === "/index.js") {
        response.setHeader("Content-Type", "text/javascript; charset=utf-8");
        response.end(await readFile(bundlePath));
      } else if (pathname === "/extension-set.json") {
        const bundle = await readFile(bundlePath);
        const { meta } = await loadExtensionProjectInfo(root);
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            id: `${meta.id}-dev`,
            extensions: [
              {
                url: `${base}/index.js`,
                meta: {
                  ...meta,
                  integrity: `sha384-${createHash("sha384").update(bundle).digest("base64")}`,
                },
              },
            ],
          })
        );
      } else {
        response.statusCode = 404;
        response.end();
      }
    };
    send().catch((err: unknown) => {
      // Usually the first build hasn't finished yet.
      response.statusCode = 503;
      response.end(String(err));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "localhost", () => resolve());
  });
  const address = server.address();
  base = `http://localhost:${typeof address === "object" && address ? address.port : options.port}`;

  return {
    setUrl: `${base}/extension-set.json`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
