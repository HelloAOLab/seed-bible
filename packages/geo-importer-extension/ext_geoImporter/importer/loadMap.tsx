import { opentypeJs } from "https://esm.helloao.org/painter-vendor-IGDNTFOW.js";
// import type { GeoJSON, Feature } from "geojson";
import { z } from "zod";
import { GEOJSON_GEOMETRY_HANDLERS } from "ext_geoImporter.importer.geometryHandlers";

export const GEO_JSON_PROPERTIES = z.looseObject({
  id: z.string(),
});

export const GEO_JSON_FEATURE_SCHEMA = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.coerce.number()).optional(),
  }),
  bbox: z.array(z.coerce.number()).length(4).optional(),
  properties: GEO_JSON_PROPERTIES,
});

export const GEO_JSON_FEATURE_COLLECTION_SCHEMA = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(GEO_JSON_FEATURE_SCHEMA),
  bbox: z.array(z.coerce.number()).length(4).optional(),
  properties: GEO_JSON_PROPERTIES.nullable().optional(),
  metadata: z
    .looseObject({
      name: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const GEO_JSON_SCHEMA = z.discriminatedUnion("type", [
  GEO_JSON_FEATURE_SCHEMA,
  GEO_JSON_FEATURE_COLLECTION_SCHEMA,
]);

type GeoJsonFeatureCollection = z.infer<
  typeof GEO_JSON_FEATURE_COLLECTION_SCHEMA
>;
type GeoJsonFeature = z.infer<typeof GEO_JSON_FEATURE_SCHEMA>;

export const focusOnWithCatch = async (props: {
  bot: Bot;
  position?: { x: number; y: number; z?: number };
  options?: FocusOnOptions;
}) => {
  const { bot, position, options } = props;
  if (bot) {
    try {
      await os.focusOn(bot, {
        ...options,
      });
    } catch {
      os.log("Focus inturrupted by user");
    }
  } else {
    try {
      await os.focusOn(position || { x: 0, y: 0, z: 0 }, {
        ...options,
      });
    } catch {
      os.log("Focus inturrupted by user");
    }
  }
};

export async function loadMap(geojson: unknown) {
  const geoObj = GEO_JSON_SCHEMA.parse(geojson);

  miniMapPortalBot.tags.mapPortalBasemap = thisBot.tags.GlobalBaseMap;
  miniMapPortalBot.tags.mapPortalKind = "plane";
  miniMapPortalBot.tags.mapPortalGridKind = "plane";

  mapPortalBot.tags.mapPortalBasemap = thisBot.tags.GlobalBaseMap;
  mapPortalBot.tags.mapPortalKind = "plane";
  mapPortalBot.tags.mapPortalGridKind = "plane";
  if (!configBot.tags.miniMapPortal) {
    await animateTag(miniMapPortalBot, {
      fromValue: {
        miniPortalWidth: 0.1,
        miniPortalHeight: 0.2,
      },
      toValue: {
        miniPortalWidth: 1,
        miniPortalHeight: 1,
      },
      duration: 1,
    });
    await os.sleep(500);
    configBot.tags.miniMapPortal = tags.targetDim;
    miniMapPortalBot.tags.miniPortalWidth = 1;
    miniMapPortalBot.tags.miniPortalHeight = 1;
    miniMapPortalBot.tags.miniPortalResizable = false;

    configBot.tags.mapPortal = tags.targetDim;
  }

  os.log("geoObj: ", geoObj);

  if (geoObj.type == "FeatureCollection") {
    parseFeatureCollection(geoObj);
  } else if (geoObj.type == "Feature") {
    parseFeature(geoObj, 0, true);
  } else {
    return;
  }
}

async function parseFeatureCollection(geoObj: GeoJsonFeatureCollection) {
  // Parse features
  if (geoObj.features != null) {
    const features = geoObj.features;
    if (features.length > 0) {
      let i = 0;
      for (const feature of features) {
        parseFeature(feature, i++);
      }
    } else {
      os.log("geoJSONImporter - No features found within geoJSON");
    }
  } else {
    os.log("geoJSONImporter - No features found within geoJSON");
  }

  // Parsing Labels
  if (geoObj.metadata != null) {
    const meta = geoObj.metadata;
    const label = meta.name;

    if (geoObj.bbox != null && label) {
      const currElements = getBots(byTag("uid", label));
      if (currElements.length > 0) {
        destroy(currElements);
      }
      const bbox = geoObj.bbox;
      os.log("bbox: ", bbox);
      const dx = angularDifference(bbox[0]!, bbox[2]!);
      const dy = angularDifference(bbox[1]!, bbox[3]!);
      const dh = Math.sqrt(dx * dx + dy * dy);
      const xPos = bbox[2]! + dx * 0.5;
      const yPos = bbox[3]! + dy * 0.5;

      const zoomValue2 = mapRange(dh, 0.0, 1.0, 0.0, 500000);
      const elem = await createLabelElement({
        label: label,
        labelSize: dh * 5000.0,
        xPos: xPos + 0.000002 * dh * 500.0,
        yPos: yPos,
        zPos: 20,
        zoom: 0,
      });
      setTagMask(thisBot, "focusing", true, "tempLocal");
      if (!Array.isArray(elem)) {
        forceFocus({ focusBot: elem, zoom: zoomValue2 });
      }
    }
  }
}

async function parseFeature(feature: GeoJsonFeature, i = 0, showName = false) {
  const type = feature.type;
  if (type != null) {
    if (type == "Feature") {
      if (feature.geometry != null && feature.geometry.coordinates) {
        const geometryHandler =
          GEOJSON_GEOMETRY_HANDLERS[feature.geometry.type];
        if (geometryHandler) {
          geometryHandler(feature);
          if (showName) {
            const currElements = getBots(byTag("uid", feature.properties.id));
            if (currElements.length > 0) {
              destroy(currElements);
            }
            const elem = await createLabelElement({
              label: feature.properties.id,
              labelSize: 700,
              xPos: feature.geometry.coordinates[1]! + 0.000002 * 50,
              yPos: feature.geometry.coordinates[0]!,
              zPos: 10,
              zoom: 50000,
            });
            setTagMask(thisBot, "focusing", true, "tempLocal");
            if (!Array.isArray(elem)) {
              forceFocus({ focusBot: elem, zoom: 70000 });
            }
          }
        } else {
          os.log(
            "geoJSONImporter - feature_" +
              i +
              " did not include a valid geometry type"
          );
        }
      } else {
        os.log(
          "geoJSONImporter - feature_" +
            i +
            " did not contain a geometry or geometries key key"
        );
      }
    } else {
      os.log(
        "geoJSONImporter - feature_" + i + " did not contain a valid type"
      );
    }
  } else {
    os.log("geoJSONImporter - No type found in feature_" + i);
  }
}

function angularDifference(targetA: number, sourceA: number) {
  targetA %= 360;
  sourceA %= 360;
  return ((targetA - sourceA + 180) % 360) - 180;
}

function mapRange(
  value: number,
  low1: number,
  high1: number,
  low2: number,
  high2: number
) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

async function forceFocus(props: {
  focusBot: Bot;
  zoom: number;
  trying?: boolean;
}) {
  const { focusBot, zoom, trying = false } = props;
  if (thisBot.masks.focusing && !trying) {
    const checkInterval = setInterval(() => {
      if (thisBot.masks.focusing) {
        forceFocus({ focusBot, zoom, trying: true });
      } else {
        clearInterval(checkInterval);
      }
    }, 1500);
  }

  await focusOnWithCatch({
    bot: focusBot,
    options: {
      zoom: zoom,
      duration: 1,
    },
  });
  setTagMask(thisBot, "focusing", false, "tempLocal");
}

function generateSVGURLFromText(label: string, fontSize = 400) {
  return new Promise((resolve, reject) => {
    opentypeJs.load(
      tags.font,
      function (err: unknown, font: opentypeJs.Font | undefined) {
        if (err) {
          reject(err);
          return;
        }
        if (!font) {
          reject(new Error("Font failed to load"));
          return;
        }
        const path = font.getPath(label, 0, 2000, fontSize); // (text, x, y, fontSize)
        const svgPath = path.toPathData(2);
        const bbox = path.getBoundingBox();

        const svgWidth = 5000;
        const svgHeight = 2500;
        const dx = (svgWidth - (bbox.x2 - bbox.x1)) / 2 - bbox.x1;
        const dy = (svgHeight - (bbox.y2 - bbox.y1)) / 2 - bbox.y1;

        const newSvg = `
            <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" shape-rendering="geometricPrecision" fill="red" xmlns="http://www.w3.org/2000/svg">
                <path transform="translate(${dx}, ${dy})" fill-rule="evenodd" clip-rule="evenodd" d="${svgPath}" fill="white" stroke="black" stroke-width="15" stroke-linejoin="round"/>
            </svg>`;
        const blob = new Blob([newSvg], { type: "image/svg+xml" });
        blob.arrayBuffer().then((arrayBuffer) => {
          const url = bytes.toBase64Url(
            new Uint8Array(arrayBuffer),
            "image/svg+xml"
          );
          resolve(url);
        });
      }
    );
  });
}

async function createLabelElement(props: {
  label: string;
  labelSize: number;
  xPos: number;
  yPos: number;
  zPos: number;
  labelFontAddress?: string;
  zoom: number;
}) {
  const { label, labelSize, xPos, yPos, zPos, labelFontAddress, zoom } = props;
  const url = await generateSVGURLFromText(label);
  const elem = create({
    form: "sprite",
    pointable: false,
    orientationMode: "billboard",
    geo_json_element: true,
    geo_json_label: true,
    [tags.targetDim]: true,
    [tags.targetDim + "X"]: parseFloat(String(xPos)),
    [tags.targetDim + "Y"]: parseFloat(String(yPos)),
    [tags.targetDim + "Z"]: zPos,
    space: "tempLocal",
    scaleZ: 1.1,
    labelFontAddress: labelFontAddress,
    zoom,
    formAddress: url,
    scale: labelSize,
    uid: label,
  });
  if (elem && masks.initGame) {
    setTagMask(elem, "labelOpacity", 0, "tempLocal");
    setTagMask(elem, "lineTo", [], "tempLocal");
  }
  return elem;
}
