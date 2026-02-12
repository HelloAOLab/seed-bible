import { opentypeJs } from "https://esm.helloao.org/painter-vendor-IGDNTFOW.js";
import focusOnWithCatch from "ext_geoImporter.importer.focusOnWithCatch";
globalThis.GlobalBaseMap = "satellite";
globalThis.OpentypeJs = opentypeJs;
if (configBot.tags.systemPortal) return;

globalThis.focusOnWithCatch = focusOnWithCatch;
