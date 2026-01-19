// tags.sessions =null
// tags.onlineTab = null
configBot.tags.title = "Seed Bible";
const authBot = await os.requestAuthBotInBackground();
os.log("onInstJoined: updated usersAuthIds:", tags.usersAuthIds);
if (authBot?.id) {
  if (!tags.usersAuthIds) {
    tags.usersAuthIds = [];
  }
  if (!tags.usersAuthIds.includes(authBot.id)) {
    tags.usersAuthIds.push(authBot.id);
  }
}
