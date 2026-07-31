let dim = os.getCurrentDimension();
switch (that.direction) {
  case "top": {
    let dialogBox = create({
      [dim]: true,
      [dim + "X"]: that.bot.masks[dim + "X"],
      [dim + "Y"]: that.bot.masks[dim + "Y"] + 1,
      [dim + "Z"]: that.bot.masks[dim + "Z"],
      label: that.message,
      color: "clear",
      scaleX:
        getBot("system", "main.bookManager").calcWord({ label: that.message }) *
        0.7,
      scaleY: 0.7,
      labelSize: 0.7,
      dialogBox: true,
      formDepthTest: false,
      scaleZ: 0.1,
      space: "tempLocal",
    });
    setTimeout(() => {
      destroy(dialogBox);
    }, 1500);
    break;
  }
  case "bottom": {
    let dialogBox = create({
      [dim]: true,
      [dim + "X"]: that.bot.masks[dim + "X"],
      [dim + "Y"]: that.bot.masks[dim + "Y"] - 1,
      [dim + "Z"]: that.bot.masks[dim + "Z"],
      label: that.message,
      color: "clear",
      scaleX:
        getBot("system", "main.bookManager").calcWord({ label: that.message }) *
        0.7,
      scaleY: 0.7,
      labelSize: 0.7,
      dialogBox: true,
      formDepthTest: false,
      scaleZ: 0.1,
      space: "tempLocal",
    });
    setTimeout(() => {
      destroy(dialogBox);
    }, 1500);
    break;
  }
  case "left": {
    let dialogBox = create({
      [dim]: true,
      [dim + "X"]:
        that.bot.masks[dim + "X"] -
        that.bot.tags.scaleX / 2 -
        (getBot("system", "main.bookManager").calcWord({
          label: that.message,
        }) *
          0.7) /
          2,
      [dim + "Y"]: that.bot.masks[dim + "Y"],
      [dim + "Z"]: that.bot.masks[dim + "Z"],
      label: that.message,
      color: "clear",
      scaleX:
        getBot("system", "main.bookManager").calcWord({ label: that.message }) *
        0.7,
      scaleY: 0.7,
      labelSize: 0.7,
      dialogBox: true,
      formDepthTest: false,
      scaleZ: 0.1,
      space: "tempLocal",
    });
    setTimeout(() => {
      destroy(dialogBox);
    }, 1500);
    break;
  }
  case "right": {
    let dialogBox = create({
      [dim]: true,
      [dim + "X"]:
        that.bot.masks[dim + "X"] +
        that.bot.tags.scaleX / 2 +
        (getBot("system", "main.bookManager").calcWord({
          label: that.message,
        }) *
          0.7) /
          2,
      [dim + "Y"]: that.bot.masks[dim + "Y"],
      [dim + "Z"]: that.bot.masks[dim + "Z"],
      label: that.message,
      color: "clear",
      scaleX:
        getBot("system", "main.bookManager").calcWord({ label: that.message }) *
        0.7,
      scaleY: 0.7,
      labelSize: 0.7,
      dialogBox: true,
      formDepthTest: false,
      scaleZ: 0.1,
      space: "tempLocal",
    });
    setTimeout(() => {
      destroy(dialogBox);
    }, 1500);
    break;
  }
}
