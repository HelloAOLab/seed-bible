const { data } = that || {};

if (!data) return;

if (globalThis.PLAY_TIMER) clearTimeout(globalThis.PLAY_TIMER);

globalThis.PLAY_TIMER = setTimeout(async () => {
    if (!globalThis.PLAYING_SOUND) {
        globalThis.PLAYING_SOUND = {};
    }

    thisBot.cancelCurrentPlayingSound();

    const id = await os.playSound(data);

    globalThis.PLAYING_SOUND[id] = true;

    // console.log(globalThis.PLAYING_SOUND);

    globalThis.CURRENNT_SOUND_ID = id;
}, 20);