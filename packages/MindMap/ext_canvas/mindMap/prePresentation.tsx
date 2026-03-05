let dim = os.getCurrentDimension();
const typingTool = getBot("mmTypingManager");

const parentCheck = (childId: any, parentId) => {
  let childBot = getBot(byTag("id", childId));
  let isParent = false;
  if (!childBot.tags.parentBotId) {
    return false;
  } else if (childBot.tags.parentBotId !== parentId) {
    isParent = parentCheck(childBot.tags.parentBotId, parentId);
  } else {
    isParent = true;
  }
  return isParent;
};

const childToParentBots = (childId: any, parentId) => {
  let childBot = getBot(byTag("id", childId));
  let list = [childId];
  if (childBot.tags.parentBotId !== parentId) {
    list = [...list, ...childToParentBots(childBot.tags.parentBotId, parentId)];
  } else {
    list = [...list, parentId];
  }
  return [...list];
};

const getAllChildIds = (id: any) => {
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

if (that.selecting) {
  // await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/e00550871b08fbbe54349b0c637ced1f5487768097d06de4d7775b14c98e5756.mpga")
  let selectBot = getBot(byTag("button2", true));
  if (selectBot) {
    if (
      selectBot.tags.selecting &&
      selectBot.tags.selectedBot[0] !== that.bot.tags.id
    ) {
      if (parentCheck(that.bot.tags.id, selectBot.tags.selectedBot[0])) {
        let childToParentList = [
          ...childToParentBots(that.bot.tags.id, selectBot.tags.selectedBot[0]),
        ].reverse();
        let allChildrens = [
          selectBot.tags.selectedBot[0],
          ...getAllChildIds(selectBot.tags.selectedBot[0]),
        ];
        let parentBot = getBot(byTag("id", selectBot.tags.selectedBot[0]));
        parentBot.tags.linkList.push(that.bot.tags.id);
        //224, 64, 251
        //24, 255, 255
        for (let i = 0; i < childToParentList.length; i++) {
          let subBot = getBot(byTag("id", childToParentList[i]));
          let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
          setTimeout(async () => {
            whisper(typingTool, "addPulseColor", {
              bot: subBot,
              startingColor: [224, 64, 251],
              endingColor: [24, 255, 255],
              initialZ: 0.05,
            });
            whisper(typingTool, "addPulseColor", {
              bot: subIndexBot,
              startingColor: [224, 64, 251],
              endingColor: [24, 255, 255],
              initialZ: 0.05,
            });
            await os.playSound(
              "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/142a013c30b0e139bd1ff8dde960a9b50ca6fce225af726a83d0539baac38a05.mpga"
            );
            if (childToParentList.indexOf(subBot.tags.id) === -1) {
              setTimeout(() => {
                clearAnimations(subBot);
                clearInterval(subBot.masks.interval);
                clearInterval(subBot.masks.interval2);
                clearAnimations(subIndexBot);
                clearInterval(subIndexBot.tags.interval);
                clearInterval(subIndexBot.tags.interval2);
                subBot.tags.color = "white";
                subBot.tags[dim + "Z"] = 0.05;
                subIndexBot.tags.color = "white";
                subIndexBot.tags[dim + "Z"] = 0.05;
              }, 200 * 1);
            }
          }, 150 * i);
          if (childToParentList[i] === that.bot.tags.id) {
            break;
          }
        }
        setTimeout(() => {
          selectBot.tags.selecting = false;
          selectBot.tags.selectedBot = [];
          selectBot.tags.formAddress = selectBot.tags.formAddresses[0];
        }, 100);
      }
    }
  }
} else {
  let parentBot = getBot(byTag("id", that.parentId));
  let childToParentList = [
    ...childToParentBots(that.childId, that.parentId),
  ].reverse();
  let allChildrens = [that.parentId, ...getAllChildIds(that.parentId)];
  for (let i = 0; i < allChildrens.length; i++) {
    let subBot = getBot(byTag("id", allChildrens[i]));
    let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
    subBot.tags.draggable = false;
    subIndexBot.tags.draggable = false;
    setTimeout(async () => {
      whisper(typingTool, "addPulseColor", {
        bot: subBot,
        startingColor: [224, 64, 251],
        endingColor: [24, 255, 255],
        initialZ: 0.05,
      });
      whisper(typingTool, "addPulseColor", {
        bot: subIndexBot,
        startingColor: [224, 64, 251],
        endingColor: [24, 255, 255],
        initialZ: 0.05,
      });
      if (childToParentList.indexOf(subBot.tags.id) === -1) {
        setTimeout(async () => {
          clearAnimations(subBot);
          await clearInterval(subBot.masks.interval);
          await clearInterval(subBot.masks.interval2);
          clearAnimations(subIndexBot);
          await clearInterval(subIndexBot.masks.interval);
          await clearInterval(subIndexBot.masks.interval2);
          subBot.masks.interval = null;
          subBot.masks.interval2 = null;
          subIndexBot.masks.interval = null;
          subIndexBot.masks.interval2 = null;
          subBot.masks.formOpacity = null;
          subBot.masks.strokeColor = null;
          setTagMask(subBot, `${[dim + "Z"]}`, 0.05, "shared");
          setTagMask(subBot, `labelOpacity`, 0, "shared");
          setTagMask(subBot, `formOpacity`, 0, "shared");
          setTagMask(subBot, `color`, "clear", "shared");
          setTagMask(subBot, `strokeColor`, "clear", "shared");
          setTagMask(subBot, `pointable`, false, "shared");
          subIndexBot.masks.formOpacity = null;
          subIndexBot.masks.strokeColor = null;
          setTagMask(subIndexBot, `${[dim + "Z"]}`, 0.05, "shared");
          setTagMask(subIndexBot, `labelOpacity`, 0, "shared");
          setTagMask(subIndexBot, `formOpacity`, 0, "shared");
          setTagMask(subIndexBot, `color`, "clear", "shared");
          setTagMask(subIndexBot, `strokeColor`, "clear", "shared");
          setTagMask(subIndexBot, `pointable`, false, "shared");
          let subParentBot = getBot(byTag("id", subBot.tags.parentBotId));
          let lineTo = [...subParentBot.masks.lineTo];
          lineTo.splice(lineTo.indexOf(subBot.tags.id), 1);
          setTagMask(subParentBot, "lineTo", [...lineTo], "shared");
        }, 150 * 1);
      } else {
        subBot.masks.previousLocation = {
          x: subBot.tags[dim + "X"],
          y: subBot.tags[dim + "Y"],
        };
        animateTag(subBot, {
          fromValue: {
            [dim + "Y"]: subBot.tags[dim + "Y"],
          },
          toValue: {
            [dim + "Y"]: parentBot.tags[dim + "Y"],
          },
          duration: 1,
          tagMaskSpace: "shared",
        });
        subIndexBot.masks.previousLocation = {
          x: subIndexBot.tags[dim + "X"],
          y: subIndexBot.tags[dim + "Y"],
        };
        animateTag(subIndexBot, {
          fromValue: {
            [dim + "Y"]: subIndexBot.tags[dim + "Y"],
          },
          toValue: {
            [dim + "Y"]: parentBot.tags[dim + "Y"],
          },
          duration: 1,
          tagMaskSpace: "shared",
        });
        if (subBot.masks.childIds.length > 1) {
          setTimeout(() => {
            create({
              [dim]: true,
              scaleX: 0.3,
              scaleY: 0.3,
              color: "#1DE9B6",
              formDepthTest: false,
              formDepthWrite: false,
              [dim + "X"]: subBot.tags[dim + "X"] - 2.65,
              [dim + "Y"]: parentBot.tags[dim + "Y"] + 0.35,
              [dim + "Z"]: 0.15,
              space: "tempShared",
              scaleZ: 0.15,
              showBot: true,
              label: subBot.masks.childIds.length - 1,
              controlBotId: subBot.tags.id,
              currentState: false,
              onClick: tags.showBotOnClick,
              draggable: false,
              onPointerEnter:
                '@ !tags.currentState ? whisper(getBot("mmTypingManager"), "showTipMenu", {direction: "top", bot: thisBot, message: "Click to see other bots"}) : whisper(getBot("mmTypingManager"), "showTipMenu", {direction: "top", bot: thisBot, message: "Click to hide other bots"})',
              onPointerExit: "@ destroy(getBots('dialogBox'))",
            });
            setTagMask(thisBot, "currentState", false, "shared");
          }, 1100);
        }
      }
    }, 100 * i);
  }
}
