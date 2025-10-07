var feature = that;
var geometry = feature.geometry;
var coordinates = geometry.coordinates;
var id = feature.properties.id;

let elem = tags.feature_types.Point;
elem.geo_json_element = true;
elem.geo_json_type = geometry.type;
elem.geo_json_id = id;
elem[tags.targetDim] = true;
elem[tags.targetDim + "X"] = coordinates[0];
elem[tags.targetDim + "Y"] = coordinates[1];
let elemBot = create(elem);

if (elemBot && masks.initGame) {
  setTagMask(elemBot, "labelOpacity", 0, "tempLocal");
  setTagMask(elemBot, "lineTo", [], "tempLocal");
}
