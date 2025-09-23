const playingTrophy = getBot(byTag("isPlaying",true),byTag("isTrophy",true));
const isCreatingGame = getBot(byTag("isCreateGameButton",true),byTag("isActive",true));
// InstanceManager.TryClearVideoTimeout();
// thisBot.TryToLerp();

if(playingTrophy?.tags.isPlaying || isCreatingGame) return;

setTag(thisBot,"cursor","grabbing");
// globalThis.videoShowTimer = setTimeout(()=>{ InstanceManager.RenderVideo({botType: globalThis.CONSTANTS.BOT_TYPE.TESTAMENT, botRank: thisBot.tags.testamentIndex === 1 ? 0: 1 , lerpedObject: thisBot}); clearTimeout(globalThis.videoShowTimer); },1200);