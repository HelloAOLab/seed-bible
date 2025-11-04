await thisBot.onRemoteJoined();

function emitData(functionName, data) {
  if (masks.skip) {
    masks.skip = false
    return
  }
  sendRemoteData(masks.otherRemotes, functionName, data);
}

globalThis.EmitData = emitData;
