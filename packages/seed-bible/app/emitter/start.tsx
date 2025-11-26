await thisBot.onRemoteJoined();

async function emitData(functionName, data) {
  
      const remotes = await os.remotes();
    const remoteId = getID(configBot);
    const otherRemotes = remotes.filter(id => id !== remoteId);
    os.log("emitting", functionName, "to", otherRemotes, (data));
  sendRemoteData(otherRemotes, functionName, {sd:JSON.stringify(data)});
}

globalThis.EmitData = emitData;
