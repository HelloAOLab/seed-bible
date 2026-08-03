import type { IncomingMessage, ServerResponse } from "node:http";
import {
  clientConfigFromHeaders,
  renderAndRespond,
  type RenderFn,
  type Route,
} from "../../../server/index";

function makeReq(headers: Record<string, string> = {}): IncomingMessage {
  return {
    headers: { "user-agent": "Mozilla/5.0", ...headers },
  } as unknown as IncomingMessage;
}

/**
 * `sendHtml` (server/index.ts) writes the body as a `Buffer`, not the raw
 * string that was rendered — decode it back for assertions.
 */
function bodyText(body: unknown): string {
  if (!Buffer.isBuffer(body)) {
    throw new Error(`Expected a Buffer body, got ${typeof body}`);
  }
  return body.toString("utf8");
}

/**
 * Captures every `writeHead`/`end` call instead of writing to a real socket,
 * so a test can assert on exactly what `renderAndRespond` sent.
 */
function makeRes() {
  const calls: {
    writeHead: [number, Record<string, unknown>?][];
    end: unknown[];
  } = { writeHead: [], end: [] };
  const res = {
    writeHead: (status: number, headers?: Record<string, unknown>) => {
      calls.writeHead.push([status, headers]);
      return res;
    },
    end: (body?: unknown) => {
      calls.end.push(body);
      return res;
    },
  };
  return { res: res as unknown as ServerResponse, calls };
}

const ROUTE: Route = {
  branch: "main",
  basePath: "",
  appUrl: "/en/AAB/genesis/1",
};

describe("clientConfigFromHeaders", () => {
  it("parses Accept-Language into a list of tags", () => {
    const config = clientConfigFromHeaders({
      "user-agent": "Mozilla/5.0",
      "accept-language": "fr-FR,en-US;q=0.8",
    });
    expect(config.acceptedLanguages).toEqual(["fr-FR", "en-US"]);
  });

  it("defaults to an empty list when no Accept-Language header was sent", () => {
    const config = clientConfigFromHeaders({ "user-agent": "Mozilla/5.0" });
    expect(config.acceptedLanguages).toEqual([]);
  });

  it("detects a mobile user agent", () => {
    const config = clientConfigFromHeaders({
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    expect(config.renderedAsMobile).toBe(true);
  });

  it("does not flag a desktop user agent as mobile", () => {
    const config = clientConfigFromHeaders({
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
    expect(config.renderedAsMobile).toBe(false);
  });
});

describe("renderAndRespond", () => {
  const html = "<html>pre-rendered</html>";

  it("writes a 302 with Location and Vary for a negotiated redirect", async () => {
    const render: RenderFn = async () => ({
      redirectTo: "/en/AAB/john/3",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
    const { res, calls } = makeRes();

    await renderAndRespond(makeReq(), res, render, ROUTE, html);

    expect(calls.writeHead).toEqual([
      [302, { location: "/en/AAB/john/3", vary: "Accept-Language" }],
    ]);
    expect(calls.end).toEqual([undefined]);
  });

  it("defaults to a 301 with no Vary header when render() doesn't specify one", async () => {
    const render: RenderFn = async () => ({
      redirectTo: "/en/AAB/genesis/1",
    });
    const { res, calls } = makeRes();

    await renderAndRespond(makeReq(), res, render, ROUTE, html);

    expect(calls.writeHead).toEqual([[301, { location: "/en/AAB/genesis/1" }]]);
    // No `vary` key at all — not even `vary: undefined` — since a shared
    // cache treats the header's mere presence as "this response varies".
    expect(calls.writeHead[0]![1]).not.toHaveProperty("vary");
  });

  it("writes a 404 with the rendered not-found HTML for an unresolved book", async () => {
    const render: RenderFn = async () => ({
      html: "<html>not found</html>",
      notFound: true,
    });
    const { res, calls } = makeRes();

    await renderAndRespond(makeReq(), res, render, ROUTE, html);

    expect(calls.writeHead[0]![0]).toBe(404);
    expect(calls.end).toHaveLength(1);
    expect(bodyText(calls.end[0])).toBe("<html>not found</html>");
  });

  it("writes a 200 with the rendered HTML for an ordinary render", async () => {
    const render: RenderFn = async () => ({ html: "<html>rendered</html>" });
    const { res, calls } = makeRes();

    await renderAndRespond(makeReq(), res, render, ROUTE, html);

    expect(calls.writeHead[0]![0]).toBe(200);
    expect(calls.writeHead[0]![1]).toMatchObject({
      "content-type": "text/html; charset=utf-8",
    });
    expect(calls.end).toHaveLength(1);
    expect(bodyText(calls.end[0])).toBe("<html>rendered</html>");
  });

  it("falls back to the unrendered pre-rendered HTML at 200 when render() throws", async () => {
    const render: RenderFn = async () => {
      throw new Error("boom");
    };
    const { res, calls } = makeRes();
    const originalError = console.error;
    console.error = () => {};

    try {
      await renderAndRespond(makeReq(), res, render, ROUTE, html);
    } finally {
      console.error = originalError;
    }

    expect(calls.writeHead[0]![0]).toBe(200);
    expect(calls.end).toHaveLength(1);
    expect(bodyText(calls.end[0])).toBe(html);
  });

  it("passes Accept-Language and mobile detection through to render()'s config", async () => {
    let receivedConfig: unknown;
    const render: RenderFn = async (opts) => {
      receivedConfig = opts.config;
      return { html: "<html></html>" };
    };
    const { res } = makeRes();

    await renderAndRespond(
      makeReq({
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
        "accept-language": "es-ES",
      }),
      res,
      render,
      ROUTE,
      html
    );

    expect(receivedConfig).toMatchObject({
      basePath: ROUTE.basePath,
      renderedAsMobile: true,
      acceptedLanguages: ["es-ES"],
    });
  });
});
