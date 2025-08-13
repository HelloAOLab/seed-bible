/**
 * Initializes the InstanceManager's features that are intended to be handled locally. This function checks if the manager has already been initialized in local space,
 * and if not, sets up event handling for camera rotation changes, updates the onBotChanged behavior, 
 * and preloads meshes for faster access.
 *
 * @example
 * InstanceManager.Initialize();
 */

await os.sleep(1);
import {HistoryTimePeriodInfo} from "interactiveBible.managers.InstanceManager.HistoryTimePeriodInfo"

if(thisBot.masks.localInitialized || (typeof InstanceManager !== "undefined")) return;
setTagMask(thisBot, "localInitialized", true);

if(typeof InstanceManager === "undefined")
{
    globalThis.InstanceManager = thisBot;
}

thisBot.FixIframe();

const stacksManager = getBot(byTag("system", "interactiveBible.managers.StacksManager"));
const globalizer = getBot(byTag("system", "interactiveBible.managers.Globalizer"));
const objectPooler = getBot(byTag("system", "interactiveBible.managers.ObjectPooler"));

await stacksManager.Initialize();
await globalizer.Initialize();
await objectPooler.Initialize();

const nowTimePeriod = new HistoryTimePeriodInfo({color: "#ea42ea", isNowTimePeriod: true})
const defaultTimePeriod = new HistoryTimePeriodInfo({color: "#42ea6b", timeAmount: 30, timeUnit: TimeUnit.Days})
const onBotChanged = `@const changedTags = that.tags;
const cameraRotationChanged = changedTags.some((t) => {
    return t === 'cameraRotationX' ||
        t === 'cameraRotationY' ||
        t === 'cameraRotationZ';
})
if (cameraRotationChanged) {
    shout('OnCameraRotationChanged', { changedTags })
}
`
setTag(configBot, "mapPortal", null);
const gridBotOnBotChanged = gridPortalBot.tags.onBotChanged;
const finalBotChanged = (gridBotOnBotChanged ?? "") + onBotChanged;
thisBot.vars.history = [];
thisBot.vars.customArrangements = [];
thisBot.vars.fixedArrangementsInfo = [];
thisBot.vars.highlightHistory = [];
setTagMask(thisBot, 'highlightHistoryIndex', -1);
setTag(gridPortalBot, "onBotChanged", null);
setTag(gridPortalBot, "onBotChanged", finalBotChanged);
setTagMask(thisBot, "isInHistoryMode", false);
thisBot.masks.historyTimePeriodsInfo = [nowTimePeriod, defaultTimePeriod]
thisBot.SetLabelDateFormat({format: LabelDateFormats.Relative})
if(isNaN(thisBot.masks.currentTreeStage)) setTagMask(thisBot, "currentTreeStage", 1, "local")
// shout("abManifestStateAsleepOnEnter");
setTimeout(() => {
    const meshesUrls = Object.values(MeshesUrls)
    meshesUrls.forEach((meshUrl) => {os.bufferFormAddressGLTF(meshUrl)});
    thisBot.UpdateFixedArrangementsInfo();
}, 250)
setInterval(() => {
    shout(`UserPresenceUpdate`);
    shout("HistoryUpdate")
}, 1500)