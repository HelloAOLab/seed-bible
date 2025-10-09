await thisBot.onRemoteJoined();

function emitData(functionName, data) {
  sendRemoteData(masks.otherRemotes, functionName, data);
}

globalThis.EmitData = emitData;
