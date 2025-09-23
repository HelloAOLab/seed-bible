if(thisBot.masks.initialized || typeof TabernacleManager !== "undefined") return;

setTagMask(thisBot, "initialized", true);

globalThis.TabernacleManager = thisBot;

globalThis.MeshState = {
    Hidden: "Hidden",
    Shown: "Shown",
    Translucent: "Translucent"
}

gridPortalBot.tags.portalCameraType = "perspective";

const keys = [
    "altar-of-sacrifice",
    "ark-of-covenant",
    "bronze-laver",
    "incense-altar",
    "menorah",
    "table-showbread",
    "cloth-brown",
    "cloth-red",
    "cloth-grey",
    "cloth-purple",
    "ground",
    "fence",
    "structure-front-pillars",
    "structure-inner-pillars",
    "structure-walls",
    "structure-rings",
    "structure-bars",
    "structure-inner-curtain",
    "structure-front-curtain",
]

// Development purposes
thisBot.SetBotsVisibility({data: keys.map((key) => { return {key, value: MeshState.Hidden} })});
// gridPortalBot.tags.portalBackgroundAddress = "https://publicos-link-filesbucket-404655125928.s3.amazonaws.com/ab-1/00471bdfd73c319edf496024c5349e51a6cf48589d29db12f17c5c71c7c9acbf"