# Notifications

How Seed Bible tells people that something happened while they weren't looking:
a friend request, a new release, and in time many other things.

**In short.** A bell on the Today screen opens a list of notifications. Each one
can be acted on (accept a friend request) or dismissed. A toast announces new
ones, including right after signing in. People who turn on push notifications
on a device also get them on that device's lock screen, even when Seed Bible
is closed.

## 1. What a notification is

A notification is a short message about one thing that needs the person's
attention. Notifications are different from the Community feed on Today:

|                                    | Community feed                             | Notifications                            |
| ---------------------------------- | ------------------------------------------ | ---------------------------------------- |
| What it shows                      | What friends have been reading and writing | Things addressed to _you_                |
| Read / unread                      | No                                         | Yes — the bell shows how many are unread |
| Dismiss                            | No                                         | Yes — each one can be dismissed          |
| Actions                            | Open a note or a passage                   | Accept a request, open release notes, …  |
| Reaches you when the app is closed | No                                         | Yes, with push turned on                 |

Every notification has:

- an **id** that stays the same for as long as the thing it's about exists
  (`friend-request:<request id>`, `app-update:1.18.0`). Read and dismissed
  state is stored against this id.
- a **kind**, which decides how it's drawn and what its actions are.
- a **time** (`createdAtMs`), used for sorting newest first.

### Kinds built so far

| Kind            | Id                                      | Comes from                                                                | Actions                             |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| `friendRequest` | `friend-request:<shared permission id>` | `FriendsManager.incomingRequests`                                         | Accept, Decline, open their profile |
| `appUpdate`     | `app-update:<version>`                  | The app noticing it's running a newer version than this account last used | See what's new (the release notes)  |

### Kinds planned next

These fit the same model without changes to the manager; each is a new
_source_ (section 3) plus a row in the feed.

- **Friend request accepted** — "Ada accepted your friend request". The relay
  (section 6) can push it the same way as a request; the in-app version needs
  the friends list to say when each friendship started.
- **Shared session invite** — today's live session cards (`SharedSessionsToasts`
  in `Tabs.tsx`) could also land in the list, so an invite missed while away is
  still there.
- **Announcements from the Seed Bible team** — a `publicRead` data record in a
  team-owned record holds the text; a team-owned CasualOS notification with the
  `publicRead` marker carries the push (section 7).

## 2. Where it lives in the code

| Piece                                                    | File                                                     |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Types, sources, read/dismiss state, toast rules          | `managers/NotificationsManager.tsx`                      |
| Stored state format and merging                          | `managers/NotificationState.ts`                          |
| Push on this device: permission, subscription, sending   | `managers/PushNotificationsManager.tsx`                  |
| Bell and unread badge on Today                           | `components/TodayPane/NotificationsButton.tsx`           |
| The list itself                                          | `components/NotificationsFeed/`                          |
| The "get notifications on this device" card in the list  | `components/NotificationsFeed/PushNotificationsCard.tsx` |
| Push relay on our server                                 | `server/notifications.ts`                                |
| Showing a push and handling a tap, in the service worker | `standalone/swPush.ts`, wired up in `standalone/sw.ts`   |

(Paths under `managers/` and `components/` are inside
`packages/seed-bible/seed-bible/`.)

## 3. Sources

The manager doesn't know where notifications come from. Each kind has a
**source**: a signal holding that kind's current notifications, plus a flag for
whether it has finished its first load.

```ts
interface NotificationSource {
  notifications: ReadonlySignal<AppNotification[]>;
  /** False until the first load for the signed-in account has finished. */
  isReady: ReadonlySignal<boolean>;
}
```

A source only says what exists _right now_. A friend request that was accepted
or withdrawn simply stops being listed, and its notification goes with it. That
keeps the list honest without the manager tracking every change itself.

Adding a kind means: add it to the `AppNotification` union, write a source,
register it in `createNotificationsManager`, and draw it in the feed.

## 4. Read and dismissed

**Unread** means the person hasn't opened the list since the notification
appeared. Opening the list marks everything in it as seen. The bell's badge is
the unread count.

**Dismissed** means the person removed it from the list. Dismissing a friend
request only hides the notification: the request is still waiting in the
Friends screen, and Accept/Decline there still work.

### Where that's stored

Both are kept per account, so reading a notification on the phone clears it on
the laptop too:

- **On the account:** a data record item at address `notifications` in the
  person's own record, with the `private` marker so only they can read it. (Not
  in the profile — the profile is `publicRead`.)
- **On the device:** a copy in `localStorage` under
  `sb-notifications:<user id>`, so the badge is right as soon as the page loads,
  before the account copy arrives. Signed out, the device copy is the only
  copy (`sb-notifications:signed-out`).

```ts
interface NotificationState {
  /** Notification id → when it was first seen. */
  seen: Record<string, number>;
  /** Notification id → when it was dismissed. */
  dismissed: Record<string, number>;
  /** The newest app version this account has run; see 5.2. */
  appVersion: {
    version: string;
    previousVersion: string | null;
    sinceMs: number;
  } | null;
}
```

**Merging.** CasualOS records have no version check: a write simply replaces
what's there. So every write reads the account copy first and merges: `seen`
and `dismissed` are combined (an id seen on either device counts as seen), and
`appVersion` keeps the newer version. Two devices writing at once can't undo
each other's reads or dismissals — the worst case is one device's change
arriving a write later.

**Pruning.** Entries older than 90 days are dropped on each write, so the
record doesn't grow forever. Nothing that old is still listed: friend requests
expire after 7 days and an update notice after 30.

**When the account copy can't be read** (offline, a server error), nothing is
written to it. Writing then would replace real read/dismissed state with this
device's partial copy.

## 5. Kinds in detail

### 5.1 Friend requests

Straight from `FriendsManager.incomingRequests`, one notification per person
(the friends manager already shows only each person's newest request). Its
actions call `friends.acceptRequest` / `friends.declineRequest`, the same as
the Friends screen.

Friend requests are only read when the app opens, on sign-in, and when the app
comes back into focus (at most every 30 seconds). With push turned on, a push
arriving while the app is open also triggers a refresh, so the new request
shows up straight away.

### 5.2 App updates

When the account first runs a newer version of Seed Bible than it last ran,
an "Seed Bible was updated to 1.18.0 — see what's new" notification appears,
linking to that version's GitHub release notes. It stays for 30 days or until
dismissed, and only the newest update is ever listed.

The very first version an account runs with this feature doesn't produce a
notice: there's no "before" to compare with. Neither does a brand-new account.

The check waits for the account copy of the state to load, so a new device
signing in to an existing account compares against the version the account
last ran, not against nothing.

## 6. Toasts

When new notifications arrive, a toast says so, and tapping it opens the list:

- one new notification: what it is — "Ada sent you a friend request";
- several: "You have 3 new notifications".

"New" means unread, not dismissed, and not yet announced **on this device**.
Each device remembers what it has announced (`sb-notifications-announced:<user
id>` in `localStorage`), so a notification is announced once per device: on the
phone when it arrives, and again on the laptop the next time it's opened — which
is the "after signing in" case.

The toast waits until every source has finished its first load and the account
copy of the state has loaded (or failed to). Otherwise it would announce
notifications that another device has already marked as seen, or announce
"1 new" and then "2 new" a moment later.

No toast while the list is open: the person is already looking at it.

## 7. Push notifications

### 7.1 What the person does

At the top of the notifications list, a card offers "Get notifications on this
device". Tapping it asks the browser for permission (browsers only allow that
from a tap). After that, a friend request reaches the phone's lock screen even
with Seed Bible closed. Tapping the push opens Seed Bible on Today with the list
open.

The card explains instead of offering when push can't work:

- **iPhone or iPad in Safari:** push only works once Seed Bible is added to the
  Home Screen (iOS 16.4 and later). The card says how.
- **Notifications blocked:** the person has to allow them in the browser's site
  settings; the card says so.
- **Browser without push, or push not set up on the server:** no card.

Turning it on is per device. Signing out turns it off for that device, because
otherwise the device would keep receiving the previous person's notifications
(CasualOS links a device to every account that signed in on it).

**In the code** this is `state.pushNotifications`. Its `status` decides what
the card shows:

| `status`        | Meaning                                                                          | The card                                 |
| --------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| `checking`      | Still finding out (and always, on the server and before the first render)        | Nothing                                  |
| `unsupported`   | No push in this browser, or no service worker (`pnpm dev`, most branch previews) | Nothing                                  |
| `unconfigured`  | The server's relay is off, or CasualOS answered that it can't send pushes        | Nothing (or "not available" after a tap) |
| `signed-out`    | Nobody is signed in, so there's no account to send to                            | Nothing                                  |
| `needs-install` | iPhone or iPad, in Safari rather than the Home Screen app                        | How to add it to the Home Screen         |
| `denied`        | Notifications are blocked for the site                                           | Where to unblock them                    |
| `off`           | Signed in, could be turned on                                                    | "Turn on"                                |
| `on`            | This browser receives the signed-in account's pushes                             | "Turn off"                               |

`isBusy` and `error` (`dismissed`, `unavailable`, `failed`) are for the card's
button and message. `enable()` must be called straight from a tap.

**Which account a device belongs to** is remembered on the device, under
`sb-push-user` in `localStorage`: the user id, the push endpoint, the notifier
it was set up for, and when it last registered with CasualOS. `on` means that
record names the signed-in user and this browser's current subscription. Any
subscription the record doesn't vouch for — left by an account that signed
out, by another account on a shared computer, or by a setup that failed
halfway — is ended as soon as the app sees it (on start, on a sign-in change,
when the app comes back into view, and when another tab changes the record).

**Turning it off** only ends this browser's subscription. It doesn't
unsubscribe the account from its `inbox` (that would turn push off on all its
devices at once) and doesn't take the notifier's permission away (the other
devices still need it).

### 7.2 How a push travels

CasualOS already stores push subscriptions and sends web pushes (its
"notification records"). What it doesn't allow is a stranger sending a push to
someone: no permission marker grants `send` to "anyone", and the friend request
itself grants nothing until it's accepted. So a friend request push goes
through a small relay on our own server, which checks the request is real
before anything is sent.

```
 Ada's app                 Seed Bible server              CasualOS                 Ben's phone
    │ send friend request ──────────────────────────────────▶│                          │
    │ POST /api/notifications/friend-request                 │                          │
    │   {requestId}, Ada's session ─▶│                       │                          │
    │                                │ is this request real? │                          │
    │                                │ (as Ada) ────────────▶│                          │
    │                                │ send to Ben's inbox   │                          │
    │                                │ (as the notifier) ───▶│ web push ───────────────▶│
```

**Setting up a device (Ben's app, when Ben turns push on):**

1. Ask the browser for permission. This comes first, before any network
   request, because browsers only show the prompt while it still counts as
   part of the tap.
2. Subscribe the browser to push with CasualOS's VAPID key
   (`getNotificationsApplicationServerKey`, converted from URL-safe base64 to
   bytes). It's always a new subscription: any the browser already had is
   ended first, since CasualOS may still have it linked to someone else.
3. Create (or re-create) a notification called `inbox` in Ben's own record,
   with the `private` marker (`recordNotification`). Strangers can't subscribe
   to it or read it.
4. Subscribe Ben to it with this device (`subscribeToNotification`). CasualOS
   links the subscription to Ben's account, so every device Ben turns push on
   for receives it.
5. Allow one account, the **notifier**, to send to that one notification
   (`grantPermission`, `action: "send"`, on resource `inbox` only). The
   notifier gets no access to any of Ben's data.

If any step fails, the new browser subscription is ended again, the card says
it didn't work, and the status stays `off`; trying again starts over.

**Keeping it working.** Once a day, on start, the app registers the
subscription with CasualOS again (`registerPushSubscription`), in case
CasualOS dropped it: it does when a push to the device ever fails. A browser
that renewed its subscription (a new endpoint) is registered straight away.
If `/api/notifications/config` names a different notifier than the one the
device was set up for, the app grants the new one.

**Sending (the relay, `server/notifications.ts`):**

1. Ada's app calls `POST /api/notifications/friend-request` with the request id,
   signed with Ada's session key.
2. The relay asks CasualOS, as Ada, for Ada's sent requests and checks this one
   is there: still waiting, made in the last 15 minutes, for the friends
   permission only.
3. It limits how often it sends: once per request, a handful per hour per
   sender and per recipient.
4. It writes the text itself from Ada's public profile name. Ada's app can't
   choose what Ben's phone shows or where tapping it goes.
5. It sends as the notifier to Ben's `inbox`. If Ben never turned push on,
   CasualOS says the notification doesn't exist and nothing is sent.

Why a relay rather than letting friends' apps send directly: the request
arrives _before_ the two are friends, so there's no permission to send with;
and anyone able to send to Ben's inbox also spends Ben's push quota on the
CasualOS server.

Ada's app asks for the push only for a brand-new request: `FriendsManager`
calls its `onRequestSent` option when `sendRequest` really sent one, not when
the two were already friends, a request was already waiting, or Ben's own
request was accepted instead. The app doesn't wait for the answer; a push that
can't be sent is only logged.

**The relay's API.** Both routes answer JSON with `Cache-Control: no-store`.

`GET /api/notifications/config` → `{ "push": { "notifierUserId": "…",
"inboxAddress": "inbox" } }`, or `{ "push": null }` when the relay is off.

`POST /api/notifications/friend-request` with `{ "requestId": "…" }` and
`Authorization: Bearer <the sender's session key>` (bodies over 4 KB are
refused unread):

| Answer                                                                                               | When                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 200 `{ "accepted": true }`                                                                           | CasualOS took the push, or the recipient never turned push on — answered the same, so a sender can't tell whether someone has push on |
| 400 `invalid_request`                                                                                | The body isn't JSON with a `requestId` string                                                                                         |
| 401 `not_signed_in` / `invalid_session`                                                              | No bearer key, or one that isn't a live CasualOS session                                                                              |
| 404 `request_not_found`                                                                              | The request isn't among the sender's sent requests                                                                                    |
| 409 `request_not_pending`, `not_a_friend_request`, `no_recipient`, `request_too_old`, `already_sent` | The request doesn't qualify, or was already pushed                                                                                    |
| 413 `body_too_large`                                                                                 | Over 4 KB                                                                                                                             |
| 429 `rate_limited` (with `Retry-After`)                                                              | Over 10 an hour for this sender, or for this recipient                                                                                |
| 502 `upstream_error`                                                                                 | CasualOS couldn't be reached or failed; the detail is only in the server log                                                          |
| 503 `push_relay_off`                                                                                 | No notifier configured, or its key has expired                                                                                        |

Errors are `{ "error": "<code>" }`. What CasualOS said is never passed on.

The sender's limit counts every lookup their key gets through, found or not,
and is checked before CasualOS is asked, so a sender over it costs nothing. A
forged key naming someone else never counts against them: it's only counted
once CasualOS accepts it. A request id is remembered for 30 minutes after its
push; a push that failed on the way (a 502) can be asked for again.

The push itself:

```json
{
  "title": "New friend request",
  "body": "Ada wants to be your friend on Seed Bible.",
  "icon": "https://favicon.ao.bot/pwa/pwa-192x192.png",
  "tag": "friend-request",
  "timestamp": 1762750000000,
  "action": {
    "type": "open_url",
    "url": "https://seedbible.org/?notifications=open"
  }
}
```

The name comes from the sender's public profile, on one line and cut to 60
characters; with no name it's "Someone". No `topic` is sent: CasualOS passes
it to the push service, which rejects anything but up to 32 letters, digits,
`-` and `_` — and then the push silently never arrives while the call still
reports success.

The text is English for now: the relay doesn't know the recipient's
language. Writing it in their language means storing it somewhere the relay
can read (their public profile, say), or sending a short code the service
worker turns into text with its own translations.

### 7.3 The service worker

`standalone/sw.ts` gains two handlers (logic in `standalone/swPush.ts`):

- **`push`:** shows the notification. Browsers require every push to show
  something, so a push that can't be read still shows a plain "Seed Bible —
  you have a new notification". It also tells every open Seed Bible window
  (`postMessage({ type: "sb-push-received", tag })`), and
  `PushNotificationsManager` answers that with `notifications.refresh()`.
  Only an `open_url` action is used; a `webhook` action (which would have the
  device call a URL) and extra action buttons are ignored.
- **`notificationclick`:** focuses an open Seed Bible window and takes it to
  the notification's link, or opens a new window when there's none, or when
  the open one can't be navigated (a window the worker doesn't control).
  Only links to Seed Bible's own site are followed; anything else opens the
  home page. A branch preview window (`/b/...`) is never taken over.

"Seed Bible's own site" is the origin the service worker runs on, so
`NOTIFICATIONS_SITE_ORIGIN` (below) must be exactly that origin — with or
without `www.` as the site is served — or every tap opens the home page.

Only the production (`main`) build has a service worker, so push can't be
tried in `pnpm dev` or on a branch preview. Everything else — the bell, the
list, toasts, update notices — works everywhere.

### 7.4 Server configuration

The relay is off until it's given a notifier account:

| Variable                    | Default                      | What it's for                                                                   |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `NOTIFIER_SESSION_KEY`      | _(unset — push relay off)_   | Session key of the account that sends pushes. Its user id is read from the key. |
| `CASUALOS_AUTH_ENDPOINT`    | `https://auth.seedbible.org` | The CasualOS records server.                                                    |
| `NOTIFICATIONS_SITE_ORIGIN` | `https://seedbible.org`      | Where tapping a push goes, and the `Origin` CasualOS checks on API calls.       |

`GET /api/notifications/config` tells the app whether push is available and
which account to allow as the notifier. When the relay is off, the app doesn't
offer push at all.

A value that can't be used (a key that isn't a session key, an origin that
isn't a URL) turns the relay off with an error in the log rather than stopping
the server. So does a notifier key that has expired: CasualOS session keys
carry their expiry, and the relay reads it.

**Before turning it on in production**, someone with access to
`auth.seedbible.org` should check that:

- web push (VAPID keys) is configured — without it every notification call
  answers `not_supported`;
- the default subscription tier allows notifications, with sensible
  `maxSentPushNotificationsPerPeriod` limits;
- `https://seedbible.org` is an allowed API origin;
- a dedicated notifier account exists, and its session key is stored as a
  server secret (not in the repository). Session keys expire, so either use
  a long-lived session or plan to replace the key; the startup log says
  `push relay: on` or `off`.

None of this could be tried against the real server while it was built (the
build sandbox can't reach `auth.seedbible.org`), so on a first deploy also
check, with two test accounts on two devices:

- turning push on succeeds, and the `grantPermission` call for the notifier
  (a per-resource grant with no `options`) is accepted;
- turning it on a second time, on the same or another device, works (the
  grant and `recordNotification` are repeated each time);
- a friend request reaches the other device's lock screen, and tapping it
  opens Today with the list open;
- after signing out on a device, a new request no longer reaches it.

**Known limits.** The relay's limits live in each server process's memory, so
with several instances each keeps its own count. Signing out ends the
browser's subscription, but CasualOS only forgets the device the next time a
push to it fails.

### 7.5 Team announcements (planned)

For "a new Seed Bible update was released", sent to everyone with push on:

1. A team-owned record (a studio, so the team's quota applies) holds one
   notification, `announcements`, with the `publicRead` marker. Anyone can
   subscribe to it; only the team can send.
2. Devices subscribe to it when push is turned on, next to their own `inbox`
   (`/api/notifications/config` will say which record).
3. A release step (or a script) sends to it. The in-app update notice (5.2)
   already covers people who open the app; the push reaches those who don't.

## 8. Privacy and abuse

- The read/dismissed record is `private`: only its owner can read it.
- The `inbox` notification is `private`: nobody else can subscribe to it or see
  who's subscribed.
- The notifier can only send to `inbox`; it can't read anyone's data.
- Push text is written by the relay from public profile names, never by the
  sender's app.
- A push shows the sender's name on the lock screen, the way most apps show
  "Ada sent you a friend request".
- The relay keeps nothing on disk. Its once-per-request and per-hour limits
  live in memory, so a server restart resets them — acceptable for friend
  requests, which CasualOS limits separately.
