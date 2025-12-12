const { appId } = that;

if (thisBot.vars.appId && thisBot.vars.appId == appId) {
  console.log(`[Debug] onFloatingAppRemoved my app removed`, {
    appId,
    "thisBot.vars.appId": thisBot.vars.appId,
  });
  thisBot.vars.appId = null;
  thisBot.ClearExperience();
}
