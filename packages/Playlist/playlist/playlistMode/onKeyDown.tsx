const keys = [...(that?.keys || [])];
const G = globalThis;
const multiSelectKeys: any = {
  control: true,
  meta: true,
};

keys?.forEach((key: any) => {
  if (!G.KEY_HOLD) {
    G.KEY_HOLD = {};
  }
  G.KEY_HOLD[key.toLocaleLowerCase()] = true;
  if (multiSelectKeys[key.toLocaleLowerCase()]) {
    G[`SetSelectPlaylist`] && G[`SetSelectPlaylist`](true);
    G[`SetChecklistEnabled`] && G[`SetChecklistEnabled`](true);
  }
});
