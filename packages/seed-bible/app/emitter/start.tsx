await thisBot.onRemoteJoined();

function emitData(functionName, data) {
  // console.log(globalThis?.CurrentActiveTabData, CurrentBookData, 'user tabs data')

  sendRemoteData(masks.otherRemotes, functionName, data);
}
globalThis.EmitData = emitData;
