const {dimension} = that;
const scales = {x: 0.5, y: 0.5, z: 0.5};

const character = create({
    space: "tempLocal",
    [dimension]: true,
    [dimension + "X"]: 0,
    [dimension + "Y"]: 0,
    [dimension + "0"]: 0,
    scale: 1,
    scaleX: scales.x,
    scaleY: scales.y,
    scaleZ: scales.z,
    color: "pink"
})
// const hatCrown = 
create({
    space: "tempLocal",
    [dimension]: true,
    [dimension + "X"]: 0,
    [dimension + "Y"]: 0,
    [dimension + "0"]: -0.2,
    scale: 1,
    scaleX: 1.05,
    scaleY: 1.05,
    scaleZ: 0.3,
    color: "#ADD8E6",
    transformer: character.id
})
// const hatVisor = 
create({
    space: "tempLocal",
    [dimension]: true,
    [dimension + "X"]: 0,
    [dimension + "Y"]: 0.75,
    [dimension + "0"]: -0.1,
    scale: 1,
    scaleX: 1.05,
    scaleY: 0.5,
    scaleZ: 0.1,
    color: "#93c0cf",
    transformer: character.id
})
thisBot.vars.character = character

return character