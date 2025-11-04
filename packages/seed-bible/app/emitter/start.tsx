await thisBot.onRemoteJoined();

async function emitData(functionName, data) {
  if (masks.skip) {
    masks.skip = false
    return
  }
  const remotes = await os.remotes();
const remoteId = getID(configBot);
const otherRemotes = remotes.filter(id => id !== remoteId);
// os.log("emitting", functionName, "to", otherRemotes, data);
  sendRemoteData(otherRemotes, functionName, data);
}

globalThis.EmitData = emitData;
