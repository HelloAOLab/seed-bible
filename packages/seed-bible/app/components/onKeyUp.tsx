const keys = [...(that?.keys || [])];

const multiSelectKeys = {
  control: true,
  meta: true,
};

keys?.forEach((key: any) => {
  if (!globalThis.KEY_HOLD) {
    globalThis.KEY_HOLD = {};
  }
  globalThis.KEY_HOLD[key.toLocaleLowerCase()] = false;

  if (multiSelectKeys[key.toLocaleLowerCase()]) {
    globalThis[`SetSelectPlaylist`] && globalThis[`SetSelectPlaylist`](false);

    globalThis[`SetChecklistEnabled`] &&
      globalThis[`SetChecklistEnabled`](false);
  }
  delete globalThis.KEY_HOLD[key];
});
