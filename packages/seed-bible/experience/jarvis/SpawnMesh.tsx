let {meshUrl, dimension, position = new Vector3(0,0,0), fileInfo} = that;
if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
}
const mesh = create({
    space: "tempLocal",
    form: "mesh",
    formSubtype: "gltf",
    formAddress: meshUrl,
    [dimension]: true,
    [dimension + "X"]: position.x,
    [dimension + "Y"]: position.y,
    [dimension + "Z"]: position.z,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    fileInfo
})

return mesh;