const feature = that;
const geometry = feature.geometry;
const landOrWater = feature.properties.land_or_water;
const coordinates = geometry.coordinates;
const id = feature.properties.id;
const accumulatedLines = [];

for(let j = 0; j < coordinates.length; j++) {
    const coordinate = coordinates[j];
    const elem = tags.feature_types.LineString;
    elem.geo_json_element = true
    elem.geo_json_type = geometry.type;
    elem.geo_json_id = id;
    elem.geo_json_land_or_water = landOrWater;
    elem.geo_json_line_vertex = j;
    elem[tags.targetDim] = true;
    elem[tags.targetDim + "X"] = coordinate[0];
    elem[tags.targetDim + "Y"] = coordinate[1];
    const elemBot = create(elem);
    // console.log(elemBot);
    accumulatedLines.push(elemBot);
}

for(let i = 0; i < accumulatedLines.length; i++) {
    if(i + 1 != accumulatedLines.length) {
        const vertex = accumulatedLines[i];
        const targetVert = accumulatedLines[i + 1];
        if(vertex.tags.geo_json_id == targetVert.tags.geo_json_id) {
            vertex.tags.lineTo = targetVert.tags.id;
            if(vertex && masks.initGame){
                setTagMask(vertex, "labelOpacity", 0, "tempLocal");
                setTagMask(vertex, "lineTo", [], "tempLocal");
            }
        }
    } else {
        break
    }
}