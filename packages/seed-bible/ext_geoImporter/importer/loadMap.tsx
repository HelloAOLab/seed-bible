const file = that.file;
// return
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const earthAnimation = async ({ x, y }) => {
    if (!configBot.tags.miniMapPortal) {
        setGameRunning(true)
    } else {
        if (initialized === 0) {
            setCustomMessageModal({
                messages: [
                    `The place you need to find is somewhere on the <b>map<b>!`,
                    "<b>Tap anywhere<b> to make your first guess!",
                    `${placeData.phrase}`,
                    `- ${placeData.ref}`
                ],
                buttonName: "Start",
                buttonAction: () => { setGameRunning(true); setInitialized(initialized + 1); setCustomMessageModal(null); }
            })
        } else {
            setInitialized(initialized + 1);
        }
    }
    const outZoom = 50000000;
    const cooridnates = [
        [x - getRandomNumber(1, 2), y - getRandomNumber(1, 2), outZoom * 0.07]
    ];
    for (let i = 0; i < cooridnates.length; i++) {
        const coordinateElement = create({
            space: "tempLocal",
            [tags.targetDim]: true,
            [tags.targetDim + "X"]: cooridnates[i][0],
            [tags.targetDim + "Y"]: cooridnates[i][1]
        });
        console.log("focusing on map 2")

        await focusOnWithCatch({
            bot: coordinateElement,
            options: {
                zoom: cooridnates[i][2],
                duration: 2,
                rotation: {
                    x: Math.Pi * 0,
                    y: Math.Pi * 0,
                    z: Math.Pi * 1
                }
            }
        })
    }
}

let geoObj
try {
    if (typeof file === 'object') {
        geoObj = file;
    } else {
        geoObj = JSON.parse(file);
    }
} catch (e) {
    os.log("geoJSONImporter - Object is not JSON serializable. Details: \n", e)
    const enc = new TextDecoder("utf-8");
    const parsedString = enc.decode(file);
    geoObj = JSON.parse(parsedString);
}

miniMapPortalBot.tags.mapPortalBasemap = GlobalBaseMap;

if (!configBot.tags.miniMapPortal) {
    await animateTag(miniMapPortalBot, {
        fromValue: {
            miniPortalWidth: 0.1,
            miniPortalHeight: 0.2
        },
        toValue: {
            miniPortalWidth: 1,
            miniPortalHeight: 1
        },
        duration: 1
    });
    await os.sleep(500);
    configBot.tags.miniMapPortal = tags.targetDim;
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

const geo_json_elements = {
    polygon: [],
    line_string: [],
    multi_line_string: [],
    point: []
}

if (geoObj.type == "FeatureCollection") {
    parseFeatureCollection(geoObj)
} else if (geoObj.type == "Feature") {
    parseFeature(geoObj, 0, true)
} else {
    return
}

let zoomValue = 1.0;

async function parseFeatureCollection(geoObj) {
    // Parse features
    if (geoObj.features != null) {
        const features = geoObj.features
        if (features.length > 0) {
            for (let i = 0; i < features.length; i++) {
                const feature = features[i];
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
        const meta = geoObj.metadata
        const label = meta.name

        if (geoObj.bbox != null) {
            const currElements = getBots(byTag("label", label))
            if (currElements.length > 0) {
                destroy(currElements);
            }
            const bbox = geoObj.bbox;
            os.log("bbox: ", bbox);
            const dx = angularDifference(bbox[0], bbox[2]);
            const dy = angularDifference(bbox[1], bbox[3]);
            const dh = Math.sqrt((dx * dx) + (dy * dy));
            const xPos = bbox[2] + (dx * .5);
            const yPos = bbox[3] + (dy * .5);

            zoomValue = mapRange(dh, 0.0, 1.0, 0.0, 500000.0)

            const elem = createLabelElement({
                label: label,
                labelSize: dh * 500.0,
                xPos: parseFloat(xPos) + (0.000002 * dh * 500.0),
                yPos: parseFloat(yPos),
                zPos: 5,
                scaleZ: 0.1,
                labelColor: "white",
                zoom: zoomValue
            })

            createLabelElement({
                label: label,
                labelSize: dh * 500.0,
                xPos: parseFloat(xPos) - (0.000002 * dh * 500.0),
                yPos: parseFloat(yPos),
                zPos: 5,
                scaleZ: 0.1,
                labelColor: "white",
                zoom: zoomValue
            })

            createLabelElement({
                label: label,
                labelSize: dh * 500.0,
                xPos: parseFloat(xPos),
                yPos: parseFloat(yPos) + (0.000002 * dh * 500.0),
                zPos: 5,
                scaleZ: 0.1,
                labelColor: "white",
                zoom: zoomValue
            })

            createLabelElement({
                label: label,
                labelSize: dh * 500.0,
                xPos: parseFloat(xPos),
                yPos: parseFloat(yPos) - (0.000002 * dh * 500.0),
                zPos: 5,
                scaleZ: 0.1,
                labelColor: "white",
                zoom: zoomValue
            })

            const backgroundElem = createLabelElement({
                label: label,
                labelSize: dh * 500.0,
                xPos: parseFloat(xPos),
                yPos: parseFloat(yPos),
                zPos: 5,
                scaleZ: 1,
                labelColor: "black",
                zoom: zoomValue
            })

            if (that?.loadGame) {
                setPositionData({
                    x: xPos,
                    y: yPos,
                    placeIds: [elem.tags.id],
                    zoomValue: zoomValue
                });
                await earthAnimation({ x: xPos, y: yPos })
            } else {
                setTagMask(thisBot, "focusing", true, "tempLocal");
                forceFocus({ focusBot: elem, zoom: zoomValue })
            }
        }
    }
}

async function parseFeature(feature, i = 0, showName = false) {
    const type = feature.type;
    if (type != null) {
        if (type == "Feature") {
            if (feature.geometry != null) {
                if (thisBot.tags[feature.geometry.type] != null) {
                    eval("thisBot." + feature.geometry.type + "(" + JSON.stringify(feature) + ")")
                    if (showName) {
                        const currElements = getBots(byTag("label", feature.properties.id))
                        if (currElements.length > 0) {
                            destroy(currElements);
                        }
                        const elem = createLabelElement({
                            label: feature.properties.id,
                            labelSize: 50,
                            xPos: parseFloat(feature.geometry.coordinates[1]) + 0.000002 * 50,
                            yPos: parseFloat(feature.geometry.coordinates[0]),
                            zPos: 5,
                            scaleZ: 50,
                            labelColor: "white",
                            zoom: 50000
                        })
                        createLabelElement({
                            label: feature.properties.id,
                            labelSize: 50,
                            xPos: parseFloat(feature.geometry.coordinates[1]) - 0.000002 * 50,
                            yPos: parseFloat(feature.geometry.coordinates[0]),
                            zPos: 5,
                            scaleZ: 50,
                            labelColor: "white",
                            zoom: 50000
                        })
                        createLabelElement({
                            label: feature.properties.id,
                            labelSize: 50,
                            xPos: parseFloat(feature.geometry.coordinates[1]),
                            yPos: parseFloat(feature.geometry.coordinates[0]) + 0.000002 * 50,
                            zPos: 5,
                            scaleZ: 50,
                            labelColor: "white",
                            zoom: 50000
                        })
                        createLabelElement({
                            label: feature.properties.id,
                            labelSize: 50,
                            xPos: parseFloat(feature.geometry.coordinates[1]),
                            yPos: parseFloat(feature.geometry.coordinates[0]) - 0.000002 * 50,
                            zPos: 5,
                            scaleZ: 50,
                            labelColor: "white",
                            zoom: 50000
                        })
                        const backgroundElem = createLabelElement({
                            label: feature.properties.id,
                            labelSize: 50,
                            xPos: parseFloat(feature.geometry.coordinates[1]),
                            yPos: parseFloat(feature.geometry.coordinates[0]),
                            zPos: 5,
                            scaleZ: 53,
                            labelColor: "black",
                            zoom: 50000
                        })
                        if (that?.loadGame) {
                            setPositionData({
                                x: feature.geometry.coordinates[1],
                                y: feature.geometry.coordinates[0],
                                placeIds: [elem.tags.id],
                                zoomValue: 50000
                            });
                            await earthAnimation({ x: feature.geometry.coordinates[1], y: feature.geometry.coordinates[0] })
                        } else {
                            setTagMask(thisBot, "focusing", true, "tempLocal");
                            forceFocus({ focusBot: elem, zoom: 50000 });
                        }
                    }
                } else {
                    os.log("geoJSONImporter - feature_" + i + " did not include a valid geometry type");
                }
            } else {
                os.log("geoJSONImporter - feature_" + i + " did not contain a geometry or geometries key key");
            }
        } else {
            os.log("geoJSONImporter - feature_" + i + " did not contain a valid type");
        }
    } else {
        os.log("geoJSONImporter - No type found in feature_" + i)
    }
}

function angularDifference(targetA, sourceA) {
    targetA %= 360;
    sourceA %= 360;
    return ((targetA - sourceA) + 180) % 360 - 180;
}

function combineAngles(targetA, sourceA) {
    targetA %= 360;
    sourceA %= 360;
    return ((targetA + sourceA) - 180) % 360 - 180;
}

function mapRange(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

function mapRangeAngle(value, low1, high1, low2, high2) {
    return combineAngles(low2, (angularDifference(high2, low2)) * (angularDifference(value, low1)) / (angularDifference(high1, low1)));
}

function mapRangeAngleToValue(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * angularDifference(value, low1) / angularDifference(high1, low1);
}

async function forceFocus({ focusBot, zoom, trying = false }) {
    if (thisBot.masks.focusing && !trying) {
        const checkInterval = setInterval(() => {
            if (thisBot.masks.focusing) {
                forceFocus({ focusBot, zoom, trying: true });
            } else {
                clearInterval(checkInterval);
            }
        }, 1500);
    }
    // await os.focusOn(focusBot, {
    //     zoom: zoom,
    //     duration: 1
    // })
    console.log("focusing on map 1", typeof globalThis?.focusOnWithCatch)
    await globalThis?.focusOnWithCatch({
        bot: focusBot,
        options: {
            zoom: zoom,
            duration: 1
        }
    })
    setTagMask(thisBot, "focusing", false, "tempLocal");
    // if (setModalOpacity) {
    //     await os.sleep(5000)
    //     setModalOpacity(1);
    // }
}

function createLabelElement({ label, labelSize, xPos, yPos, zPos, labelColor, scaleZ, labelFontAddress, zoom }) {
    const elem = create({
        form: "nothing",
        label,
        labelSize,
        labelColor,
        labelWordWrapMode: "none",
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
        scaleZ,
        labelFontAddress,
        zoom
    })
    if (elem && masks.initGame) {
        setTagMask(elem, "labelOpacity", 0, "tempLocal");
        setTagMask(elem, "lineTo", [], "tempLocal");
    }
    return elem;
}