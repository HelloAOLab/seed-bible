import { loadMap } from "./loadMap";

console.log("----------------- geo importer! --------------");

if (configBot.tags.mapData) {
  loadMap(configBot.tags.mapData);
}
