// type GeoJsonPoint = [number, number];

// interface GeoJsonFeatureLike {
//   geometry: {
//     type: string;
//     coordinates?: unknown;
//   };
//   properties: {
//     id: string;
//     land_or_water?: string;
//   };
// }

// type GeometryHandler = (feature: GeoJsonFeatureLike) => void;

// function createFeatureVertex(base: BotTags, coordinate: GeoJsonPoint) {
//   const elem = {
//     ...base,
//     [tags.targetDim]: true,
//     [tags.targetDim + "X"]: coordinate[0],
//     [tags.targetDim + "Y"]: coordinate[1],
//   };

//   return create(elem);
// }

// function addCreatedBots(target: Bot[], created: Bot | Bot[]) {
//   if (Array.isArray(created)) {
//     target.push(...created);
//   } else {
//     target.push(created);
//   }
// }

// function connectVerticesInSequence(vertices: Bot[]) {
//   for (let i = 0; i < vertices.length - 1; i++) {
//     const vertex = vertices[i];
//     const targetVertex = vertices[i + 1];
//     if (vertex && targetVertex) {
//       vertex.tags.lineTo = targetVertex.tags.id;
//     }
//   }
// }

// function connectVerticesAsRing(vertices: Bot[]) {
//   for (let i = 0; i < vertices.length; i++) {
//     const vertex = vertices[i];
//     const targetVertex = vertices[(i + 1) % vertices.length];
//     if (vertex && targetVertex) {
//       vertex.tags.lineTo = targetVertex.tags.id;
//     }
//   }
// }

// const point: GeometryHandler = (feature) => {
//   const coordinates = feature.geometry.coordinates as GeoJsonPoint;
//   const elem = {
//     ...tags.feature_types.Point,
//     geo_json_element: true,
//     geo_json_type: feature.geometry.type,
//     geo_json_id: feature.properties.id,
//   };

//   createFeatureVertex(elem, coordinates);
// };

// const lineString: GeometryHandler = (feature) => {
//   const coordinates = feature.geometry.coordinates as GeoJsonPoint[];
//   const vertices: Bot[] = [];

//   for (let i = 0; i < coordinates.length; i++) {
//     const coordinate = coordinates[i]!;
//     const elem = {
//       ...tags.feature_types.LineString,
//       geo_json_element: true,
//       geo_json_type: feature.geometry.type,
//       geo_json_id: feature.properties.id,
//       geo_json_land_or_water: feature.properties.land_or_water,
//       geo_json_line_vertex: i,
//     };

//     addCreatedBots(vertices, createFeatureVertex(elem, coordinate));
//   }

//   connectVerticesInSequence(vertices);
// };

// const polygon: GeometryHandler = (feature) => {
//   const coordinateBodies = feature.geometry.coordinates as GeoJsonPoint[][];

//   for (let bodyIndex = 0; bodyIndex < coordinateBodies.length; bodyIndex++) {
//     const coordinates = coordinateBodies[bodyIndex]!;
//     const vertices: Bot[] = [];

//     for (let vertexIndex = 0; vertexIndex < coordinates.length; vertexIndex++) {
//       const coordinate = coordinates[vertexIndex]!;
//       const elem = {
//         ...tags.feature_types.Polygon,
//         geo_json_element: true,
//         geo_json_type: feature.geometry.type,
//         geo_json_id: feature.properties.id,
//         geo_json_land_or_water: feature.properties.land_or_water,
//         geo_json_polygon: bodyIndex,
//         geo_json_vertex: vertexIndex,
//       };

//       addCreatedBots(vertices, createFeatureVertex(elem, coordinate));
//     }

//     connectVerticesAsRing(vertices);
//   }
// };

// const multiLineString: GeometryHandler = (feature) => {
//   const coordinateBodies = feature.geometry.coordinates as GeoJsonPoint[][];

//   for (let bodyIndex = 0; bodyIndex < coordinateBodies.length; bodyIndex++) {
//     const coordinates = coordinateBodies[bodyIndex]!;
//     const vertices: Bot[] = [];

//     for (let vertexIndex = 0; vertexIndex < coordinates.length; vertexIndex++) {
//       const coordinate = coordinates[vertexIndex]!;
//       const elem = {
//         ...tags.feature_types.MultiLineString,
//         geo_json_element: true,
//         geo_json_type: feature.geometry.type,
//         geo_json_id: feature.properties.id,
//         geo_json_land_or_water: feature.properties.land_or_water,
//         geo_json_line_body: bodyIndex,
//         geo_json_line_vertex: vertexIndex,
//       };

//       addCreatedBots(vertices, createFeatureVertex(elem, coordinate));
//     }

//     connectVerticesAsRing(vertices);
//   }
// };

// const geometryCollection: GeometryHandler = () => {
//   os.log(
//     "geoJSON - feature support for geometry collection is nor included yet..."
//   );
// };

// export const GEOJSON_GEOMETRY_HANDLERS: Record<string, GeometryHandler> = {
//   Point: point,
//   LineString: lineString,
//   Polygon: polygon,
//   MultiLineString: multiLineString,
//   GeometryCollection: geometryCollection,
// };
