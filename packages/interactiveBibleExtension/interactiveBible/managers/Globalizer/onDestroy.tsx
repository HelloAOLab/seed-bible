thisBot.vars.globalsDefined.forEach((globalDefined) => {
    globalThis[globalDefined] = null;
})