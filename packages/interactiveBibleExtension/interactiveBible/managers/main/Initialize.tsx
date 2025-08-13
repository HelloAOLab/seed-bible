if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);

const InstanceManager = getBot(byTag("system", "interactiveBible.managers.InstanceManager"))
const LerpColorManager = getBot(byTag("system", "interactiveBible.managers.LerpColorManager"))
const MapsManager = getBot(byTag("system", "interactiveBible.managers.MapsManager"))
const SoundsManager = getBot(byTag("system", "interactiveBible.managers.SoundsManager"))
const VFXManager = getBot(byTag("system", "interactiveBible.managers.VFXManager"))
const RobotoFont = getBot(byTag("system", "interactiveBible.managers.robotoFont"))

InstanceManager.LocalInitialize();
InstanceManager.SharedInitialize();
LerpColorManager.Initialize();
MapsManager.Initialize();
SoundsManager.Initialize();
VFXManager.Initialize();
RobotoFont.Initialize();