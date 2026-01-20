tags.sessions = null;
tags.onlineTab = null;
configBot.tags.title = "Seed Bible";
tags.iconPointer = 0;
tags.colorPointer = 0;
tags.usersAuthIds = [];
const authBot = await os.requestAuthBotInBackground();
if (authBot?.id) {
  if (!tags.usersAuthIds.includes(authBot.id)) {
    tags.usersAuthIds.push(authBot.id);
  }
}
