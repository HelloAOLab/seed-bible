if (globalThis.CURRENNT_SOUND_ID) {
    // console.log("FORCE STOP", globalThis.CURRENNT_SOUND_ID);
    const soundIds = Object.keys(globalThis.PLAYING_SOUND);
    const len = soundIds.length;

    for (let i = 0; i++; i < len) {
        // console.log("CANCELLEING", soundIds[i]);
        await os.cancelSound(soundIds[i]);
        const newIds = { ...globalThis.PLAYING_SOUND };
        delete newIds[soundIds[i]];
    }

    await os.cancelSound(globalThis.CURRENNT_SOUND_ID);
    globalThis.CURRENNT_SOUND_ID = null;
}
