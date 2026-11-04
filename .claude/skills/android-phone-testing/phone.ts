// Drives an Android phone over wireless debugging (adb) so it can load the
// local dev server as http://localhost:<PORT>. See SKILL.md for why localhost
// matters (auth.seedbible.org only accepts localhost and production origins).
//
// Usage: bun .claude/skills/android-phone-testing/phone.ts <command>
//   pair <ip:port> <code>    one-time pairing, from the phone's pairing dialog
//   connect                  find the phone, connect, forward the dev ports
//   status                   connected devices and active port forwards
//   open [path]              open localhost:<PORT><path> in the phone's Chrome
//   logs [seconds] [--reload] stream the Seed Bible tab's console (default 30s)
//   screenshot [file]        save a PNG of the phone's screen, print its path

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 3002);
// Vite's default HMR WebSocket port; the dev server runs Vite in middleware
// mode, which opens it separately from PORT.
const HMR_PORT = 24678;
const DEVTOOLS_PORT = 9333;
const APP_ORIGIN = `http://localhost:${PORT}`;
const CHROME = "com.android.chrome";

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

function adb(args: string[], serial?: string): string {
  try {
    return execFileSync(ADB, serial ? ["-s", serial, ...args] : args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).replace(/\r/g, "");
  } catch (error) {
    const { stderr, stdout } = error as { stderr?: string; stdout?: string };
    const reason = (stderr || stdout || String(error)).trim();
    fail(
      reason.includes("offline")
        ? "The phone dropped off (wireless debugging turned off, or it left the Wi-Fi). Turn wireless debugging back on, then run `connect`."
        : `adb ${args.join(" ")} failed: ${reason}`
    );
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function devices(): { serial: string; state: string }[] {
  return adb(["devices"])
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({ serial, state }));
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

async function connect(): Promise<void> {
  // Toggling wireless debugging moves it to a new port and leaves the old one
  // behind as "offline", where it would shadow the new connection.
  for (const d of devices()) {
    if (d.state === "offline") adb(["disconnect", d.serial]);
  }

  // The connect port also changes every time wireless debugging turns on, so
  // discover it over mDNS rather than asking for it.
  let target: string | undefined;
  for (let i = 0; i < 10 && !target; i++) {
    target = adb(["mdns", "services"])
      .split("\n")
      .find((line) => line.includes("_adb-tls-connect._tcp"))
      ?.trim()
      .split(/\s+/)
      .pop();
    if (!target) await sleep(1000);
  }
  if (!target) {
    fail(
      "Phone not found on the network. On the phone, Wireless debugging must be ON and on the same Wi-Fi as this computer. If it was never paired with this computer (or the pairing expired), run `pair` first."
    );
  }

  console.log(adb(["connect", target]).trim());
  if (!devices().some((d) => d.serial === target && d.state === "device")) {
    fail(
      "Connection refused — this computer probably isn't paired (pairings expire after 7 days unused). Run `pair`."
    );
  }
  for (const port of [PORT, HMR_PORT]) {
    adb(["reverse", `tcp:${port}`, `tcp:${port}`], target);
  }
  console.log(adb(["reverse", "--list"], target).trim());
  console.log(`Ready: open ${APP_ORIGIN} on the phone.`);
}

function hasChrome(device: string): boolean {
  return adb(["shell", "pm", "path", CHROME], device).includes("package:");
}

function open(path = ""): void {
  const device = serial();
  // Takes the path without a leading slash too, because Git Bash on Windows
  // rewrites a `/en/...` argument into a Windows file path.
  const url = new URL(path.replace(/^\/*/, "/"), APP_ORIGIN).toString();
  // Chrome specifically, because `logs` can only attach to Chrome; other
  // browsers (e.g. Samsung Internet) don't expose the DevTools socket.
  const pkg = hasChrome(device) ? ["-p", CHROME] : [];
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
      `'${url}'`,
      ...pkg,
    ],
    device
  );
  console.log(`Opened ${url}`);
}

function screenshot(file?: string): void {
  const out = file ?? join(tmpdir(), `phone-screenshot-${Date.now()}.png`);
  const png = execFileSync(ADB, [
    "-s",
    serial(),
    "exec-out",
    "screencap",
    "-p",
  ]);
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
  subtype?: string;
  overflow: boolean;
  properties: { name: string; value?: string; valuePreview?: ObjectPreview }[];
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

async function logs(seconds: number, reload: boolean): Promise<void> {
  // Started first: if the phone drops mid-run, requests through the forward
  // hang instead of failing.
  setTimeout(() => process.exit(0), seconds * 1000);

  adb(
    ["forward", `tcp:${DEVTOOLS_PORT}`, "localabstract:chrome_devtools_remote"],
    serial()
  );

  let targets: Target[];
  try {
    targets = (await (
      await fetch(`http://localhost:${DEVTOOLS_PORT}/json`, {
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
  const tab = targets.find(
    (t) =>
      t.type === "page" &&
      t.url.startsWith(APP_ORIGIN) &&
      t.webSocketDebuggerUrl
  );
  if (!tab?.webSocketDebuggerUrl) {
    fail(
      `No ${APP_ORIGIN} tab open in the phone's Chrome. Run \`open\` first.`
    );
  }
  console.log(`Attached to: ${tab.title ? `${tab.title} — ` : ""}${tab.url}\n`);

  const time = () => new Date().toLocaleTimeString();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let nextId = 1;
  const send = (method: string, params: object = {}) =>
    ws.send(JSON.stringify({ id: nextId++, method, params }));

  ws.addEventListener("open", () => {
    // Both replay what was logged before attaching, then stream new entries.
    send("Runtime.enable");
    send("Log.enable");
    if (reload) send("Page.reload");
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args, stackTrace } = msg.params;
      const where = stackTrace?.callFrames?.[0];
      const loc = where
        ? `  (${where.url.replace(APP_ORIGIN, "")}:${where.lineNumber + 1})`
        : "";
      console.log(
        `[${time()}] console.${type}: ${args.map(format).join(" ")}${loc}`
      );
    } else if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      console.log(
        `[${time()}] UNCAUGHT: ${d.exception?.description ?? d.text}`
      );
    } else if (msg.method === "Log.entryAdded") {
      const e = msg.params.entry;
      console.log(
        `[${time()}] browser ${e.level} (${e.source}): ${e.text}${e.url ? `  ${e.url}` : ""}`
      );
    }
  });

  ws.addEventListener("close", () => process.exit(0));
}

function status(): void {
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
    await connect();
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
      "Usage: phone.ts <pair <ip:port> <code> | connect | status | open [path] | logs [seconds] [--reload] | screenshot [file]>"
    );
}
