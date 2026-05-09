let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("mmTypingManager"));

const getRootParent = (childBot) => {
  let rootParent = null;
  if (childBot.tags.parentBotId) {
    let parentBot = getBot(byTag("id", childBot.tags.parentBotId));
    if (parentBot.tags.parentBotId) {
      rootParent = getRootParent(parentBot);
    } else {
      rootParent = parentBot;
    }
  } else {
    rootParent = childBot;
  }
  return rootParent;
};

const getAllChildIds = (id) => {
  const botById = getBot(byTag("id", id));
  let childrenIds = [];
  if (botById.masks.childIds && botById.masks.childIds.length > 0) {
    childrenIds = [...botById.masks.childIds];
    for (let i = 0; i < botById.masks.childIds.length; i++) {
      childrenIds = [
        ...childrenIds,
        ...getAllChildIds(botById.masks.childIds[i]),
      ];
    }
  } else {
    return [];
  }
  return childrenIds;
};

// creating new text block
let childBot = create({
  [dim]: true,
  [dim + "X"]: that.from.x,
  [dim + "Y"]: that.from.y,
  space: "tempShared",
  scaleX: 5,
  scaleY: 1,
  mmBot: true,
  writing: false,
  timer: 0,
  onClick: typingTool.tags.mmOnClick,
  label: " ",
  childIds: [],
  showPointer: false,
  onPointerDown: typingTool.tags.mmOnPointerEnter,
  onPointerUp: typingTool.tags.mmOnPointerExit,
  showPointer: false,
  expanded: true,
  onDrop: typingTool.tags.mmOnDropEnter,
  subColor: "#aa64c3",
  parentBotId: that.parentBot ? that.parentBot.tags.id : null,
  scaleZ: 0.1,
  labelAlignment: "left",
  onDrag: typingTool.tags.mmOnDrag,
  lineTo: [],
  onDragging: typingTool.tags.mmOnDragging,
  [dim + "Z"]: 0.05,
  linkList: [],
  lineColor: "#263238",
  mode: that.parentBot ? that.parentBot.masks.mode : 0,
  owner: that.parentBot ? that.parentBot.tags.owner : typingTool.tags.id,
  toErase: true,
  onDestroy: typingTool.tags.mmOnDelete,
  onPointerEnter: typingTool.tags.mmOnPointerEntering,
  onPointerExit: typingTool.tags.mmOnPointerExiting,
  ...that?.config,
});

// creating new index block for text block
let childIndexBot = create({
  [dim]: true,
  [dim + "X"]: that.from.x - 3,
  [dim + "Y"]: that.from.y,
  space: "tempShared",
  scaleX: 1,
  scaleY: 1,
  label: "1",
  showPointer: false,
  expanded: true,
  subColor: "#aa64c3",
  scaleZ: 0.1,
  labelAlignment: "center",
  mmIndexBot: true,
  onDrag: typingTool.tags.mmOnDrag,
  onDragging: typingTool.tags.mmIndexOnDragging,
  onPointerEnter: typingTool.tags.mmOnPointerE,
  onPointerExit: typingTool.tags.mmOnPointerD,
  [dim + "Z"]: 0.05,
  onClick: typingTool.tags.mmIndexOnClick,
  permission: [7, 0],
  owner: that.parentBot ? that.parentBot.tags.owner : typingTool.tags.id,
  labelSize: 0.8,
});

// setting text and index block scales
animateTag(childBot, {
  fromValue: {
    scaleX: childBot.tags.scaleX,
    scaleY: childBot.tags.scaleY,
  },
  toValue: {
    scaleX: 5,
    scaleY: 1,
  },
  duration: 0.05,
  tagMaskSpace: "shared",
});

animateTag(childIndexBot, {
  fromValue: {
    scaleX: childIndexBot.tags.scaleX,
    scaleY: childIndexBot.tags.scaleY,
  },
  toValue: {
    scaleX: 1,
    scaleY: 1,
  },
  duration: 0.05,
  tagMaskSpace: "shared",
});

// initiating variable for text block
setTagMask(childBot, "lineTo", [], "shared");
setTagMask(childBot, "childIds", [], "shared");
setTagMask(
  childBot,
  "formOpacity",
  that.parentBot ? (that.parentBot.masks.mode === 1 ? 0.7 : 1) : 1,
  "shared"
);
setTagMask(
  childBot,
  "mode",
  that.parentBot ? that.parentBot.masks.mode : 0,
  "shared"
);
setTagMask(childBot, "hideLineTo", [], "shared");
setTagMask(childBot, "expanded", true, "shared");
setTagMask(childBot, "label", that.label ? that.label : " ", "shared");
setTagMask(childBot, `${[dim + "X"]}`, that.from.x, "shared");
setTagMask(childBot, `${[dim + "Y"]}`, that.from.y, "shared");
setTagMask(childIndexBot, "labelSize", "0.8", "tempShared");

// updating parent block childrens data
if (that.parentBot) {
  setTagMask(
    that.parentBot,
    "childIds",
    [...that.parentBot.masks.childIds, childBot.id],
    "shared"
  );
  setTagMask(
    that.parentBot,
    "lineTo",
    [...that.parentBot.masks.childIds],
    "shared"
  );
}

childBot.tags.indexBot = childIndexBot.tags.id;
childIndexBot.tags.textBot = childBot.tags.id;
childBot.tags.originalId = childBot.tags.id;
childIndexBot.tags.originalId = childIndexBot.tags.id;

// renaming previous index blocks
let rootParent = getRootParent(childBot);
const allChildIds = [rootParent.tags.id, ...getAllChildIds(rootParent.tags.id)];
for (let i = 0; i < allChildIds.length; i++) {
  let subBot = getBot(byTag("id", allChildIds[i]));
  if (subBot.tags.indexBot) {
    let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
    setTagMask(subIndexBot, "label", `${i + 1}`, "shared");
  }
}

// setting positions for text and index blocks

if (that.parentBot) {
  let parentBotChildrens = that.parentBot.masks.childIds;
  for (let i = 0; i < parentBotChildrens.length; i++) {
    let subBot = getBot(byTag("id", parentBotChildrens[i]));
    let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
    let yPosition = (that.parentBot.masks.childIds.length - (2 * i + 1)) * 1.5;
    animateTag(subBot, {
      fromValue: {
        [dim + "X"]: subBot.masks[dim + "X"],
        [dim + "Y"]: subBot.masks[dim + "Y"],
      },
      toValue: {
        [dim + "X"]: that.parentBot.masks[dim + "X"] + 10,
        [dim + "Y"]: that.parentBot.masks[dim + "Y"] + yPosition,
      },
      duration: 0.05,
      tagMaskSpace: "shared",
    });
    animateTag(subIndexBot, {
      fromValue: {
        [dim + "X"]: subIndexBot.masks[dim + "X"],
        [dim + "Y"]: subIndexBot.masks[dim + "Y"],
      },
      toValue: {
        [dim + "X"]: that.parentBot.masks[dim + "X"] + 7,
        [dim + "Y"]: that.parentBot.masks[dim + "Y"] + yPosition,
      },
      duration: 0.05,
      tagMaskSpace: "shared",
    });
    childBot.tags.initPos = {
      x: that.parentBot.masks[dim + "X"] + 10,
      y: that.parentBot.masks[dim + "Y"] + yPosition,
    };
    childIndexBot.tags.initPos = {
      x: that.parentBot.masks[dim + "X"] + 7,
      y: that.parentBot.masks[dim + "Y"] + yPosition,
    };
  }
} else {
  childBot.tags.initPos = { x: that.from.x, y: that.from.y };
  childIndexBot.tags.initPos = { x: that.from.x - 3, y: that.from.y };
}

typingTool.tags.currentWritingBotId = childBot.id;
typingTool.tags.writing = true;

that?.st &&
  that?.st.forEach((item) => {
    setTimeout(item.fn, item.time);
  });
return { bot: childBot };
