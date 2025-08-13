const {name} = that;
return InstanceManager.vars.fixedArrangementsInfo.indexOf(InstanceManager.vars.fixedArrangementsInfo.find((arrangementInfo) => {return arrangementInfo.name === name}));