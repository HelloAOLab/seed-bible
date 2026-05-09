/* global os, thisBot, configBot, getBot, shout, sendRemoteData */

// shout("updatedYourData", { user: that.remoteId, tab: { ...(that.that || {}) } });
// ========= SHARED (GLOBAL) META =========
if (that.name === "updateSharingData") {
  os.log("Handling updateSharingData for", that.remoteId);
  shout("updatedYourData", {
    user: that.remoteId,
    tab: { ...(that.that || {}) },
  });
  return;
}

// ---- small in-memory guards to prevent loops / storms
const lastSeenBySender = new Map(); // key: `${senderId}:${name}` -> timestamp(ms)
const lastAppliedEvent = new Map(); // key: eventName -> timestamp(ms)
const lastAppliedBookData = { bookId: null, chapter: null, timestamp: 0 }; // track last book nav
const LOOP_GUARD_MS = 1500; // block duplicate events within window
const BOOK_DEDUP_MS = 500; // stricter dedup for book events
const emitter = getBot("system", "app.emitter");
const evt = that;
const name = evt?.name;
const remoteId = evt?.remoteId; // sender of this event
if (!evt?.that?.sd) return;
os.log(evt.that, "payloaddd"); // event payload
const payload = JSON.parse(evt.that.sd);
if (!name || !remoteId) return;

const selfId = configBot.id;
const senderId = payload?.senderId; // who originally emitted this message
const now = Date.now();

// Extra guard: ignore if senderId matches self (echo prevention)
if (senderId === selfId) {
  os.log("Ignoring own echo:", name);
  return;
}

// helper: skip duplicate local applications for a short time
const recentlyApplied = (eventName) => {
  const last = lastAppliedEvent.get(eventName) || 0;
  if (now - last < LOOP_GUARD_MS) return true;
  lastAppliedEvent.set(eventName, now);
  return false;
};

// 1) ignore my own echoes
if (senderId && senderId === selfId) return;

// 2) light debounce per (senderId, name)
if (senderId) {
  const k = `${senderId}:${name}`;
  const last = lastSeenBySender.get(k) || 0;
  if (now - last < 200) return; // 200 ms dampener
  lastSeenBySender.set(k, now);
}

// 3) sessions lookup (authoritative source of relationships + config)
const mainBot = getBot("system", "app.components");
const sessions = mainBot?.tags?.sessions || {};

// Relation inference
const remoteSession = sessions[remoteId];
const iFollowRemote = !!remoteSession?.followers?.includes(selfId);

const mySession = sessions[selfId];
const isMyFollower = !!mySession?.followers?.includes(remoteId);

// If neither relationship exists, we’re not connected via a session
if (!iFollowRemote && !isMyFollower) {
  if (name === "updateSharingData") {
    return shout("updatedYourData", {
      user: remoteId,
      tab: { ...(payload || {}) },
    });
  }
  if (name === "personLeftTheChat") {
    return shout("onPersonLeftRemote", {
      user: remoteId,
      tab: { ...(payload || {}) },
    });
  }
  os.log("Ignoring event (no session relation):", name, "from", remoteId);
  return;
}

// Determine host session context
const hostId = iFollowRemote ? remoteId : selfId;
const hostSession = iFollowRemote ? remoteSession : mySession;
const cfg = hostSession?.config || {};
const followers = Array.isArray(hostSession?.followers)
  ? hostSession.followers
  : [];

// Permission helpers
const allowAllNav = !cfg.onlyHostNav;
const allowAllHighlight = !cfg.onlyHostHighlight;
const allowAutoScroll = cfg.autoScroll;
const highlightDuration = cfg.highlightDuration;
const iAmHost = selfId === hostId;
const iAmCoHost = Object.values(sessions).some((s) =>
  s?.coHosts?.includes(remoteId)
);

// Forward helper
const forwardToFollowersExcept = (excludeId, eventName, data) => {
  const targets = followers.filter((id) => id !== excludeId && id !== selfId);
  if (targets.length)
    sendRemoteData(targets, eventName, { ...data, senderId: selfId });
};

// ---------- MAIN HANDLER ----------
switch (name) {
  // ========= NAVIGATION =========
  case "book": {
    // Strict dedup: same book+chapter within short window
    const bookKey = `${payload?.bookId}-${payload?.chapter}`;
    const lastBookKey = lastAppliedEvent.get("book:data") || "";
    const lastBookTime = lastAppliedEvent.get("book") || 0;

    if (bookKey === lastBookKey && now - lastBookTime < BOOK_DEDUP_MS) {
      os.log("Skipped duplicate 'book' (same destination):", bookKey);
      return;
    }

    if (recentlyApplied("book")) {
      os.log("Skipped duplicate 'book' (loop guard)");
      return;
    }

    // Store what book we're navigating to
    lastAppliedEvent.set("book:data", bookKey);

    if (!allowAllNav && remoteId !== hostId && !iAmCoHost) {
      os.log("Blocked 'book' (host-only): follower tried to navigate.");
      return;
    }

    // Set flag BEFORE calling Open to prevent emit loop
    globalThis.__remoteBookUpdate = true;

    // Set cooldown - prevent local user from emitting nav for a short period
    // This prevents conflicts when "Everyone can navigate" is enabled
    globalThis.__navCooldownUntil = now + 600;

    // Also mark any pending data as from remote (prevents cache emit)
    if (globalThis.isCachedDataRef) {
      globalThis.isCachedDataRef.current = true;
    }

    // Call Open directly instead of shouting to avoid extra event chains
    if (globalThis.Open && payload?.bookId && payload?.chapter) {
      globalThis.Open(payload.bookId, payload.chapter);
    } else {
      shout("remoteBookChange", { ...(payload || {}) });
    }

    // Reset flag after a short delay to allow the navigation to complete
    setTimeout(() => {
      globalThis.__remoteBookUpdate = false;
    }, 150);

    // rebroadcast only if host AND the event didn't originate from self
    if (iAmHost && allowAllNav && remoteId !== hostId && senderId !== selfId) {
      forwardToFollowersExcept(remoteId, "book", payload || {});
    }
    return;
  }

  // ========= HIGHLIGHT =========
  case "highlight": {
    if (recentlyApplied("highlight")) {
      os.log("Skipped duplicate 'highlight' (loop guard)");
      return;
    }

    if (!allowAllHighlight && remoteId !== hostId && !iAmCoHost) {
      os.log("Blocked 'highlight' (host-only): follower tried to highlight.");
      return;
    }
    if (allowAllHighlight || iAmCoHost) {
      emitter.masks.skip = true;
    }
    shout("remoteHighlightChange", {
      ...(payload || {}),
      scroll: allowAutoScroll,
      fadeIn: highlightDuration,
    });

    if (iAmHost && allowAllHighlight && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "highlight", payload || {});
    }
    return;
  }

  // ========= SCROLL PRESENCE =========
  case "scrollPresence": {
    if (recentlyApplied("scrollPresence")) return;
    shout("remoteScrollPresence", { ...(payload || {}) });
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "scrollPresence", payload || {});
    }
    return;
  }

  // ========= VERSE CLICKED =========
  case "verseClicked": {
    if (recentlyApplied("verseClicked")) return;
    shout("remoteVerseClick", { ...(payload || {}) });
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "verseClicked", payload || {});
    }
    return;
  }

  // ========= APP CLICK =========
  case "appClick": {
    if (recentlyApplied("appClick")) return;
    if (payload?.name === "Playlist_package") return;
    const appName = payload?.name;
    if (appName && globalThis[appName]?.onClick) {
      try {
        globalThis[appName].onClick();
      } catch (e) {
        os.log("appClick error", e);
      }
    }
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "appClick", payload || {});
    }
    return;
  }

  // ========= PLAYLIST EVENTS =========
  case "playlistPlayed": {
    if (recentlyApplied("playlistPlayed")) return;
    if (!globalThis.Playlist) return os.toast("Please install playlist tool.");
    shout("remotePlaylistPlayed", { ...(payload || {}) });
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "playlistPlayed", payload || {});
    }
    return;
  }

  case "playlistQueueUpdated": {
    if (recentlyApplied("playlistQueueUpdated")) return;
    shout("remotePlaylistMetaDataUpdate", {
      ...(payload || {}),
      playlistUpdated: true,
    });
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "playlistQueueUpdated", payload || {});
    }
    return;
  }

  case "playlistCurrentIndexUpdate": {
    if (recentlyApplied("playlistCurrentIndexUpdate")) return;
    shout("remotePlaylistMetaDataUpdate", {
      ...(payload || {}),
      indexesUpdate: true,
    });
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(
        remoteId,
        "playlistCurrentIndexUpdate",
        payload || {}
      );
    }
    return;
  }

  case "playlistStopped": {
    if (recentlyApplied("playlistStopped")) return;
    shout("remotePlaylistStopped", { ...(payload || {}) });
    if (iAmHost && remoteId !== hostId) {
      forwardToFollowersExcept(remoteId, "playlistStopped", payload || {});
    }
    return;
  }

  // ========= SHARED (GLOBAL) META =========
  // case "updateSharingData": {
  //   shout("updatedYourData", { user: remoteId, tab: { ...(payload || {}) } });
  //   return;
  // }

  case "personLeftTheChat": {
    shout("onPersonLeftRemote", {
      user: remoteId,
      tab: { ...(payload || {}) },
    });
    return;
  }

  default:
    os.log("Unhandled remote event:", name);
    return;
}
