// tags.sessions =null
// tags.onlineTab = null
configBot.tags.title = "Seed Bible";
const authBot = await os.requestAuthBotInBackground();
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
  shout("userLogin", { authId, configId: configBot.id });
}
os.log("onInstJoined: updated usersAuthIds:", tags.usersAuthIds);
