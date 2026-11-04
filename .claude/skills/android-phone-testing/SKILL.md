---
name: android-phone-testing
description: Test the local dev server on an Android phone over Wi-Fi, with sign-in working - pair the phone, reconnect it, open pages on it, read its browser console, and screenshot it. Use when the user wants to load Seed Bible from this computer on their phone, says their phone disconnected, or asks what the phone is showing or logging (works over Remote Control, with the user away from the computer).
---

Load `pnpm dev` on an Android phone as `http://localhost:3002`, and drive the phone from this computer. Everything runs through one script, from the repo root:

```
bun .claude/skills/android-phone-testing/phone.ts <command>
```

## Why localhost, not the computer's network address

Opening `http://<computer-ip>:3002` on the phone loads the app, but **sign-in fails**. The browser sends sign-in straight to `auth.seedbible.org`, which only accepts requests from `http://localhost:3002` and the production sites — anything else, including other localhost ports, gets a 403. That address also isn't a secure context, so the service worker and `crypto.subtle` don't work there.

Android's wireless debugging can forward the phone's own `localhost:3002` to this computer (`adb reverse`). The page then really is `localhost:3002` as far as the browser and auth server are concerned, so sign-in and everything else behave as they do on the computer. There's no iPhone equivalent; this skill is Android only.

## Commands

| Command                     | What it does                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pair <ip:port> <code>`     | One-time pairing with this computer. The address and 6-digit code come from the phone's pairing dialog (below).                                                                                                                                                                                                                                       |
| `connect [ip:port]`         | Finds the phone on the network, connects, and forwards ports 3002 (app) and 24678 (live reload). If the network blocks discovery, pass the **IP address & Port** shown on the phone's Wireless debugging screen (not the pairing dialog's).                                                                                                           |
| `status`                    | Lists connected devices and active forwards.                                                                                                                                                                                                                                                                                                          |
| `open [path]`               | Opens `http://localhost:3002/<path>` in the phone's Chrome, reusing the same tab each time, e.g. `open en/BSB/john/3`. Leave off the leading slash: Git Bash on Windows turns `/en/...` into a file path.                                                                                                                                             |
| `logs [seconds] [--reload]` | Prints the Seed Bible tab's console calls, uncaught errors and browser warnings for `seconds` (default 30), each with the time it happened. Recent messages from before attaching are included. `--reload` reloads the tab first to capture startup, marked with a `--- reloaded ---` line. Stops early if the tab closes or leaves `localhost:3002`. |
| `screenshot [file]`         | Saves a PNG of the phone's screen and prints its path (by default one `phone-screenshot.png` in the temp folder, overwritten each time). Read that file to see it.                                                                                                                                                                                    |

The phone always uses port 3002, the only one sign-in accepts. `connect` doesn't detect the dev server's port — if it runs on a different one, pass it: `PORT=3005 bun .claude/skills/android-phone-testing/phone.ts connect`. That forwards the phone's 3002 to it, plus the same port number for pattern files, which are requested at the dev server's real port. Live reload doesn't follow: it always goes to port 24678, which belongs to whichever dev server started first, so with a second dev server the phone needs a manual reload after changes.

If several phones are connected, set `ANDROID_SERIAL` to pick one, using its `adb-…._adb-tls-connect._tcp` name from `status` (an `ip:port` stops matching when the phone's port changes).

Keep `logs` runs shorter than your shell tool's timeout (2 minutes by default), or run longer captures in the background, so you get the output rather than a killed command.

`logs` only sees the page. The service worker (`standalone/sw.ts`) is a separate target, so its console and errors don't appear; for a caching problem, don't conclude "no errors" from `logs` alone.

## Connecting

Always start with `connect` — a phone that's already paired just needs that, even when `status` shows it `offline` or not at all (the pairing survives this computer restarting). Then act on what it says:

- **Connected**: carry on with the task.
- **Phone not found**: wireless debugging is off (it turns itself off when the phone leaves the Wi-Fi or restarts). Ask the user to turn it back on — the Quick Settings tile, if they added it — and run `connect` again. If it's on and still not found, ask for the IP address & Port on the Wireless debugging screen and run `connect <ip:port>`.
- **Asking whether to allow this computer**: the user taps Allow on the phone, then run `connect` again.
- **Connection refused / not paired**: the phone was never paired with this computer, or the pairing expired. Do the setup below. After a manual `connect <ip:port>`, first check the address is from the Wireless debugging screen, not the pairing dialog — the message includes adb's own error.

If `adb` isn't found, the script says how to install it.

## First-time setup

Only when `connect` says the phone isn't paired. Walk the user through these steps on their phone, in one message, in plain language:

1. **Developer options**: Settings → About phone → tap **Build number** 7 times (Samsung: About phone → Software information).
2. **Wireless debugging**: Settings → Developer options → **Wireless debugging** → on. The phone must be on the same Wi-Fi as this computer. Tap Allow if asked.
3. **Pair**: tap **Pair device with pairing code**, and send you the 6-digit code and the `ip:port` shown — with that screen still open, since the code expires when it closes.

Then run `pair <ip:port> <code>`, `connect`, and `open`. Ask the user to sign in on the phone if it isn't signed in (`logs` will show `session_expired` errors if it had an old, expired session from an earlier visit).

Worth suggesting once setup works:

- **A Quick Settings tile** for turning wireless debugging back on: Developer options → **Quick settings developer tiles** → Wireless debugging, then add the tile from the Quick Settings edit (✏️) screen.
- **Developer options → "Disable adb authorization timeout"**, if they'll use this occasionally. By default Android forgets this computer after 7 days without a connection, and they'd have to pair again.

## Privacy

The phone is the user's personal device:

- Chrome's DevTools listing includes **every tab** open on the phone. `logs` only attaches to `localhost:3002` tabs, stops if the tab goes to another site, and removes its DevTools forward as soon as it has attached (`connect` and `status` also sweep up any left behind) — never query, print or attach to the listing yourself.
- A screenshot shows whatever is on screen, including notifications. Take one only when the user asks or it's needed for the task at hand, describe what's relevant in the app rather than everything visible, and delete the file when you're done with it. Don't pass a `file` outside the temp folder unless the user asks.

## Troubleshooting

- **`logs` finds no tab, but the page is open**: it was opened in another browser (e.g. Samsung Internet), which doesn't expose its console. Use `open`, which uses Chrome. If `open` says Chrome isn't installed, `logs` can't work on that phone until the user installs Chrome.
- **`logs` says the tab is already being inspected**: close `chrome://inspect`'s DevTools window for it on this computer.
- **A code change doesn't show up after reloading**: probably a stale service worker on `localhost:3002`. Unregister it in Chrome (Site settings → localhost → clear data) instead of debugging the code.
- **Page doesn't load at all**: check that `pnpm dev` is running on this computer, then `status` to confirm the forwards are there.
