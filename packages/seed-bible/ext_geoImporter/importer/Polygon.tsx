const feature = that;
const geometry = feature.geometry;
const landOrWater = feature.properties.land_or_water;
const coordinate_bodies = geometry.coordinates;
const id = feature.properties.id;

const accumulatedBodies = [];
for(let j = 0; j < coordinate_bodies.length; j++) {
    const coordinates = coordinate_bodies[j];

    const vertices = [];
    for(let k = 0; k < coordinates.length; k++) {
        const coordinate = coordinates[k];
        const elem = tags.feature_types.Polygon;
        elem.geo_json_element = true;
        elem.geo_json_type = geometry.type;
        elem.geo_json_id = id;
        elem.geo_json_land_or_water = landOrWater;
        elem.geo_json_polygon = j;
        elem.geo_json_vertex = k;
        elem[tags.targetDim] = true;
        elem[tags.targetDim + "X"] = coordinate[0];
        elem[tags.targetDim + "Y"] = coordinate[1];
        const elemBot = create(elem);
        console.log(elemBot);
        vertices.push(elemBot);
    }
    accumulatedBodies.push(vertices);
}

for(let i = 0; i < accumulatedBodies.length; i++) {
    const vertices = accumulatedBodies[i];
    for(let j = 0; j < vertices.length; j++) {
        const vertex = vertices[j]
        const targetVert = vertices[(j + 1) % vertices.length];
        vertex.tags.lineTo = targetVert.tags.id;
        if(vertex && masks.initGame){
            setTagMask(vertex, "labelOpacity", 0, "tempLocal");
            setTagMask(vertex, "lineTo", [], "tempLocal");
        }
    }
}