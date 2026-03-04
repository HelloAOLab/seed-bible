const keys = [...(that?.keys || [])];
const G = globalThis;
const multiSelectKeys: any = {
  control: true,
  meta: true,
};

keys?.forEach((key) => {
  if (!G.KEY_HOLD) {
    G.KEY_HOLD = {};
  }
  G.KEY_HOLD[key.toLocaleLowerCase()] = false;

  if (multiSelectKeys[key.toLocaleLowerCase()]) {
    G[`SetSelectPlaylist`] && G[`SetSelectPlaylist`](false);

    G[`SetChecklistEnabled`] && G[`SetChecklistEnabled`](false);
  }
  delete G.KEY_HOLD[key];
});
