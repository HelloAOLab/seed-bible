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
//   screenshot [file]        save a PNG of the phone's screen, print its path

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
const DEVTOOLS_PORT = 9333;
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

/**
 * Removes `logs`' DevTools forward from every device. It reaches every tab in
 * the phone's Chrome, and a hard kill of `logs` (e.g. a tool timeout) skips
 * its own cleanup, so other commands sweep up after it too.
 */
function removeDevtoolsForwards(): void {
  const { ok, out } = tryAdb(["forward", "--list"]);
  if (!ok) return;
  for (const line of out.split("\n")) {
    const [serial, local] = line.trim().split(/\s+/);
    if (local === `tcp:${DEVTOOLS_PORT}`) {
      tryAdb(["forward", "--remove", local], serial);
    }
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

function formatPreview(preview: ObjectPreview): string {
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
  // Errors keep their description so the stack trace comes through.
  if (arg.preview && arg.subtype !== "error") return formatPreview(arg.preview);
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

async function logs(seconds: number, reload: boolean): Promise<void> {
  // Started first: if the phone drops mid-run, requests through the forward
  // hang instead of failing.
  setTimeout(() => process.exit(0), seconds * 1000);

  const device = serial();
  adb(
    ["forward", `tcp:${DEVTOOLS_PORT}`, "localabstract:chrome_devtools_remote"],
    device
  );
  // The forward reaches every tab in the phone's Chrome, so it shouldn't
  // outlive this command. Signals are turned into a normal exit so the exit
  // handler runs; a hard kill can't be caught, which is why `connect` and
  // `status` also remove it.
  process.on("exit", removeDevtoolsForwards);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => process.exit(130));
  }

  let targets: Target[];
  try {
    // 127.0.0.1, not localhost: where localhost resolves to ::1 first, adb's
    // IPv4-only forward isn't reached.
    targets = (await (
      await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json`, {
        signal: AbortSignal.timeout(5000),
      })
    ).json()) as Target[];
  } catch {
    fail(
      "Couldn't reach Chrome on the phone — it isn't open, or the phone dropped off. Run `status`, then `open`."
    );
  }
  // This listing includes every tab open in the phone's Chrome — the owner's
  // personal browsing. Only ever look at, print or attach to the app's tabs.
  const appTabs = targets.filter((t) => t.type === "page" && isAppTab(t.url));
  if (appTabs.length === 0) {
    fail(
      `No ${APP_ORIGIN} tab open in the phone's Chrome. Run \`open\` first.`
    );
  }
  const tab = appTabs.find((t) => t.webSocketDebuggerUrl);
  if (!tab?.webSocketDebuggerUrl) {
    fail(
      "The app's tab is already being inspected by another DevTools window (e.g. chrome://inspect on this computer). Close that, then try again."
    );
  }
  if (appTabs.length > 1) {
    console.log(
      `${appTabs.length} app tabs are open; attaching to the first:\n${appTabs.map((t) => `  ${t.url}`).join("\n")}`
    );
  }
  console.log(`Attached to: ${tab.title ? `${tab.title} — ` : ""}${tab.url}\n`);

  // Messages replayed from before attaching keep their original time.
  const time = (ms?: number) =>
    (ms ? new Date(ms) : new Date()).toLocaleTimeString();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let opened = false;
  let nextId = 1;
  let pendingEnables = new Set<number>();
  let reloadId: number | undefined;
  const send = (method: string, params: object = {}) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return id;
  };

  ws.addEventListener("open", () => {
    opened = true;
    // An open connection survives removing its forward, so drop it now: even
    // a hard kill of this command then leaves nothing behind.
    removeDevtoolsForwards();
    // Both replay what was logged before attaching, then stream new entries.
    pendingEnables = new Set([send("Runtime.enable"), send("Log.enable")]);
    // For frameNavigated: the connection belongs to the tab, not the page, so
    // it would follow the tab to another site.
    send("Page.enable");
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (pendingEnables.delete(msg.id) && pendingEnables.size === 0) {
      // Reload only once both replays are done, so the marker separates
      // earlier messages from the reload's.
      if (reload) reloadId = send("Page.reload");
    } else if (msg.id !== undefined && msg.id === reloadId) {
      console.log(`[${time()}] --- reloaded ---`);
    } else if (
      msg.method === "Page.frameNavigated" &&
      !msg.params.frame.parentId &&
      !isAppTab(msg.params.frame.url)
    ) {
      // A failed load shows Chrome's error page (chrome-error://…), with the
      // URL that failed in unreachableUrl — not the user browsing away.
      const failed = msg.params.frame.unreachableUrl;
      if (failed && isAppTab(failed)) {
        fail(
          `[${time()}] The page failed to load. Is \`pnpm dev\` running? Then check the forwards with \`status\`.`
        );
      }
      console.log(`[${time()}] Tab left ${APP_ORIGIN}; stopped.`);
      process.exit(0);
    } else if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args, stackTrace, timestamp } = msg.params;
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
      const { exceptionDetails: d, timestamp } = msg.params;
      // format() rather than description: a rejection with a non-Error value
      // (e.g. a string) has no description, only the value.
      const what = d.exception ? `${d.text} ${format(d.exception)}` : d.text;
      const loc = d.url
        ? `  (${d.url.replace(APP_ORIGIN, "")}:${d.lineNumber + 1})`
        : "";
      console.log(`[${time(timestamp)}] UNCAUGHT: ${what}${loc}`);
    } else if (msg.method === "Log.entryAdded") {
      const e = msg.params.entry;
      console.log(
        `[${time(e.timestamp)}] browser ${e.level} (${e.source}): ${e.text}${e.url ? `  ${e.url}` : ""}`
      );
    }
  });

  ws.addEventListener("error", () => {
    if (!opened) fail("Couldn't attach to the app's tab in Chrome.");
  });
  ws.addEventListener("close", () => {
    if (!opened) fail("Couldn't attach to the app's tab in Chrome.");
    // Chrome on Android also closes the connection when the tab goes to
    // another site (a renderer swap), before any frameNavigated arrives.
    console.log(`[${time()}] Tab closed or left ${APP_ORIGIN}; stopped.`);
    process.exit(0);
  });
}

function status(): void {
  removeDevtoolsForwards();
  const list = devices();
  if (list.length === 0) {
    console.log("No devices.");
    return;
  }
  for (const d of list) console.log(`${d.serial}\t${d.state}`);
  const ready = list.find((d) => d.state === "device");
  if (ready) {
    console.log("\nForwards (phone → this computer):");
    console.log(adb(["reverse", "--list"], ready.serial).trim() || "none");
  }
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
  case "screenshot":
    screenshot(args[0]);
    break;
  default:
    fail(
      "Usage: phone.ts <pair <ip:port> <code> | connect [ip:port] | status | open [path] | logs [seconds] [--reload] | screenshot [file]>"
    );
}
