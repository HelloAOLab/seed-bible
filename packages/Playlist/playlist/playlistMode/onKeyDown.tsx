const keys = [...(that?.keys || [])];
const G = globalThis as any;
const multiSelectKeys: any = {
  control: true,
  meta: true,
};

keys?.forEach((key) => {
  if (!G.KEY_HOLD) {
    G.KEY_HOLD = {};
  }
  G.KEY_HOLD[key.toLocaleLowerCase()] = true;
  if (multiSelectKeys[key.toLocaleLowerCase()]) {
    G[`SetSelectPlaylist`] && G[`SetSelectPlaylist`](true);
    G[`SetChecklistEnabled`] && G[`SetChecklistEnabled`](true);
  }
});
