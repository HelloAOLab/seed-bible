---
name: twitchpub-hardcoded-channelid
description: The hardcoded Twitch channelId in the twitchPub extension is intentional, not a bug
metadata:
  type: project
---

In `packages/twitchPub-extension/ext_twitchPub/host/twitchPubManager.tsx`, `twitchConfig.channelId` is hardcoded to `"1455265905"` (used as the `broadcasterId` target when `sendMessage` posts chat messages). This is **intentional** — do not flag it as a bug or suggest making it dynamic.

**Why:** The user confirmed the hardcoded channelId is by design.

**How to apply:** When reviewing or debugging the twitchPub extension, treat the fixed `channelId` as expected behavior. Chat sends to that channel failing is a separate concern from auth/token issues.
