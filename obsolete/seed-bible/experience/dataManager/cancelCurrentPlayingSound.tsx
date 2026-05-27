const G = globalThis as any;
if (G.CURRENNT_SOUND_ID) {
  // console.log("FORCE STOP", globalThis.CURRENNT_SOUND_ID);
  const soundIds: any[] = Object.keys(G.PLAYING_SOUND);
  const len = soundIds.length;

  for (let i = 0; i++; i < len) {
    // console.log("CANCELLEING", soundIds[i]);
    await os.cancelSound(soundIds[i] || 0);
    const newIds = { ...G.PLAYING_SOUND };
    delete newIds[soundIds[i] || 0];
  }

  await os.cancelSound(G.CURRENNT_SOUND_ID || 0);
  G.CURRENNT_SOUND_ID = null;
}
