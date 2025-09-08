if(thisBot.masks.initialized || !thisBot.masks?.activated) return;
let result = await thisBot.InitOpenAiClient();
if(!result){
    os.toast("Unable to load your assistant!");
    return
}
let {dimension} = that;
setTagMask(thisBot, "initialized", true, "tempLocal");
if(configBot.tags.miniMapPortal === "map_portal")
{
    that.dimension = configBot.tags.miniMapPortal;
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    that.dimension = configBot.tags.mapPortal;
    dimension = configBot.tags.mapPortal;
}

await os.sleep(500)

let jarvis = {};
jarvis[dimension] = true;
jarvis.jarvis = true;
jarvis.draggable = false;
jarvis.space = "tempLocal";
jarvis.form = "sphere";
jarvis.scale = 1;
jarvis.scaleZ = 1;
jarvis.onClick = `@`;
jarvis.onPointerDown = tags.jarvisOnPointerDown;
jarvis.onPointerUp = tags.jarvisOnPointerUp;
jarvis.onDestroy = tags.jarvisOnDelete;
jarvis.onDrag = tags.jarvisOnDrag;
jarvis.interval = 1;
jarvis.animationsPool = ["Spawn", "Idle", "Alert", "Scanning", "Loading", "Speaking", "Recording"];
jarvis.exclamationMarkLineUrl = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/2f8fb7c9a4f6a1e61434fdae81903c120119973482491576fb4f59ad301c7474.bin";
jarvis.alertColor = "#fff100";
jarvis.idleColorAO = "#E6E6E6";
jarvis.idleColorRingBots = "#FFFFFF";
jarvis.loadingColorAO = "#97C5CC";
jarvis.loadingColorRingBots = "#DBFAFF";
jarvis.recordingColorAO = "#FCAEAE";
jarvis.recordingColorRingBots = "#FFEADD";
jarvis.scanningColorAO = "#54B435";
jarvis.scanningColorRingBots = "#82CD47";
jarvis.speakingColorAO = "#C8A1E0";
jarvis.speakingColorRingBots = "#E2BFD9";
jarvis.Spawn = tags.Spawn;
jarvis.Idle = tags.Idle;
jarvis.Loading = tags.Loading;
jarvis.Recording = tags.Recording;
jarvis.Speaking = tags.Speaking;
jarvis.Alert = tags.Alert;
jarvis.Scanning = tags.Scanning;
jarvis.SetUpAnimationBots = tags.SetUpAnimationBots;
jarvis.baseJarvis = "🔗" + thisBot.id;
jarvis.onGridClick = tags.onGridClick;
jarvis.aoLogo = tags.aoLogo;
jarvis.onFileUpload = tags.onFileUpload;
jarvis.SpawnMesh = tags.SpawnMesh;
jarvis.ScanBot = tags.ScanBot;

let jarvisInstance = create(jarvis);

await jarvisInstance.SetUpAnimationBots();
await jarvisInstance.Spawn({positionInfo: that});
// whisper(links.baseJarvis, "handleVoice", {msg: "hey there, I am your AI assistant. To communicate please hold me so I can listen to you."})

// whisper(getBot('system', "experience.jarvis"), "handleVoice", {msg: "Hi, I am your assistant. You can call me AO. Tap and hold on me and I will be able to hear you.", intro: "true"});