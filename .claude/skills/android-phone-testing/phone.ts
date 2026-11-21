// Drives an Android phone over wireless debugging (adb), so it can load the
// local dev server as http://localhost:3002. See SKILL.md for why localhost
// matters (auth.seedbible.org only accepts localhost:3002 and production).
//
// Usage: bun .claude/skills/android-phone-testing/phone.ts <command>
//   pair <ip:port> <code>    one-time pairing, from the phone's pairing dialog
//   connect [ip:port]        connect (found automatically, or the address on the
//                            phone's Wireless debugging screen), forward ports
//   status                   connected devices and active port forwards
//   open [path]              open localhost:3002/<path> in the phone's Chrome
//   logs [seconds] [--reload] stream the Seed Bible tab's console (default 30s)
//   screenshot [file] [--clean] save a PNG of the phone's screen, print its path
//                            (--clean hides the controlling bar for the capture)
//   focus                    bring Chrome to the front, without changing the page
//   click <target> [--nth N] tap an element in the app's tab: a CSS selector, or
//                            text=<words> for a button, link or label by its name
//   type <text> [--clear]    type into the focused field (--clear empties it first)
//   press <key>              Enter, Escape, Tab, Backspace or an arrow key
//   scroll <up|down|to> ...  scroll like a finger: up|down [pixels], or to <target>
//   back                     go back one page in the app's tab
//   release                  take down the "Claude is controlling this phone" bar:
//                            run it when you are finished with the phone

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// auth.seedbible.org's CORS allowlist only includes http://localhost:3002, so
// the phone always uses 3002 and it's forwarded to whatever port the dev
// server runs on here.
const PHONE_PORT = 3002;
const LOCAL_PORT = Number(process.env.PORT ?? PHONE_PORT);
// Vite's default HMR WebSocket port; the dev server runs Vite in middleware
// mode, which opens it separately from PORT.
const HMR_PORT = 24678;
const DEVTOOLS_SOCKET = "localabstract:chrome_devtools_remote";
const APP_ORIGIN = `http://localhost:${PHONE_PORT}`;
const CHROME = "com.android.chrome";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function findAdb(): string {
  const exe = process.platform === "win32" ? "adb.exe" : "adb";
  try {
    execFileSync(exe, ["version"], { stdio: "ignore" });
    return exe;
  } catch {
    // Not on PATH; fall through to the SDK locations.
  }
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.platform === "win32" && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Android", "Sdk")
      : undefined,
    process.platform === "darwin"
      ? join(homedir(), "Library", "Android", "sdk")
      : join(homedir(), "Android", "Sdk"),
  ];
  for (const root of sdkRoots) {
    if (!root) continue;
    const candidate = join(root, "platform-tools", exe);
    if (existsSync(candidate)) return candidate;
  }
  fail(
    "adb not found. Install Android platform-tools (Windows: `winget install Google.PlatformTools`, macOS: `brew install android-platform-tools`, Linux: your distro's `adb` package)."
  );
}

const ADB = findAdb();

/** Runs adb without exiting on failure; `out` holds stderr when it fails. */
function tryAdb(args: string[], serial?: string): { ok: boolean; out: string } {
  try {
    const out = execFileSync(ADB, serial ? ["-s", serial, ...args] : args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: out.replace(/\r/g, "") };
  } catch (error) {
    const { stderr, stdout } = error as { stderr?: string; stdout?: string };
    const out = (stderr || stdout || String(error)).replace(/\r/g, "").trim();
    return { ok: false, out };
  }
}

function adbFailure(args: string[], reason: string): never {
  fail(
    reason.includes("offline")
      ? "The phone dropped off (wireless debugging turned off, or it left the Wi-Fi). Turn wireless debugging back on, then run `connect`."
      : `adb ${args.join(" ")} failed: ${reason}`
  );
}

function adb(args: string[], serial?: string): string {
  const { ok, out } = tryAdb(args, serial);
  if (!ok) adbFailure(args, out);
  return out;
}

function devices(): { serial: string; state: string }[] {
  return adb(["devices"])
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({ serial, state }));
}

function stateOf(serial: string): string | undefined {
  return devices().find((d) => d.serial === serial)?.state;
}

function devtoolsForwards(): { serial: string; local: string }[] {
  const { ok, out } = tryAdb(["forward", "--list"]);
  if (!ok) return [];
  return out
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter(([, , remote]) => remote === DEVTOOLS_SOCKET)
    .map(([serial, local]) => ({ serial, local }));
}

/**
 * Removes DevTools forwards left behind by a hard-killed `logs` (e.g. a tool
 * timeout skips its cleanup). They reach every tab in the phone's Chrome. A
 * `logs` run that's mid-attach and loses its forward to this retries.
 */
function removeDevtoolsForwards(): void {
  for (const { serial, local } of devtoolsForwards()) {
    tryAdb(["forward", "--remove", local], serial);
  }
}

/**
 * adb often lists the same phone twice (its mDNS name and the IP connect), so
 * commands target one explicitly. ANDROID_SERIAL wins when set, as in adb.
 */
function serial(): string {
  if (process.env.ANDROID_SERIAL) return process.env.ANDROID_SERIAL;
  const ready = devices().find((d) => d.state === "device");
  if (!ready) {
    fail(
      "No phone connected. Turn on Wireless debugging on the phone, then run `connect`."
    );
  }
  return ready.serial;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wireless-debugging phones on the network, as `{ name, address }`. */
function discover(): { name: string; address: string }[] {
  return adb(["mdns", "services"])
    .split("\n")
    .filter((line) => line.includes("_adb-tls-connect._tcp"))
    .map((line) => line.trim().split(/\s+/))
    .map((parts) => ({ name: parts[0], address: parts[parts.length - 1] }));
}

/** Connects and waits for the result, since adb reports "connected" early. */
async function tryConnect(
  address: string
): Promise<{ state?: string; output: string }> {
  const output = tryAdb(["connect", address]).out.trim();
  let state: string | undefined;
  for (let i = 0; i < 6; i++) {
    state = stateOf(address);
    if (state === "device" || state === "unauthorized") break;
    await sleep(500);
  }
  return { state, output };
}

async function connect(address?: string): Promise<void> {
  removeDevtoolsForwards();
  // Toggling wireless debugging moves it to a new port and leaves the old one
  // behind as "offline", where it would shadow the new connection. Only
  // network entries can be disconnected; USB devices and emulators can't.
  for (const d of devices()) {
    const isNetwork =
      d.serial.includes(":") || d.serial.includes("._adb-tls-connect._tcp");
    if (d.state === "offline" && isNetwork) tryAdb(["disconnect", d.serial]);
  }

  const wanted = process.env.ANDROID_SERIAL;
  let candidates: string[] = [];
  if (address) {
    candidates = [address];
  } else {
    // The connect port changes every time wireless debugging turns on, so
    // it's found over mDNS rather than asked for.
    for (let i = 0; i < 10 && candidates.length === 0; i++) {
      candidates = discover()
        .filter(
          (s) =>
            !wanted ||
            wanted.startsWith(s.name) ||
            // An ip:port serial goes stale when the port changes, so match
            // the phone by its IP.
            wanted.split(":")[0] === s.address.split(":")[0]
        )
        .map((s) => s.address);
      if (candidates.length === 0) await sleep(1000);
    }
  }
  if (candidates.length === 0) {
    fail(
      "Phone not found on the network. On the phone, turn Wireless debugging ON (same Wi-Fi as this computer). If it's on and still not found, the network may block discovery: run `connect <ip:port>` with the IP address & Port shown on the phone's Wireless debugging screen."
    );
  }

  let connected: string | undefined;
  let sawUnauthorized = false;
  let lastOutput = "";
  // More than one entry means two phones, or a stale advertisement of an old
  // port that the phone didn't withdraw — try each until one connects.
  for (const candidate of candidates) {
    const { state, output } = await tryConnect(candidate);
    if (state === "device") {
      connected = candidate;
      break;
    }
    if (state === "unauthorized") sawUnauthorized = true;
    lastOutput = output;
  }
  if (!connected) {
    if (sawUnauthorized) {
      fail(
        "The phone is asking whether to allow this computer — tap Allow on the phone, then run `connect` again."
      );
    }
    fail(
      address
        ? `Couldn't connect to ${address} (adb: ${lastOutput}). Check it's the IP address & Port from the phone's Wireless debugging screen, not the pairing dialog's. If it is, this computer probably isn't paired: run \`pair\`.`
        : `Connection refused (adb: ${lastOutput}) — this computer probably isn't paired (pairings expire after 7 days unused). Run \`pair\`.`
    );
  }

  console.log(`Connected to ${connected}`);
  adb(["reverse", `tcp:${PHONE_PORT}`, `tcp:${LOCAL_PORT}`], connected);
  // Pattern URLs (script/lib/vite-plugin-patterns.ts) point at the dev
  // server's real port, so that has to be reachable from the phone too.
  if (LOCAL_PORT !== PHONE_PORT) {
    adb(["reverse", `tcp:${LOCAL_PORT}`, `tcp:${LOCAL_PORT}`], connected);
  }
  adb(["reverse", `tcp:${HMR_PORT}`, `tcp:${HMR_PORT}`], connected);
  console.log(adb(["reverse", "--list"], connected).trim());
  console.log(`Ready: open ${APP_ORIGIN} on the phone.`);
  // Other commands use ANDROID_SERIAL as-is, so an ip:port that matched by IP
  // alone would send them to the old port.
  if (wanted && wanted !== connected && !wanted.startsWith("adb-")) {
    console.log(
      `ANDROID_SERIAL is ${wanted}, but the phone is now at ${connected}. Set ANDROID_SERIAL=${connected} (or the phone's adb-… name from \`status\`) before other commands.`
    );
  }
}

function hasChrome(device: string): boolean {
  // Enabled packages only: Samsung phones often have Chrome installed but
  // disabled, and `-p` with a disabled package can't open anything.
  const { ok, out } = tryAdb(
    ["shell", "pm", "list", "packages", "-e", CHROME],
    device
  );
  return ok && out.split("\n").some((l) => l.trim() === `package:${CHROME}`);
}

function open(path = ""): void {
  const device = serial();
  // Takes the path without a leading slash too, because Git Bash on Windows
  // rewrites a `/en/...` argument into a Windows file path.
  const url = new URL(path.replace(/^\/*/, "/"), APP_ORIGIN).toString();
  // Chrome specifically, because `logs` can only attach to Chrome; other
  // browsers (e.g. Samsung Internet) don't expose the DevTools socket. The
  // application id makes Chrome reuse one tab instead of opening a new tab
  // per call.
  const useChrome = hasChrome(device);
  const chrome = useChrome
    ? [
        "-p",
        CHROME,
        "--es",
        "com.android.browser.application_id",
        "seed-bible-phone-testing",
      ]
    : [];
  // A failed launch exits non-zero, which adb() reports with am's error.
  adb(
    [
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      // Quoted because adb runs this through the phone's shell, where an `&`
      // in a query string would end the command.
      `'${url.replace(/'/g, "%27")}'`,
      ...chrome,
    ],
    device
  );
  console.log(`Opened ${url}`);
  if (!useChrome) {
    console.log(
      "Chrome isn't installed (or is disabled), so it opened in the default browser. `logs` and tab reuse need Chrome."
    );
  }
}

/**
 * Brings Chrome to the front of the phone's screen without loading anything,
 * so the page keeps its state. The commands that drive the page do this first:
 * a backgrounded Chrome can't be seen, screenshotted or watched, and the
 * person using the phone can't tell what's being done.
 */
function focusChrome(device: string): void {
  if (!hasChrome(device)) {
    fail(
      "Chrome isn't installed (or is disabled) on the phone, so there's nothing to bring to the front. `open` falls back to the default browser, but the page can't be driven there."
    );
  }
  // MAIN/LAUNCHER is what tapping Chrome's icon sends: an already-running
  // Chrome comes forward as it was, rather than opening a page.
  adb(
    [
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.MAIN",
      "-c",
      "android.intent.category.LAUNCHER",
      "-p",
      CHROME,
    ],
    device
  );
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function screenshot(file?: string): void {
  // One fixed file, overwritten each time, so screenshots of the phone (which
  // can include notifications) don't pile up.
  const out = file ?? join(tmpdir(), "phone-screenshot.png");
  const args = ["-s", serial(), "exec-out", "screencap", "-p"];
  let png: Buffer;
  try {
    png = execFileSync(ADB, args, {
      // A busy 1080p screen easily makes a PNG over the 1 MB default.
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const { stderr } = error as { stderr?: Buffer };
    adbFailure(args, (stderr?.length ? String(stderr) : String(error)).trim());
  }
  // `exec-out` doesn't pass on screencap's exit code, so an error message
  // could otherwise be saved as the "PNG".
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail(`Screenshot failed: ${png.toString("utf8", 0, 200).trim()}`);
  }
  writeFileSync(out, png);
  console.log(out);
}

interface Target {
  type: string;
  url: string;
  title: string;
  webSocketDebuggerUrl?: string;
}

interface ObjectPreview {
  type: string;
  subtype?: string;
  description?: string;
  overflow: boolean;
  properties: { name: string; value?: string; valuePreview?: ObjectPreview }[];
  /** Map and Set contents, which aren't in `properties`. */
  entries?: { key?: ObjectPreview; value: ObjectPreview }[];
}

interface RemoteObject {
  type: string;
  subtype?: string;
  value?: unknown;
  description?: string;
  unserializableValue?: string;
  preview?: ObjectPreview;
}

/**
 * Subtypes whose preview lists their contents. For the rest (dates, regexps,
 * DOM nodes, promises…) the preview's properties are empty or unhelpful and
 * the description is what's worth printing.
 */
const EXPANDED = new Set([
  undefined,
  "array",
  "map",
  "set",
  "weakmap",
  "weakset",
]);

function formatPreview(preview: ObjectPreview): string {
  if (!EXPANDED.has(preview.subtype)) {
    return preview.description ?? preview.subtype ?? preview.type;
  }
  if (preview.entries) {
    const parts = preview.entries.map((e) =>
      e.key
        ? `${formatPreview(e.key)} => ${formatPreview(e.value)}`
        : formatPreview(e.value)
    );
    if (preview.overflow) parts.push("…");
    // Chrome's own label, e.g. Map(2), WeakSet, Set(3).
    const label =
      preview.description ?? (preview.subtype === "set" ? "Set" : "Map");
    return `${label}{${parts.join(", ")}}`;
  }
  // A Map/Set entry's key or value can be a primitive, previewed as just its
  // description.
  if (preview.type !== "object") return preview.description ?? preview.type;
  const isArray = preview.subtype === "array";
  const parts = preview.properties.map((p) => {
    const v = p.valuePreview ? formatPreview(p.valuePreview) : p.value;
    return isArray ? `${v}` : `${p.name}: ${v}`;
  });
  if (preview.overflow) parts.push("…");
  return isArray ? `[${parts.join(", ")}]` : `{${parts.join(", ")}}`;
}

function format(arg: RemoteObject): string {
  if (arg.unserializableValue) return arg.unserializableValue;
  // Errors (not in EXPANDED) keep their description, so the stack trace comes
  // through.
  if (arg.preview && EXPANDED.has(arg.subtype)) {
    return formatPreview(arg.preview);
  }
  if (arg.value !== undefined) {
    return typeof arg.value === "string"
      ? arg.value
      : JSON.stringify(arg.value);
  }
  return arg.description ?? arg.type;
}

function isAppTab(url: string): boolean {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", () => reject(new Error("error")), {
      once: true,
    });
    ws.addEventListener("close", () => reject(new Error("closed")), {
      once: true,
    });
  });
}

/**
 * Forwards a free local port to the phone Chrome's DevTools socket, picks the
 * app's tab and opens a connection to it. Each run gets its own port, so runs
 * don't share one; if `connect`/`status` sweeps the forward away mid-attach,
 * it retries once.
 */
async function attach(
  device: string,
  // Asked of each app tab's connection in turn; the first to say yes is used.
  // Without it the first tab is used, which is fine for reading its console.
  pick?: (ws: WebSocket) => Promise<boolean>
): Promise<{ ws: WebSocket; tab: Target; appTabs: Target[] }> {
  let local: string | undefined;
  // The forward reaches every tab in the phone's Chrome, so it shouldn't
  // outlive this command. Signals are turned into a normal exit so the exit
  // handler runs; a hard kill can't be caught, which is why `connect` and
  // `status` also sweep up.
  process.on("exit", () => {
    if (local) tryAdb(["forward", "--remove", local], device);
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => process.exit(130));
  }

  for (let attempt = 1; ; attempt++) {
    // tcp:0 asks adb for a free port and prints it.
    const port = adb(["forward", "tcp:0", DEVTOOLS_SOCKET], device).trim();
    const forward = `tcp:${port}`;
    local = forward;
    try {
      // 127.0.0.1, not localhost: where localhost resolves to ::1 first,
      // adb's IPv4-only forward isn't reached.
      const targets = (await (
        await fetch(`http://127.0.0.1:${port}/json`, {
          signal: AbortSignal.timeout(5000),
        })
      ).json()) as Target[];
      // This listing includes every tab open in the phone's Chrome — the
      // owner's personal browsing. Only ever look at, print or attach to the
      // app's tabs.
      const appTabs = targets.filter(
        (t) => t.type === "page" && isAppTab(t.url)
      );
      if (appTabs.length === 0) {
        fail(
          `No ${APP_ORIGIN} tab open in the phone's Chrome. Run \`open\` first.`
        );
      }
      const candidates = appTabs.filter((t) => t.webSocketDebuggerUrl);
      if (candidates.length === 0) {
        fail(
          "The app's tab is already being inspected by another DevTools window (e.g. chrome://inspect on this computer). Close that, then try again."
        );
      }
      let chosen: { ws: WebSocket; tab: Target } | undefined;
      for (const candidate of candidates) {
        const candidateSocket = await openSocket(
          candidate.webSocketDebuggerUrl!
        );
        if (!pick || (await pick(candidateSocket))) {
          chosen = { ws: candidateSocket, tab: candidate };
          break;
        }
        candidateSocket.close();
      }
      if (!chosen) {
        fail(
          `${appTabs.length} ${APP_ORIGIN} tabs are open and none is the one showing on the phone. Bring the one you want to the front in Chrome, or run \`open\`.`
        );
      }
      const { ws, tab } = chosen;
      // An open connection survives removing its forward, so drop it now:
      // even a hard kill of this command then leaves nothing behind.
      tryAdb(["forward", "--remove", forward], device);
      local = undefined;
      return { ws, tab, appTabs };
    } catch {
      const swept = !devtoolsForwards().some(
        (f) => f.serial === device && f.local === forward
      );
      tryAdb(["forward", "--remove", forward], device);
      local = undefined;
      if (attempt === 1 && swept) continue;
      fail(
        "Couldn't reach Chrome on the phone — it isn't open, or the phone dropped off. Run `status`, then `open`."
      );
    }
  }
}

interface DevtoolsMessage {
  id?: number;
  method?: string;
  params?: unknown;
}

interface CallFrame {
  url: string;
  lineNumber: number;
}

interface FrameNavigated {
  frame: { parentId?: string; url: string; unreachableUrl?: string };
}

interface ConsoleAPICalled {
  type: string;
  args: RemoteObject[];
  timestamp: number;
  stackTrace?: { callFrames: CallFrame[] };
}

interface ExceptionThrown {
  timestamp: number;
  exceptionDetails: {
    text: string;
    url?: string;
    lineNumber: number;
    exception?: RemoteObject;
  };
}

interface LogEntryAdded {
  entry: {
    level: string;
    source: string;
    text: string;
    url?: string;
    timestamp: number;
  };
}

async function logs(seconds: number, reload: boolean): Promise<void> {
  // Started first: if the phone drops mid-run, requests through the forward
  // hang instead of failing.
  setTimeout(() => process.exit(0), seconds * 1000);

  const { ws, tab, appTabs } = await attach(serial());
  if (appTabs.length > 1) {
    console.log(
      `${appTabs.length} app tabs are open; attaching to the first:\n${appTabs.map((t) => `  ${t.url}`).join("\n")}`
    );
  }
  console.log(`Attached to: ${tab.title ? `${tab.title} — ` : ""}${tab.url}\n`);

  // Messages replayed from before attaching keep their original time.
  const time = (ms?: number) =>
    (ms ? new Date(ms) : new Date()).toLocaleTimeString();
  let nextId = 1;
  let pendingEnables = new Set<number>();
  let reloadId: number | undefined;
  const send = (method: string, params: object = {}) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return id;
  };

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data)) as DevtoolsMessage;
    if (msg.id !== undefined && pendingEnables.delete(msg.id)) {
      // Reload only once both replays are done, so the marker separates
      // earlier messages from the reload's.
      if (pendingEnables.size === 0 && reload) reloadId = send("Page.reload");
    } else if (msg.id !== undefined && msg.id === reloadId) {
      console.log(`[${time()}] --- reloaded ---`);
    } else if (msg.method === "Page.frameNavigated") {
      const { frame } = msg.params as FrameNavigated;
      if (frame.parentId || isAppTab(frame.url)) return;
      // A failed load shows Chrome's error page (chrome-error://…), with the
      // URL that failed in unreachableUrl — not the user browsing away.
      if (frame.unreachableUrl && isAppTab(frame.unreachableUrl)) {
        fail(
          `[${time()}] The page failed to load. Is \`pnpm dev\` running? Then check the forwards with \`status\`.`
        );
      }
      console.log(`[${time()}] Tab left ${APP_ORIGIN}; stopped.`);
      process.exit(0);
    } else if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args, stackTrace, timestamp } =
        msg.params as ConsoleAPICalled;
      const where = stackTrace?.callFrames?.[0];
      const loc = where
        ? `  (${where.url.replace(APP_ORIGIN, "")}:${where.lineNumber + 1})`
        : "";
      // The protocol reports console.warn as "warning".
      const method = type === "warning" ? "warn" : type;
      console.log(
        `[${time(timestamp)}] console.${method}: ${args.map(format).join(" ")}${loc}`
      );
    } else if (msg.method === "Runtime.exceptionThrown") {
      const { exceptionDetails: d, timestamp } = msg.params as ExceptionThrown;
      // format() rather than description: a rejection with a non-Error value
      // (e.g. a string) has no description, only the value.
      const what = d.exception ? `${d.text} ${format(d.exception)}` : d.text;
      const loc = d.url
        ? `  (${d.url.replace(APP_ORIGIN, "")}:${d.lineNumber + 1})`
        : "";
      console.log(`[${time(timestamp)}] UNCAUGHT: ${what}${loc}`);
    } else if (msg.method === "Log.entryAdded") {
      const e = (msg.params as LogEntryAdded).entry;
      console.log(
        `[${time(e.timestamp)}] browser ${e.level} (${e.source}): ${e.text}${e.url ? `  ${e.url}` : ""}`
      );
    }
  });

  ws.addEventListener("close", () => {
    // Chrome on Android also closes the connection when the tab goes to
    // another site (a renderer swap), before any frameNavigated arrives.
    console.log(`[${time()}] Tab closed or left ${APP_ORIGIN}; stopped.`);
    process.exit(0);
  });

  // Both replay what was logged before attaching, then stream new entries.
  pendingEnables = new Set([send("Runtime.enable"), send("Log.enable")]);
  // For frameNavigated: the connection belongs to the tab, not the page, so
  // it would follow the tab to another site.
  send("Page.enable");
}

function status(): void {
  removeDevtoolsForwards();
  const list = devices();
  if (list.length === 0) {
    console.log("No devices.");
    return;
  }
  for (const d of list) console.log(`${d.serial}\t${d.state}`);
  // The same phone the other commands would use.
  const target =
    process.env.ANDROID_SERIAL ??
    list.find((d) => d.state === "device")?.serial;
  if (target) {
    console.log(`\nForwards on ${target} (phone → this computer):`);
    console.log(adb(["reverse", "--list"], target).trim() || "none");
  }
}

// ---- Driving the app's tab -------------------------------------------------
// These work inside the page only (through the same DevTools connection as
// `logs`), so they can't touch the phone's notifications or other apps, and
// they stop if the tab isn't the app.

interface Cdp {
  send<T = any>(method: string, params?: object): Promise<T>;
  /** Runs an expression in the page and returns its value. */
  evaluate<T = any>(expression: string): Promise<T>;
}

const WATCHDOG_MS = 30_000;

/**
 * Whether this tab is the one showing on the phone. The phone's Chrome can
 * have several tabs on the app (the one `open` reuses, one the user signed in
 * with), and driving a hidden one would tap where nobody can see.
 */
function isShowing(ws: WebSocket): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 3000);
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data)) as {
        id?: number;
        result?: { result?: { value?: unknown } };
      };
      if (msg.id !== 1) return;
      clearTimeout(timer);
      resolve(msg.result?.result?.value === true);
    });
    ws.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          expression: 'document.visibilityState === "visible"',
          returnByValue: true,
        },
      })
    );
  });
}

async function connectTab(options: { focus?: boolean } = {}): Promise<Cdp> {
  // Started first: if the phone drops mid-command, requests through the
  // forward hang instead of failing.
  setTimeout(
    () =>
      fail("Timed out waiting for the phone. Run `status`, then try again."),
    WATCHDOG_MS
  );
  if (options.focus !== false) {
    focusChrome(serial());
    await sleep(900); // the switch to Chrome takes a moment to finish
  }
  const { ws } = await attach(serial(), isShowing);
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message: string };
    };
    if (msg.id === undefined) return;
    const waiting = pending.get(msg.id);
    if (!waiting) return;
    pending.delete(msg.id);
    if (msg.error) waiting.reject(new Error(msg.error.message));
    else waiting.resolve(msg.result);
  });
  ws.addEventListener("close", () =>
    fail(`The tab closed or left ${APP_ORIGIN}. Run \`open\` and try again.`)
  );
  const send = <T>(method: string, params: object = {}) =>
    new Promise<T>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async <T>(expression: string): Promise<T> => {
    const result = await send<{
      result: { value: T };
      exceptionDetails?: { text: string; exception?: { description?: string } };
    }>("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text
      );
    }
    return result.result.value;
  };
  // The tab can have gone elsewhere since `open`; never act on another site.
  const origin = await evaluate<string>("location.origin");
  if (origin !== APP_ORIGIN) {
    fail(
      `The app's tab is showing ${origin}, not ${APP_ORIGIN}. Run \`open\` first.`
    );
  }
  return { send, evaluate };
}

/** Where the tab is now, for the commands to report. */
const where = (cdp: Cdp) =>
  cdp.evaluate<string>("location.pathname + location.search");

/**
 * Shows, inside the page, that this script is driving the phone: an orange bar
 * across the top. It stays until `release` takes it down, so it's up the whole
 * time the phone is being worked on, and if a session ends without a release
 * the bar is still there rather than quietly gone. It ignores touches (so it
 * can't block a tap or the hit test) and lives only in this tab; reloading the
 * page clears it.
 */
const BAR_ID = "claude-phone-control";

async function showControlling(cdp: Cdp, action: string): Promise<void> {
  await cdp.evaluate(`(() => {
    let bar = document.getElementById(${JSON.stringify(BAR_ID)});
    if (!bar) {
      bar = document.createElement("div");
      bar.id = ${JSON.stringify(BAR_ID)};
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;padding:6px 12px;background:#c25a2c;color:#fff;font:600 13px/1.3 system-ui,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.35)";
      document.documentElement.appendChild(bar);
    }
    bar.style.display = "";
    bar.textContent = "Claude is controlling this phone \\u00b7 " + ${JSON.stringify(action)};
  })()`);
}

/** Takes the bar down: the work on the phone is finished. */
async function release(): Promise<void> {
  // Not focusing: the work is over, so the person using the phone shouldn't be
  // pulled back into Chrome just to take the bar down.
  const cdp = await connectTab({ focus: false });
  const removed = await cdp.evaluate<boolean>(`(() => {
    const bar = document.getElementById(${JSON.stringify(BAR_ID)});
    if (bar) bar.remove();
    return !!bar;
  })()`);
  console.log(
    removed
      ? "Released: the controlling bar is down."
      : "Nothing to release: the bar wasn't showing."
  );
  process.exit(0);
}

/**
 * A screenshot with the bar hidden for the instant of the capture, so the
 * picture is of the app alone. The bar goes straight back up.
 */
async function cleanScreenshot(file: string | undefined): Promise<void> {
  // Not focusing: a screenshot shouldn't move Chrome, and coming forward again
  // would dismiss the on-screen keyboard that's often what's being captured.
  const cdp = await connectTab({ focus: false });
  const hid = await cdp.evaluate<boolean>(`(() => {
    const bar = document.getElementById(${JSON.stringify(BAR_ID)});
    if (bar) bar.style.display = "none";
    return !!bar;
  })()`);
  await sleep(250); // let the phone repaint without it
  try {
    screenshot(file);
  } finally {
    if (hid) {
      await cdp.evaluate(
        `document.getElementById(${JSON.stringify(BAR_ID)}).style.display = ""`
      );
    }
  }
  process.exit(0);
}

/** A ring where a tap is about to land, so the person watching can see it. */
async function showTap(cdp: Cdp, x: number, y: number): Promise<void> {
  await cdp.evaluate(`((x, y) => {
    const ring = document.createElement("div");
    ring.style.cssText = "position:fixed;left:" + (x - 24) + "px;top:" + (y - 24) + "px;width:48px;height:48px;box-sizing:border-box;border-radius:50%;border:3px solid #c25a2c;background:rgba(194,90,44,.25);z-index:2147483647;pointer-events:none;transition:transform .6s,opacity .6s";
    document.documentElement.appendChild(ring);
    requestAnimationFrame(() => { ring.style.transform = "scale(1.7)"; ring.style.opacity = "0"; });
    setTimeout(() => ring.remove(), 800);
  })(${x}, ${y})`);
  await sleep(400); // long enough to be seen before the tap lands
}

/**
 * Finds one visible element and scrolls it to the middle of the screen. A
 * target is a CSS selector, or `text=<words>` to match a button, link, label
 * or field by its name (its aria-label, text, value or placeholder), exact
 * matches first. More than one match is an error rather than a guess: this is
 * a signed-in account, so a wrong tap could do something real.
 */
function findScript(target: string, nth: number | undefined): string {
  return `(() => {
    const spec = ${JSON.stringify(target)};
    const nth = ${JSON.stringify(nth ?? null)};
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const name = (el) =>
      (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("title") || el.getAttribute("placeholder") || "")
        .replace(/\\s+/g, " ").trim();
    const describe = (el) =>
      el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + ' "' + name(el).slice(0, 50) + '"';
    let found;
    if (spec.startsWith("text=")) {
      const want = spec.slice(5).trim().toLowerCase();
      const all = [...document.querySelectorAll("button,a,[role=button],[role=tab],[role=menuitem],[role=option],[role=switch],[role=checkbox],[role=radio],label,summary,input,select,textarea,li,h1,h2,h3,[tabindex]")].filter(visible);
      const exact = all.filter((el) => name(el).toLowerCase() === want);
      found = exact.length ? exact : all.filter((el) => name(el).toLowerCase().includes(want));
      // Keep the innermost: a list item and the button inside it are one target.
      found = found.filter((a) => !found.some((b) => b !== a && a.contains(b)));
    } else {
      found = [...document.querySelectorAll(spec)].filter(visible);
    }
    if (found.length === 0) return { error: "No visible element matches " + spec };
    if (found.length > 1 && nth === null) {
      return { error: found.length + " elements match " + spec + "; pick one with --nth N:\\n" +
        found.slice(0, 10).map((el, i) => "  " + (i + 1) + ". " + describe(el)).join("\\n") };
    }
    const el = found[(nth ?? 1) - 1];
    if (!el) return { error: "Only " + found.length + " match; --nth " + nth + " is out of range" };
    el.scrollIntoView({ block: "center", inline: "center" });
    window.__phoneTarget = el;
    return { ok: true, describe: describe(el) };
  })()`;
}

const MEASURE = `(() => {
  const el = window.__phoneTarget;
  delete window.__phoneTarget;
  if (!el || !el.isConnected) return { error: "The element went away before it could be tapped." };
  const r = el.getBoundingClientRect();
  const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
  const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
  const hit = document.elementFromPoint(x, y);
  if (!hit || !(el.contains(hit) || hit.contains(el))) {
    return { error: "Something else is on top of it at that spot: <" + (hit ? hit.tagName.toLowerCase() + (hit.className ? "." + String(hit.className).split(" ")[0] : "") : "nothing") + ">" };
  }
  return { x, y };
})()`;

type Found = { ok?: true; describe?: string; error?: string };
type Point = { x?: number; y?: number; error?: string };

async function locate(
  cdp: Cdp,
  target: string,
  nth: number | undefined
): Promise<{ x: number; y: number; describe: string }> {
  const found = await cdp.evaluate<Found>(findScript(target, nth));
  if (found.error) fail(found.error);
  await sleep(150); // let the scroll settle
  const point = await cdp.evaluate<Point>(MEASURE);
  if (point.error || point.x === undefined || point.y === undefined) {
    fail(`${found.describe}: ${point.error}`);
  }
  return { x: point.x, y: point.y, describe: found.describe ?? target };
}

/** Pulls `--nth N` out of the arguments; what's left is the target or text. */
function splitNth(rest: string[]): { words: string[]; nth?: number } {
  const i = rest.indexOf("--nth");
  if (i === -1) return { words: rest };
  const nth = Number(rest[i + 1]);
  if (!Number.isInteger(nth) || nth < 1) fail("--nth takes a number from 1.");
  return { words: [...rest.slice(0, i), ...rest.slice(i + 2)], nth };
}

async function click(rest: string[]): Promise<void> {
  const { words, nth } = splitNth(rest);
  const target = words.join(" ").trim();
  if (!target) fail("Usage: click <css selector | text=words> [--nth N]");
  const cdp = await connectTab();
  await showControlling(cdp, `tapping "${target.replace(/^text=/, "")}"`);
  const { x, y, describe } = await locate(cdp, target, nth);
  await showTap(cdp, x, y);
  // A touch tap, as a finger would make, so the app's touch handling runs.
  await cdp.send("Input.synthesizeTapGesture", {
    x,
    y,
    gestureSourceType: "touch",
  });
  await sleep(700); // let the page react
  console.log(`Tapped ${describe}. Now at ${await where(cdp)}`);
  process.exit(0);
}

async function type(rest: string[]): Promise<void> {
  const clear = rest.includes("--clear");
  const text = rest.filter((a) => a !== "--clear").join(" ");
  if (!text) fail("Usage: type <text> [--clear]");
  const cdp = await connectTab();
  await showControlling(cdp, "typing");
  const field = await cdp.evaluate<string>(`(() => {
    const el = document.activeElement;
    if (!el) return "";
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") {
      if (${JSON.stringify(clear)}) el.select();
      return tag + (el.type && tag === "input" ? "[" + el.type + "]" : "");
    }
    if (el.isContentEditable) {
      if (${JSON.stringify(clear)}) document.execCommand("selectAll");
      return "editor";
    }
    return "";
  })()`);
  if (!field)
    fail("Nothing you can type into is focused. `click` a field first.");
  await cdp.send("Input.insertText", { text });
  // The characters aren't echoed: this could be a password or a code.
  console.log(`Typed ${text.length} characters into the ${field}.`);
  process.exit(0);
}

const KEYS: Record<
  string,
  { key: string; code: string; vk: number; text?: string }
> = {
  enter: { key: "Enter", code: "Enter", vk: 13, text: "\r" },
  escape: { key: "Escape", code: "Escape", vk: 27 },
  tab: { key: "Tab", code: "Tab", vk: 9 },
  backspace: { key: "Backspace", code: "Backspace", vk: 8 },
  arrowup: { key: "ArrowUp", code: "ArrowUp", vk: 38 },
  arrowdown: { key: "ArrowDown", code: "ArrowDown", vk: 40 },
  arrowleft: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
  arrowright: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
};

async function press(name: string | undefined): Promise<void> {
  const k = KEYS[(name ?? "").toLowerCase()];
  if (!k)
    fail(
      `Usage: press <${Object.values(KEYS)
        .map((v) => v.key)
        .join(" | ")}>`
    );
  const cdp = await connectTab();
  await showControlling(cdp, `pressing ${k.key}`);
  const event = {
    key: k.key,
    code: k.code,
    windowsVirtualKeyCode: k.vk,
    nativeVirtualKeyCode: k.vk,
  };
  await cdp.send("Input.dispatchKeyEvent", {
    type: k.text ? "keyDown" : "rawKeyDown",
    ...event,
    ...(k.text ? { text: k.text } : {}),
  });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  await sleep(400);
  console.log(`Pressed ${k.key}. Now at ${await where(cdp)}`);
  process.exit(0);
}

async function scroll(rest: string[]): Promise<void> {
  const [what, ...more] = rest;
  const cdp = await connectTab();
  await showControlling(cdp, "scrolling");
  if (what === "to") {
    const { words, nth } = splitNth(more);
    const target = words.join(" ").trim();
    if (!target) fail("Usage: scroll to <css selector | text=words> [--nth N]");
    const found = await cdp.evaluate<Found>(findScript(target, nth));
    if (found.error) fail(found.error);
    await cdp.evaluate("delete window.__phoneTarget");
    console.log(`Scrolled ${found.describe} to the middle of the screen.`);
    process.exit(0);
  }
  if (what !== "up" && what !== "down") {
    fail("Usage: scroll <up | down> [pixels]  |  scroll to <target>");
  }
  const pixels = Number(more[0] ?? 500);
  if (!Number.isFinite(pixels) || pixels <= 0)
    fail("Pixels must be a positive number.");
  // A finger swipe from the middle of the screen, so whatever scrolls there
  // (the page, or a pane inside it) scrolls, as it would by hand.
  const { w, h } = await cdp.evaluate<{ w: number; h: number }>(
    "({ w: innerWidth, h: innerHeight })"
  );
  await cdp.send("Input.synthesizeScrollGesture", {
    x: w / 2,
    y: h / 2,
    yDistance: what === "down" ? -pixels : pixels,
    gestureSourceType: "touch",
    speed: 1200,
  });
  await sleep(500);
  console.log(`Scrolled ${what} ${pixels}px.`);
  process.exit(0);
}

async function back(): Promise<void> {
  const cdp = await connectTab();
  await showControlling(cdp, "going back");
  await cdp.evaluate("history.back()");
  await sleep(600);
  console.log(`Went back. Now at ${await where(cdp)}`);
  process.exit(0);
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case "pair": {
    const [address, code] = args;
    if (!address || !code) fail("Usage: pair <ip:port> <code>");
    console.log(adb(["pair", address, code]).trim());
    break;
  }
  case "connect":
    await connect(args[0]);
    break;
  case "status":
    status();
    break;
  case "open":
    open(args[0]);
    break;
  case "logs":
    await logs(
      Number(args.find((a) => /^\d+$/.test(a)) ?? 30),
      args.includes("--reload")
    );
    break;
  case "screenshot": {
    const file = args.find((a) => a !== "--clean");
    if (args.includes("--clean")) await cleanScreenshot(file);
    else screenshot(file);
    break;
  }
  case "release":
    await release();
    break;
  case "focus":
    focusChrome(serial());
    console.log("Chrome is in front.");
    break;
  case "click":
    await click(args);
    break;
  case "type":
    await type(args);
    break;
  case "press":
    await press(args[0]);
    break;
  case "scroll":
    await scroll(args);
    break;
  case "back":
    await back();
    break;
  default:
    fail(
      "Usage: phone.ts <pair <ip:port> <code> | connect [ip:port] | status | open [path] | logs [seconds] [--reload] | screenshot [file] [--clean] | focus | click <target> [--nth N] | type <text> [--clear] | press <key> | scroll <up|down|to> ... | back | release>"
    );
}
