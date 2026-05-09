await thisBot.onRemoteJoined();

// Navigation lock to prevent rapid fire and loops
if (!globalThis.__emitLock) globalThis.__emitLock = {};
if (!globalThis.__lastEmitTime) globalThis.__lastEmitTime = {};
if (!globalThis.__lastEmitData) globalThis.__lastEmitData = {};
if (!globalThis.__navCooldownUntil) globalThis.__navCooldownUntil = 0;
const EMIT_DEBOUNCE_MS = 150; // Short debounce - just prevents double-clicks
const NAV_COOLDOWN_MS = 600; // Cooldown after receiving remote nav

async function emitData(functionName, data) {
  const remoteId = getID(configBot);
  const now = Date.now();

  // Skip if this was triggered by a remote update (prevents loop)
  if (globalThis.__remoteBookUpdate && functionName === "book") {
    globalThis.__remoteBookUpdate = false;
    os.log("emitData: skipping 'book' emit - originated from remote");
    return;
  }

  // Skip if we're in cooldown period after receiving remote navigation
  if (functionName === "book" && now < globalThis.__navCooldownUntil) {
    os.log("emitData: skipping 'book' emit - in cooldown after remote nav");
    return;
  }

  // Skip if emitter was marked to skip (for highlight events)
  if (masks?.skip && functionName === "highlight") {
    masks.skip = false;
    os.log("emitData: skipping 'highlight' emit - marked to skip");
    return;
  }

  // For book events: skip if same destination as last emit (dedup)
  if (functionName === "book") {
    const lastData = globalThis.__lastEmitData["book"];
    if (
      lastData &&
      lastData.bookId === data?.bookId &&
      lastData.chapter === data?.chapter
    ) {
      os.log("emitData: skipping duplicate book emit - same destination");
      return;
    }
    globalThis.__lastEmitData["book"] = {
      bookId: data?.bookId,
      chapter: data?.chapter,
    };
  }

  // Debounce rapid emissions of same event type (short - just prevents accidental double-clicks)
  const lastTime = globalThis.__lastEmitTime[functionName] || 0;
  if (now - lastTime < EMIT_DEBOUNCE_MS) {
    os.log("emitData: debouncing", functionName);
    return;
  }
  globalThis.__lastEmitTime[functionName] = now;

  const remotes = await os.remotes();
  const otherRemotes = remotes.filter((id) => id !== remoteId);

  // Include senderId in payload to help receivers detect their own echoes
  const payload = {
    ...data,
    senderId: remoteId,
    timestamp: now,
  };

  os.log("emitting", functionName, "to", otherRemotes);
  sendRemoteData(otherRemotes, functionName, { sd: JSON.stringify(payload) });
}

globalThis.EmitData = emitData;
