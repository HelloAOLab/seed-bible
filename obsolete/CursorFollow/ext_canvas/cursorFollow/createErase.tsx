destroy(getBot("system", "tools.Erase"));
let dim = os.getCurrentDimension();
let Bot = create(getBot("system", "ext_canvas.eraseTool", true), {
  [dim]: true,
  [dim + "X"]: that.position.x,
  [dim + "Y"]: that.position.y,
  home_1Position: null,
  home_1Rotation: null,
  home_1RotationX: null,
  home_1RotationY: null,
  home_1RotationZ: null,
  size: 5,
  scaleX: 5,
  scaleY: 5,
  space: "tempLocal",
  system: "tools.Erase",
});

os.replaceDragBot(Bot);
