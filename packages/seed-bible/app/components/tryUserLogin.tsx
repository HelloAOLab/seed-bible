try {
  const G = globalThis;
  const authBot = await os.requestAuthBot();
  if (!tags.usersAuthIds) {
    tags.usersAuthIds = [];
  }
  const authId = authBot?.id || null;
  const existingEntry = tags.usersAuthIds.find(
    (entry: { authId: string | null; configId: string }) =>
      entry.configId === configBot.id
  );
  if (!existingEntry) {
    tags.usersAuthIds.push({ authId, configId: configBot.id });
  } else if (existingEntry.authId !== authId && authId !== null) {
    existingEntry.authId = authId;
  }
  if (authBot?.id) {
    shout("historySaver", { force: true });
    G.SetIsSignedIn(true);
    G.SetUid(authBot.id);
    G.Init();
  }
} catch (e) {
  os.toast("Sign in failed: " + (e as Error).message);
}
