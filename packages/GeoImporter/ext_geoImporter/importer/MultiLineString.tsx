var feature = that;
var geometry = feature.geometry;
var landOrWater = feature.properties.land_or_water;
var coordinate_bodies = geometry.coordinates;
var id = feature.properties.id;
var accumulatedLines = [];

for (var j = 0; j < coordinate_bodies.length; j++) {
  var coordinates = coordinate_bodies[j];

  var vertices = [];
  for (var k = 0; k < coordinates.length; k++) {
    var coordinate = coordinates[k];
    let elem = tags.feature_types.MultiLineString;
    elem.geo_json_element = true;
    elem.geo_json_type = geometry.type;
    elem.geo_json_id = id;
    elem.geo_json_land_or_water = landOrWater;
    elem.geo_json_line_body = j;
    elem.geo_json_line_vertex = k;
    elem[tags.targetDim] = true;
    elem[tags.targetDim + "X"] = coordinate[0];
    elem[tags.targetDim + "Y"] = coordinate[1];
    let elemBot = create(elem);
    console.log(elemBot);
    vertices.push(elemBot);
  }

  accumulatedLines.push(vertices);
}

for (var i = 0; i < accumulatedLines.length; i++) {
  var vertices = accumulatedLines[i];
  for (var j = 0; j < vertices.length; j++) {
    var vertex = vertices[j];
    var targetVert = vertices[(j + 1) % vertices.length];
    vertex.tags.lineTo = targetVert.tags.id;
    if (vertex && masks.initGame) {
      setTagMask(vertex, "labelOpacity", 0, "tempLocal");
      setTagMask(vertex, "lineTo", [], "tempLocal");
    }
  }
}
