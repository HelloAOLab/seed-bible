let dim = os.getCurrentDimension();
let lineColors = [
  "#FF4081",
  "#E040FB",
  "#7C4DFF",
  "#536DFE",
  "#448AFF",
  "#40C4FF",
  "#18FFFF",
  "#64FFDA",
  "#69F0AE",
];
let botColors = [
  "#FCE4EC",
  "#F3E5F5",
  "#EDE7F6",
  "#E8EAF6",
  "#E3F2FD",
  "#E1F5FE",
  "#E0F7FA",
  "#E0F2F1",
  "#E8F5E9",
];
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
  return [...childrenIds];
};

os.unregisterApp("presentationMode");
await os.registerApp("presentationMode", thisBot);

const { useEffect, useState } = os.appHooks;

function App() {
  const [initialChildrens, setInitialChildrens] = useState<any[]>([]);
  const removePresentation = async (initialChildrens) => {
    await os.playSound(
      "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/2e2827636cc7a30197222a7ccd65a71d3ce95a34abe2a7d218c822ebbc052798.mpga"
    );
    destroy(getBots("showBot"));
    // let allChildrens = [...getAllChildIds(tags.focusManager.childIds[0])];
    for (let i = 0; i < initialChildrens.length; i++) {
      let subBot = getBot(byTag("id", initialChildrens[i]));
      if (!subBot) {
        continue;
      }
      let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
      subBot.masks.lineTo = null;
      setTagMask(subBot, "lineTo", [...subBot.masks.childIds], "shared");
      if (subBot.masks.interval) {
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
      }
      setTagMask(subBot, "color", "white", "shared");
      // setTagMask(subBot, "strokeColor", null, "shared")
      subBot.masks.strokeColor = null;
      setTagMask(subBot, "pointable", true, "shared");
      setTagMask(subBot, "draggable", true, "shared");
      setTagMask(subBot, `${[dim + "Z"]}`, 0.05, "shared");
      setTagMask(subBot, "formOpacity", 1, "shared");
      setTagMask(subBot, "labelOpacity", 1, "shared");
      setTagMask(subIndexBot, "color", "white", "shared");
      // setTagMask(subIndexBot, "strokeColor", null, "shared")
      subIndexBot.masks.strokeColor = null;
      setTagMask(subIndexBot, "pointable", true, "shared");
      setTagMask(subIndexBot, "draggable", true, "shared");
      setTagMask(subIndexBot, `${[dim + "Z"]}`, 0.05, "shared");
      setTagMask(subIndexBot, "formOpacity", 1, "shared");
      setTagMask(subIndexBot, "labelOpacity", 1, "shared");
      if (subBot.masks.previousLocation) {
        animateTag(subBot, {
          fromValue: {
            [dim + "Y"]: subBot.tags[dim + "Y"],
            [dim + "X"]: subBot.tags[dim + "X"],
          },
          toValue: {
            [dim + "Y"]: subBot.masks.previousLocation.y,
            [dim + "X"]: subBot.masks.previousLocation.x,
          },
          duration: 1,
          tagMaskSpace: "shared",
        });
        animateTag(subIndexBot, {
          fromValue: {
            [dim + "Y"]: subIndexBot.tags[dim + "Y"],
            [dim + "X"]: subIndexBot.tags[dim + "X"],
          },
          toValue: {
            [dim + "Y"]: subIndexBot.masks.previousLocation.y,
            [dim + "X"]: subIndexBot.masks.previousLocation.x,
          },
          duration: 1,
          tagMaskSpace: "shared",
        });
        setTimeout(() => {
          subBot.masks.previousLocation = null;
          subIndexBot.masks.previousLocation = null;
        }, 1100);
      }
    }
    let writingBot = getBot(byTag("id", tags.currentWritingBotId));
    if (writingBot) {
      writingBot.masks.currentWriter = null;
      writingBot.masks.name = null;
    }
    tags.currentWritingBotId = null;
    tags.writing = false;
    globalThis.removePresentationMode = null;
    globalThis.initialChildrens = null;
    os.unregisterApp("presentationMode");
  };

  const next = async () => {
    let indexOfCurrBotId = tags.focusManager.childIds.indexOf(
      tags.focusManager.currentChild
    );
    if (indexOfCurrBotId < tags.focusManager.childIds.length - 1) {
      let currentSubBot = getBot(byTag("id", tags.focusManager.currentChild));
      let currentSubIndexBot = getBot(byTag("id", currentSubBot.tags.indexBot));
      currentSubBot.masks.strokeColor = null;
      currentSubIndexBot.masks.strokeColor = null;
      setTagMask(currentSubBot, "color", "white", "shared");
      setTagMask(currentSubIndexBot, "color", "white", "shared");
      tags.focusManager.currentChild =
        tags.focusManager.childIds[indexOfCurrBotId + 1];
      tags.currentWritingBotId =
        tags.focusManager.childIds[indexOfCurrBotId + 1];
      getBot("system", "ext_canvas.mindMap").tags.focusBotId =
        tags.focusManager.currentChild;
      let subBot = getBot(byTag("id", tags.focusManager.currentChild));
      let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
      let currentNumber = Math.floor(Math.random() * lineColors.length);
      let currentColor = lineColors[currentNumber];
      setTagMask(subBot, "strokeColor", currentColor, "shared");
      setTagMask(subIndexBot, "strokeColor", currentColor, "shared");
      setTagMask(subBot, "color", botColors[currentNumber], "shared");
      setTagMask(subIndexBot, "color", botColors[currentNumber], "shared");
    } else {
      removePresentation(initialChildrens);
    }
  };
  const previous = async () => {
    let indexOfCurrBotId = tags.focusManager.childIds.indexOf(
      tags.focusManager.currentChild
    );
    if (indexOfCurrBotId > 0) {
      let currentSubBot = getBot(byTag("id", tags.focusManager.currentChild));
      let currentSubIndexBot = getBot(byTag("id", currentSubBot.tags.indexBot));
      currentSubBot.masks.strokeColor = null;
      currentSubIndexBot.masks.strokeColor = null;
      setTagMask(currentSubBot, "color", "white", "shared");
      setTagMask(currentSubIndexBot, "color", "white", "shared");
      tags.focusManager.currentChild =
        tags.focusManager.childIds[indexOfCurrBotId - 1];
      tags.currentWritingBotId =
        tags.focusManager.childIds[indexOfCurrBotId - 1];
      getBot("system", "ext_canvas.mindMap").tags.focusBotId =
        tags.focusManager.currentChild;
      let subBot = getBot(byTag("id", tags.focusManager.currentChild));
      let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
      let currentNumber = Math.floor(Math.random() * lineColors.length);
      let currentColor = lineColors[currentNumber];
      setTagMask(subBot, "strokeColor", currentColor, "shared");
      setTagMask(subIndexBot, "strokeColor", currentColor, "shared");
      setTagMask(subBot, "color", botColors[currentNumber], "shared");
      setTagMask(subIndexBot, "color", botColors[currentNumber], "shared");
    } else {
      await os.playSound(
        "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/2323b7b9814a9f228da77abc1ea1ee1a6f08b7c3d2c58613bc88138331b2d46e.mpga"
      );
      os.toast("there is no previous node");
    }
  };

  useEffect(() => {
    setInitialChildrens([
      tags.focusManager.childIds[0],
      ...getAllChildIds(tags.focusManager.childIds[0]),
    ]);
    globalThis.removePresentationMode = removePresentation;
  }, []);
  useEffect(() => {
    globalThis.initialChildrens = initialChildrens;
  }, [initialChildrens]);
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <div class="footer">
        <button onClick={() => removePresentation(initialChildrens)}>
          <span class="material-symbols-outlined">close</span>
        </button>
        <button onClick={() => previous()}>
          <span class="material-symbols-outlined">skip_previous</span>
        </button>
        <button onClick={() => next()}>
          <span class="material-symbols-outlined">skip_next</span>
        </button>
      </div>
      <style>{tags["App.css"]}</style>
    </>
  );
}

os.compileApp("presentationMode", <App />);
