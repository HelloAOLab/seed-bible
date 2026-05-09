const typingTool = getBot(byTag("typingTool"));
let dim = os.getCurrentDimension();
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

const addBotToParent = async (botId) => {
  let newChildBot = getBot(byTag("id", botId));
  whisper(getBot("mmTypingManager"), "linePulser", { parentId: botId });
  let newChildBotIndex = getBot(byTag("id", newChildBot.tags.indexBot));
  newChildBot.tags.hold = true;
  newChildBot.tags.parentBotId = tags.id;
  setTagMask(
    thisBot,
    "lineTo",
    [...masks.lineTo, newChildBot.tags.id],
    "shared"
  );
  setTagMask(
    thisBot,
    "childIds",
    [...masks.childIds, newChildBot.tags.id],
    "shared"
  );
  animateTag(newChildBot, {
    fromValue: {
      [dim + "X"]: newChildBot.tags[dim + "X"],
    },
    toValue: {
      [dim + "X"]: newChildBot.tags[dim + "X"] + 10,
    },
    duration: 0.1,
    tagMaskSpace: "shared",
  });
  animateTag(newChildBotIndex, {
    fromValue: {
      [dim + "X"]: newChildBotIndex.tags[dim + "X"],
    },
    toValue: {
      [dim + "X"]: newChildBotIndex.tags[dim + "X"] + 10,
    },
    duration: 0.1,
    tagMaskSpace: "shared",
  });
  let rootParent = getRootParent(thisBot);
  const allChildIds = [
    rootParent.tags.id,
    ...getAllChildIds(rootParent.tags.id),
  ];
  for (let i = 0; i < allChildIds.length; i++) {
    let subBot = getBot(byTag("id", allChildIds[i]));
    if (subBot.tags.indexBot) {
      let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
      subIndexBot.masks.label = null;
      setTagMask(subIndexBot, "label", `${i + 1}`, "shared");
    }
  }
  for (let i = 0; i < masks.childIds.length; i++) {
    let subBot = getBot(byTag("id", masks.childIds[i]));
    let yPosition = (masks.childIds.length - (2 * i + 1)) * 1.5;
    animateTag(subBot, {
      fromValue: {
        [dim + "Y"]: subBot.tags[dim + "Y"],
      },
      toValue: {
        [dim + "Y"]: tags[dim + "Y"] + yPosition,
      },
      duration: 0.1,
      tagMaskSpace: "shared",
    });
    if (subBot.tags.indexBot) {
      let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
      animateTag(subIndexBot, {
        fromValue: {
          [dim + "Y"]: subIndexBot.tags[dim + "Y"],
        },
        toValue: {
          [dim + "Y"]: tags[dim + "Y"] + yPosition,
        },
        duration: 0.1,
        tagMaskSpace: "shared",
      });
    }
  }

  newChildBot.tags.hold = false;
  whisper(typingTool, "onGridClick");
};

if (typingTool.tags.currentWritingBotId === thisBot.tags.id) {
  whisper(typingTool, "menuOnCreate", {
    [dim + "X"]: thisBot.tags[dim + "X"],
    [dim + "Y"]: thisBot.tags[dim + "Y"],
    id: thisBot.tags.id,
    textBot: thisBot.tags.textBox,
  });
}

if (that.bot.id !== tags.id) {
  const allowedBots = [
    "ab.factory.botStore",
    "ab.factory.egg",
    "ab.factory.manager",
    "ab.factory.mod",
    "ab.factory.pad",
    "ab.factory.portal",
    "ab.factory.track",
  ];
  if (that.bot.tags.textBot) {
    let textBot = getBot(byTag("id", that.bot.tags.textBot));
    if (!textBot.tags.parentBotId) {
      addBotToParent(that.bot.tags.textBot);
    }
  } else if (that.bot.tags.mmBot && !that.bot.tags.parentBotId) {
    await addBotToParent(that.bot.tags.id);
  } else if (that.bot.tags.toolManager) {
    that.bot.tags.onPointerDown = tags.onPointerDown;
    addBotToParent(that.bot.tags.id);
  } else if (that.bot.tags.textBox) {
    whisper(typingTool, "createMMBot", {
      from: { x: thisBot.tags.initPos.x, y: thisBot.tags.initPos.y },
      parentBot: thisBot,
      label: that.bot.masks.label ? that.bot.masks.label : " ",
      config: {
        formAddress: that.bot.masks.formAddress
          ? that.bot.masks.formAddress
          : that.bot.tags.formAddress
            ? that.bot.tags.formAddress
            : null,
        voiceNote: that.bot.masks.voiceNote
          ? that.bot.masks.voiceNote
          : that.bot.tags.voiceNote
            ? that.bot.tags.voiceNote
            : null,
        prevScaleX: that.bot.tags?.prevScaleX ? that.bot.tags.prevScaleX : null,
        prevScaleY: that.bot.tags?.prevScaleY ? that.bot.tags.prevScaleY : null,
      },
    });
    destroy(getBot(byTag("id", that.bot.tags.id)));
  }
} else {
  if (that.to.bot && that.to.bot.tags.indexBot) {
    return;
  }
  let xDisposition = that.from.x - that.to.x;
  let yDisposition = that.from.y - that.to.y;
  let childrenIds = getAllChildIds(tags.id);
  whisper(getBot("mmTypingManager"), "moveBots", {
    childrenIds,
    xDisposition,
    yDisposition,
    space: "tempShared",
  });
  // if(tags.space === "tempShared"){
  //     whisper(getBot('mmTypingManager'), "moveBots", {childrenIds, xDisposition, yDisposition, space: `tempShared`});
  // }
}

tags.initPos = { x: that.to.x, y: that.to.y };

let usbBots = getBots("usbForm");
let indexBot = getBot(byTag("id", tags.indexBot));
for (let i = 0; i < usbBots.length; i++) {
  if (
    usbBots[i].tags[dim + "X"] > indexBot.tags[dim + "X"] - 0.5 &&
    usbBots[i].tags[dim + "X"] < indexBot.tags[dim + "X"] + 0.5 &&
    usbBots[i].tags[dim + "Y"] > indexBot.tags[dim + "Y"] - 0.5 &&
    usbBots[i].tags[dim + "Y"] < indexBot.tags[dim + "Y"] + 0.5
  ) {
    tags.draggable = false;
    indexBot.tags.draggable = false;
    animateTag(thisBot, {
      fromValue: {
        [dim + "X"]: thisBot.tags[dim + "X"],
        [dim + "Y"]: thisBot.tags[dim + "Y"],
      },
      toValue: {
        [dim + "X"]: usbBots[i].tags[dim + "X"] + 3,
        [dim + "Y"]: usbBots[i].tags[dim + "Y"],
      },
      duration: 0.1,
    });
    animateTag(indexBot, {
      fromValue: {
        [dim + "X"]: indexBot.tags[dim + "X"],
        [dim + "Y"]: indexBot.tags[dim + "Y"],
      },
      toValue: {
        [dim + "X"]: usbBots[i].tags[dim + "X"],
        [dim + "Y"]: usbBots[i].tags[dim + "Y"],
      },
      duration: 0.1,
    });
    usbBots[i].tags.allotedMindmap = tags.id;
    let lockBot = getBot(byTag("id", usbBots[i].tags.lockId));
    lockBot.tags.formAddress = lockBot.tags.formAddresses[0];
    let slider = getBot(byTag("id", usbBots[i].tags.sliderId));
    slider.tags.slots = slider.tags.slots
      ? slider.tags.slots.indexOf(usbBots[i].tags.id) === -1
        ? [...slider.tags.slots, usbBots[i].tags.id]
        : [...slider.tags.slots]
      : [usbBots[i].tags.id];
  } else if (!usbBots[i].tags.allotedMindmap) {
    if (usbBots[i].tags.allotedMindmap !== " ") {
      destroy(usbBots[i]);
      destroy(getBot(byTag("id", usbBots[i].tags.lockId)));
    }
  }
}
