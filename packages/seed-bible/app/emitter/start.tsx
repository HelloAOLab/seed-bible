await thisBot.onRemoteJoined();

function emitData(functionName, data) {
  console.log("EMITTING", functionName, data);
  sendRemoteData(masks.otherRemotes, functionName, data);
}

globalThis.EmitData = emitData;
