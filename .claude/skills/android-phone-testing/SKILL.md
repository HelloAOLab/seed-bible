---
name: android-phone-testing
description: Test the local dev server on an Android phone over Wi-Fi, with sign-in working - pair the phone, reconnect it, open pages on it, read its browser console, and screenshot it. Use when the user wants to load Seed Bible from this computer on their phone, says their phone disconnected, or asks what the phone is showing or logging (works over Remote Control, with the user away from the computer).
---

Load `pnpm dev` on an Android phone as `http://localhost:3002`, and drive the phone from this computer. Everything runs through one script, from the repo root:

```
bun .claude/skills/android-phone-testing/phone.ts <command>
```

## Why localhost, not the computer's network address

Opening `http://<computer-ip>:3002` on the phone loads the app, but **sign-in fails**. The browser sends sign-in straight to `auth.seedbible.org`, which only accepts requests from `http://localhost:3002` and the production sites — anything else gets a 403. That address also isn't a secure context, so the service worker and `crypto.subtle` don't work there.

Android's wireless debugging can forward the phone's own `localhost:3002` to this computer (`adb reverse`). The page then really is `localhost` as far as the browser and auth server are concerned, so sign-in and everything else behave as they do on the computer. There's no iPhone equivalent; this skill is Android only.

## Commands

| Command                     | What it does                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pair <ip:port> <code>`     | One-time pairing with this computer. The address and 6-digit code come from the phone's pairing dialog (below).                                                                                                      |
| `connect`                   | Finds the phone on the network, connects, and forwards ports 3002 (app) and 24678 (live reload). Run after pairing, and again whenever the phone disconnects.                                                        |
| `status`                    | Lists connected devices and active forwards.                                                                                                                                                                         |
| `open [path]`               | Opens `http://localhost:3002/<path>` in the phone's Chrome, e.g. `open en/BSB/john/3`. Leave off the leading slash: Git Bash on Windows turns `/en/...` into a file path.                                            |
| `logs [seconds] [--reload]` | Prints the Seed Bible tab's console calls, uncaught errors and browser warnings for `seconds` (default 30). Recent messages from before attaching are included. `--reload` reloads the tab first to capture startup. |
| `screenshot [file]`         | Saves a PNG of the phone's screen (to the temp folder by default) and prints its path. Read that file to see it.                                                                                                     |

`PORT` is respected if the dev server runs on a different port. If several phones are connected, set `ANDROID_SERIAL` to pick one.

## First-time setup

Check `status` first — if a phone is listed as `device`, setup is done; skip to `connect` or the task at hand. If `adb` isn't found, the script says how to install it.

Otherwise, walk the user through these steps on their phone, one message, plain language:

1. **Developer options**: Settings → About phone → tap **Build number** 7 times (Samsung: About phone → Software information).
2. **Wireless debugging**: Settings → Developer options → **Wireless debugging** → on. The phone must be on the same Wi-Fi as this computer. Tap Allow if asked.
3. **Pair**: tap **Pair device with pairing code**, and send you the 6-digit code and the `ip:port` shown — with that screen still open, since the code expires when it closes.

Then run `pair <ip:port> <code>`, `connect`, and `open`. Ask the user to sign in on the phone if it isn't signed in (`logs` will show `session_expired` errors if it had an old, expired session from an earlier visit).

Worth suggesting once setup works:

- **A Quick Settings tile** for turning wireless debugging back on: Developer options → **Quick settings developer tiles** → Wireless debugging, then add the tile from the Quick Settings edit (✏️) screen.
- **Developer options → "Disable adb authorization timeout"**, if they'll use this occasionally. By default Android forgets this computer after 7 days without a connection, and they'd have to pair again.

## When the phone disconnects

Wireless debugging turns itself off when the phone leaves that Wi-Fi network or restarts, and every time it turns back on it listens on a new port, so the old connection goes `offline`. Ask the user to turn it back on (the tile, if they added it), then run `connect` — it clears the stale connection and finds the new port. No new pairing is needed unless `connect` says the connection was refused.

## Privacy

The phone is the user's personal device:

- Chrome's DevTools listing includes **every tab** open on the phone. `logs` only attaches to `localhost:3002` tabs — never query, print or attach to the listing yourself.
- A screenshot shows whatever is on screen, including notifications. Take one only when the user asks or it's needed for the task at hand, and describe what's relevant in the app rather than everything visible.

## Troubleshooting

- **`logs` finds no tab, but the page is open**: it was opened in another browser (e.g. Samsung Internet), which doesn't expose its console. Use `open`, which uses Chrome.
- **A code change doesn't show up after reloading**: probably a stale service worker on `localhost:3002`. Unregister it in Chrome (Site settings → localhost → clear data) instead of debugging the code.
- **Page doesn't load at all**: check that `pnpm dev` is running on this computer, then `status` to confirm the forwards are there.
