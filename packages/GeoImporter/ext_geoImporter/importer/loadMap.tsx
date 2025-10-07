var file = that.file;
// return
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const earthAnimation = async ({ x, y }) => {
  if (!configBot.tags.miniMapPortal) {
    setGameRunning(true);
  } else {
    if (initialized === 0) {
      setCustomMessageModal({
        messages: [
          `The place you need to find is somewhere on the <b>map<b>!`,
          "<b>Tap anywhere<b> to make your first guess!",
          `${placeData.phrase}`,
          `- ${placeData.ref}`,
        ],
        buttonName: "Start",
        buttonAction: () => {
          setGameRunning(true);
          setInitialized(initialized + 1);
          setCustomMessageModal(null);
        },
      });
    } else {
      setInitialized(initialized + 1);
    }
  }
  let outZoom = 50000000;
  let cooridnates = [
    [x - getRandomNumber(1, 2), y - getRandomNumber(1, 2), outZoom * 0.07],
  ];
  for (let i = 0; i < cooridnates.length; i++) {
    let coordinateElement = create({
      space: "tempLocal",
      [tags.targetDim]: true,
      [tags.targetDim + "X"]: cooridnates[i][0],
      [tags.targetDim + "Y"]: cooridnates[i][1],
    });
    console.log("focusing on map 2");

    await focusOnWithCatch({
      bot: coordinateElement,
      options: {
        zoom: cooridnates[i][2],
        duration: 2,
        rotation: {
          x: Math.Pi * 0,
          y: Math.Pi * 0,
          z: Math.Pi * 1,
        },
      },
    });
  }
};

var geoObj;
try {
  if (typeof file === "object") {
    geoObj = file;
  } else {
    geoObj = JSON.parse(file);
  }
} catch (e) {
  os.log("geoJSONImporter - Object is not JSON serializable. Details: \n", e);
  var enc = new TextDecoder("utf-8");
  var parsedString = enc.decode(file);
  geoObj = JSON.parse(parsedString);
}

miniMapPortalBot.tags.mapPortalBasemap = GlobalBaseMap;
miniMapPortalBot.tags.mapPortalKind = "plane";
miniMapPortalBot.tags.mapPortalGridKind = "plane";

mapPortalBot.tags.mapPortalBasemap = GlobalBaseMap;
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
  // if (!that.loadGame) {
  //     whisper(thisBot, "createCloseButton")
  // }
  // setBackBtnStatck([...backBtnStack, {
  //     action: () => {
  //         configBot.tags.miniMapPortal = null;
  //     },
  //     type: "location"
  // }])
}

os.log("geoObj: ", geoObj);

if (!that?.openOverlay) {
  whisper(thisBot, "createCloseButton", { ...that });
}

let geo_json_elements = {
  polygon: [],
  line_string: [],
  multi_line_string: [],
  point: [],
};

if (geoObj.type == "FeatureCollection") {
  parseFeatureCollection(geoObj);
} else if (geoObj.type == "Feature") {
  parseFeature(geoObj, 0, true);
} else {
  return;
}

var zoomValue = 1.0;

async function parseFeatureCollection(geoObj) {
  // Parse features
  if (geoObj.features != null) {
    var features = geoObj.features;
    if (features.length > 0) {
      for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        parseFeature(feature, i);
      }
    } else {
      os.log("geoJSONImporter - No features found within geoJSON");
    }
  } else {
    os.log("geoJSONImporter - No features found within geoJSON");
  }

  // Parsing Labels
  if (geoObj.metadata != null) {
    var meta = geoObj.metadata;
    var label = meta.name;

    if (geoObj.bbox != null) {
      var currElements = getBots(byTag("uid", label));
      if (currElements.length > 0) {
        destroy(currElements);
      }
      var bbox = geoObj.bbox;
      os.log("bbox: ", bbox);
      var dx = angularDifference(bbox[0], bbox[2]);
      var dy = angularDifference(bbox[1], bbox[3]);
      var dh = Math.sqrt(dx * dx + dy * dy);
      var xPos = bbox[2] + dx * 0.5;
      var yPos = bbox[3] + dy * 0.5;

      let zoomValue2 = mapRange(dh, 0.0, 1.0, 0.0, 500000);
      let elem = await createLabelElement({
        label: label,
        labelSize: dh * 5000.0,
        xPos: parseFloat(xPos) + 0.000002 * dh * 500.0,
        yPos: parseFloat(yPos),
        zPos: 20,
        scaleZ: 0.1,
        labelColor: "white",
        zoom: 0,
      });
      if (that?.loadGame) {
        setPositionData({
          x: xPos,
          y: yPos,
          placeIds: [elem.tags.id],
          zoomValue2: zoomValue2,
        });
        await earthAnimation({ x: xPos, y: yPos });
      } else {
        setTagMask(thisBot, "focusing", true, "tempLocal");
        forceFocus({ focusBot: elem, zoom: zoomValue2 });
      }
    }
  }
}

async function parseFeature(feature, i = 0, showName = false) {
  var type = feature.type;
  if (type != null) {
    if (type == "Feature") {
      if (feature.geometry != null) {
        if (thisBot.tags[feature.geometry.type] != null) {
          eval(
            "thisBot." +
              feature.geometry.type +
              "(" +
              JSON.stringify(feature) +
              ")"
          );
          if (showName) {
            var currElements = getBots(byTag("uid", feature.properties.id));
            if (currElements.length > 0) {
              destroy(currElements);
            }
            let elem = await createLabelElement({
              label: feature.properties.id,
              labelSize: 700,
              xPos: parseFloat(feature.geometry.coordinates[1]) + 0.000002 * 50,
              yPos: parseFloat(feature.geometry.coordinates[0]),
              zPos: 10,
              scaleZ: 0,
              labelColor: "white",
              zoom: 50000,
            });
            if (that?.loadGame) {
              setPositionData({
                x: feature.geometry.coordinates[1],
                y: feature.geometry.coordinates[0],
                placeIds: [elem.tags.id],
                zoomValue: 50000,
              });
              await earthAnimation({
                x: feature.geometry.coordinates[1],
                y: feature.geometry.coordinates[0],
              });
            } else {
              setTagMask(thisBot, "focusing", true, "tempLocal");
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

function angularDifference(targetA, sourceA) {
  targetA %= 360;
  sourceA %= 360;
  return ((targetA - sourceA + 180) % 360) - 180;
}

function combineAngles(targetA, sourceA) {
  targetA %= 360;
  sourceA %= 360;
  return ((targetA + sourceA - 180) % 360) - 180;
}

function mapRange(value, low1, high1, low2, high2) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

function mapRangeAngle(value, low1, high1, low2, high2) {
  return combineAngles(
    low2,
    (angularDifference(high2, low2) * angularDifference(value, low1)) /
      angularDifference(high1, low1)
  );
}

function mapRangeAngleToValue(value, low1, high1, low2, high2) {
  return (
    low2 +
    ((high2 - low2) * angularDifference(value, low1)) /
      angularDifference(high1, low1)
  );
}

async function forceFocus({ focusBot, zoom, trying = false }) {
  if (thisBot.masks.focusing && !trying) {
    let checkInterval = setInterval(() => {
      if (thisBot.masks.focusing) {
        forceFocus({ focusBot, zoom, trying: true });
      } else {
        clearInterval(checkInterval);
      }
    }, 1500);
  }

  console.log(zoom, "zoom");
  // await os.focusOn(focusBot, {
  //     zoom: zoom,
  //     duration: 1
  // })
  console.log("focusing on map 1", typeof globalThis?.focusOnWithCatch);
  await globalThis?.focusOnWithCatch({
    bot: focusBot,
    options: {
      zoom: zoom,
      duration: 1,
    },
  });
  setTagMask(thisBot, "focusing", false, "tempLocal");
  // if (setModalOpacity) {
  //     await os.sleep(5000)
  //     setModalOpacity(1);
  // }
}

function generateSVGURLFromText(label, fontSize = 400) {
  return new Promise((resolve, reject) => {
    OpentypeJs.load(tags.font, function (err, font) {
      if (err) {
        reject(err);
        return;
      }
      const path = font.getPath(label, 0, 2000, fontSize); // (text, x, y, fontSize)
      const svgPath = path.toPathData();
      const bbox = path.getBoundingBox();

      let svgWidth = 5000;
      let svgHeight = 2500;
      const dx = (svgWidth - (bbox.x2 - bbox.x1)) / 2 - bbox.x1;
      const dy = (svgHeight - (bbox.y2 - bbox.y1)) / 2 - bbox.y1;

      const newSvg = `
            <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" shape-rendering="geometricPrecision" fill="red" xmlns="http://www.w3.org/2000/svg">
                <path transform="translate(${dx}, ${dy})" fill-rule="evenodd" clip-rule="evenodd" d="${svgPath}" fill="white" stroke="black" stroke-width="15" stroke-linejoin="round"/>
            </svg>`;
      const blob = new Blob([newSvg], { type: "image/svg+xml" });
      blob.arrayBuffer().then((arrayBuffer) => {
        let url = bytes.toBase64Url(
          new Uint8Array(arrayBuffer),
          "image/svg+xml"
        );
        resolve(url);
      });
    });
  });
}

async function createLabelElement({
  label,
  labelSize,
  xPos,
  yPos,
  zPos,
  labelFontAddress,
  zoom,
}) {
  let url = await generateSVGURLFromText(label);
  let elem = create({
    form: "sprite",
    pointable: false,
    orientationMode: "billboard",
    geo_json_element: true,
    geo_json_label: true,
    onMaxLODEnter: thisBot.tags.onMaxLODEnter,
    onMaxLODExit: thisBot.tags.onMaxLODExit,
    onMinLODEnter: thisBot.tags.onMinLODEnter,
    onMinLODExit: thisBot.tags.onMinLODExit,
    [tags.targetDim]: true,
    [tags.targetDim + "X"]: parseFloat(xPos),
    [tags.targetDim + "Y"]: parseFloat(yPos),
    [tags.targetDim + "Z"]: zPos,
    space: "tempLocal",
    scaleZ: 1.1,
    labelFontAddress,
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
