const G = globalThis;
const { data } = that || {};

if (!data) return;

if (G.PLAY_TIMER) clearTimeout(G.PLAY_TIMER);

G.PLAY_TIMER = setTimeout(async () => {
  if (!G.PLAYING_SOUND) {
    G.PLAYING_SOUND = {};
  }

  thisBot.cancelCurrentPlayingSound();

  const id = await os.playSound(data);

  G.PLAYING_SOUND[id] = true;

  G.CURRENNT_SOUND_ID = id;
}, 20);
