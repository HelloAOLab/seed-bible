const feature = that;
const geometry = feature.geometry;
const landOrWater = feature.properties.land_or_water;
const coordinate_bodies = geometry.coordinates;
const id = feature.properties.id;
const accumulatedLines = [];

for (let j = 0; j < coordinate_bodies.length; j++) {
  const coordinates = coordinate_bodies[j];

  const vertices: Bot[] = [];
  for (let k = 0; k < coordinates.length; k++) {
    const coordinate = coordinates[k];
    const elem = tags.feature_types.MultiLineString;
    elem.geo_json_element = true;
    elem.geo_json_type = geometry.type;
    elem.geo_json_id = id;
    elem.geo_json_land_or_water = landOrWater;
    elem.geo_json_line_body = j;
    elem.geo_json_line_vertex = k;
    elem[tags.targetDim] = true;
    elem[tags.targetDim + "X"] = coordinate[0];
    elem[tags.targetDim + "Y"] = coordinate[1];
    const elemBot = create(elem);
    if (Array.isArray(elemBot)) {
      vertices.push(...elemBot);
    } else {
      vertices.push(elemBot);
    }
  }

  accumulatedLines.push(vertices);
}

for (let i = 0; i < accumulatedLines.length; i++) {
  const vertices = accumulatedLines[i];
  if (vertices) {
    for (let j = 0; j < vertices.length; j++) {
      const vertex = vertices[j];
      const targetVert = vertices[(j + 1) % vertices.length];
      if (vertex && targetVert) {
        vertex.tags.lineTo = targetVert.tags.id;
      }
    }
  }
}
