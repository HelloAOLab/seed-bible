const { appId } = that;

if (thisBot.vars.appId && thisBot.vars.appId == appId) {
  thisBot.vars.appId = null;
  thisBot.ClearExperience();
}
