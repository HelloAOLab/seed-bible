let dim = os.getCurrentDimension();
let interval = setInterval(() => {
  let mousePosition = os.getPointerPosition("mouse");
  animateTag(thisBot, {
    fromValue: {
      [dim + "X"]: thisBot.tags[dim + "X"],
      [dim + "Y"]: thisBot.tags[dim + "Y"],
    },
    toValue: {
      [dim + "X"]: mousePosition.x,
      [dim + "Y"]: mousePosition.y + 160,
    },
    duration: 0.1,
  });
}, 100);
let interval2 = setInterval(() => {
  tags.color =
    "#" + (Math.random() * 0xfffff * 1000000).toString(16).slice(0, 6);
}, 300);
masks.interval = interval;
masks.interval2 = interval2;
