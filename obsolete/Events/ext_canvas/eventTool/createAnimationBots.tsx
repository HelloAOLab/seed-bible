thisBot.masks.onGridClick = null;
globalThis?.setCurrentCursor(null);

const dim = os.getCurrentDimension();
const initPos = { x: that.position.x, y: that.position.y };

destroy(getBots("animationName", globalThis.animationBotsData.animationName));

let animationConfigs = JSON.parse(
  globalThis.animationBotsData.animationBotConfigs
);

for (let i = 0; i < animationConfigs.length; i++) {
  let config = {
    ...animationConfigs[i],
  };
  config[dim + "X"] = animationConfigs[i].dimX + initPos.x;
  config[dim + "Y"] = animationConfigs[i].dimY + initPos.y;
  config[dim + "Z"] = animationConfigs[i].dimZ;
  config[dim + "RotationX"] = animationConfigs[i].dimRotationX;
  config[dim + "RotationY"] = animationConfigs[i].dimRotationY;
  config[dim + "RotationZ"] = animationConfigs[i].dimRotationZ;
  config.dimX = null;
  config.dimY = null;
  config.dimZ = null;
  config.dimRotationX = null;
  config.dimRotationY = null;
  config.dimRotationZ = null;
  config.dim = null;
  config.animationFrames = animationConfigs[i].animationFrames;

  let newAniBot = create({
    ...config,
    space: "tempLocal",
    [dim]: true,
    toErase: true,
    animationName: globalThis.animationBotsData.animationName,
    onDestroy: `@
            getBots("animationName", thisBot.tags.animationName).forEach(item => {
                if(item && item.id !== thisBot.id){
                    destroy(item);
                }
            });
        `,
    onClick: `@
            shout("playAnimations", {animationName: thisBot.tags.animationName})
        `,
  });

  for (let k = 0; k < config.animationFrames.length; k++) {
    if (config.animationFrames[k].type === "recording") {
      let frameData = JSON.parse(config.animationFrames[k].frameData);
      for (let j = 0; j < frameData.states.length; j++) {
        frameData.states[j].tags[dim + "X"] =
          frameData.states[j].tags.dimX + initPos.x;
        frameData.states[j].tags[dim + "Y"] =
          frameData.states[j].tags.dimY + initPos.y;
        frameData.states[j].id = newAniBot.tags.id;
        delete frameData.states[j].tags.dimX;
        delete frameData.states[j].tags.dimY;
      }
      config.animationFrames[k].frameData = JSON.stringify(frameData);
    }
    config.animationFrames[k].initPos.x =
      config.animationFrames[k].initPos.x + initPos.x;
    config.animationFrames[k].initPos.y =
      config.animationFrames[k].initPos.y + initPos.y;
  }

  newAniBot.tags.animationFrames = [...config.animationFrames];
}

whisper(thisBot, "playAnimations", {
  animationName: globalThis.animationBotsData.animationName,
});
