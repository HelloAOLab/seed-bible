const { botId } = that;
const dim = os.getCurrentDimension();
const controlBot = getBot(byID(botId));

const nodeBotConfig = {
  ...globalThis.eventBotConfig,
};

const fetchData = (url) => {
  return web
    .hook({
      method: "GET",
      url: url,
    })
    .then((e) => {
      return e.data.data;
    })
    .catch(() => {
      return [];
    });
};

const fetchAllData = async (endpoints) => {
  try {
    const fetchPromises = endpoints.map(fetchData);

    const results = await Promise.all(fetchPromises);

    return results;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

const createExpanseBot = async (botRef) => {
  const data = botRef.tags.data;

  const dataStructure = {
    book: {
      botName: [],
      access: [],
      type: [],
    },
    chapter: {
      botName: [],
      access: [],
      type: [],
    },
    easton: {
      botName: ["Person"],
      access: [data["personLookup"]],
      type: ["people"],
    },
    event: {
      botName: ["Locations", "Participants", "Verses"],
      access: [data.locations, data.participants, data.verses],
      type: ["place", "people", "verse"],
    },
    peopleGroup: {
      botName: [],
      access: [],
      type: [],
    },
    people: {
      botName: ["Father", "Mother", "Siblings", "Children"],
      access: [data.father, data.mother, data.siblings, data.children],
      type: ["people", "people", "people", "people"],
    },
    period: {
      botName: ["PeopleBorn", "PeopleDied", "BooksWritten"],
      access: [data.peopleBorn, data.peopleDied, data.booksWritten],
      type: ["people", "people", "book"],
    },
    place: {
      botName: ["Events Here", "Books written here"],
      access: [data["eventsHere"], data["booksWritten"]],
      type: ["event", "book"],
    },
    verse: {
      botName: [],
      access: [],
      type: [],
    },
  };

  if (data.type === "verse") {
    setOpenSidebar(false);
    let osisRef = data.osisRef.split(".");
    bible.openAt(`${data.book[0].bookName} ${osisRef[1]}:${osisRef[2]}`);
    shout("playSound", { soundName: "OpenPage" });
    await os.sleep(100);
    updateCustomHeight(0.89);
    return;
  }

  if (data.type === "book") {
    setOpenSidebar(false);
    bible.openAt(`${data.bookName} 1:1`);
    shout("playSound", { soundName: "OpenPage" });
    await os.sleep(100);
    updateCustomHeight(0.89);
    return;
  }

  if (data.type === "chapter") {
    setOpenSidebar(false);
    bible.openAt(`${data.book[0].bookName} ${data.chapterNum}:1}`);
    shout("playSound", { soundName: "OpenPage" });
    await os.sleep(100);
    updateCustomHeight(0.89);
    return;
  }

  let allData = [];

  for (let i = 0; i < dataStructure[data.type].access.length; i++) {
    const uidUrl = dataStructure[data.type].access[i].map((item) => {
      const params = {
        uid: typeof item === "string" ? item : item.uid,
      };
      return eventUtils.attachQueryToURL(eventApis.common.getItemByUid, params);
    });
    allData.push(uidUrl);
  }

  const ids = [];

  for (let i = 0; i < allData.length; i++) {
    let dataBot = create({
      ...nodeBotConfig,
      nodeType: "expanse",
      [dim + "X"]: botRef.tags[dim + "X"] + 12,
      [dim + "Y"]: botRef.tags[dim + "Y"] - i * 2,
      [dim + "Z"]: -0.01,
      data: allData[i],
      label: dataStructure[data.type].botName[i],
      type: dataStructure[data.type].type[i],
      parentBotId: botRef.tags.id,
    });
    ids.push(dataBot.tags.id);
    if (!controlBot.tags.eventBot) {
      shout("convertToAi", { node: dataBot });
    }
  }

  setTagMask(controlBot, "lineTo", [...ids]);
  controlBot.masks.color = "#0091EA";
  shout("makeHideTool", { botId: controlBot.tags.id, toolName: "hideTool" });
};

const createSoureBot = async () => {
  if (controlBot.tags.data.length === 0) {
    controlBot.masks.color = "#78909C";
    return;
  }

  os.toast("Loading data!");

  globalThis.eventDataLoading = true;

  let uidData = await fetchAllData(controlBot.tags.data);

  const sourceBotDataStructure = {
    book: {
      name: "bookName",
      onClick: ``,
    },
    chapter: {
      name: "chapterNum",
      onClick: ``,
    },
    easton: {
      name: "termLabel",
    },
    event: {
      name: "title",
    },
    peopleGroup: {
      name: "groupName",
    },
    people: {
      name: "name",
    },
    period: {
      name: "yearNum",
    },
    place: {
      name: "displayTitle",
    },
    verse: {
      name: "verseText",
      onClick: ``,
    },
  };
  let ids = [];

  if (
    !getBot(byID(controlBot.tags.id)) ||
    !getBot(byID(controlBot.tags.id)).masks.selectedNodeBot
  ) {
    return;
  }

  if (uidData[0].type === "verse") {
    uidData = uidData.sort(
      (a, b) => parseInt(a.verseNum) - parseInt(b.verseNum)
    );
  }

  for (let i = 0; i < uidData.length; i++) {
    let label = uidData[i][sourceBotDataStructure[controlBot.tags.type].name];
    if (uidData[0].type === "verse") {
      let osisRef = uidData[i].osisRef.split(".");
      // console.log(`https://vmfnri.helloao.org/api/AAB/${uidData[0].book[0].bookName}/${osisRef[1]}.json`)
      const bsbtranslation = await web
        .get(
          `https://vmfnri.helloao.org/api/AAB/${uidData[0].book[0].bookName}/${osisRef[1]}.json`
        )
        .then((data) => {
          return data.data;
        });
      let verseJSON = bsbtranslation.chapter.content.filter((item) => {
        return item.number == osisRef[2];
      })[0];
      if (verseJSON) {
        label = verseJSON.content[0].text;
      }
      // bible.openAt(`${uidData[0].book[0].bookName} ${osisRef[1]}:${osisRef[2]}`)
      // shout("playSound",{soundName: "OpenPage"});
      // await os.sleep(100)
      // updateCustomHeight(0.89);
      // return
    }
    let locationBot = create({
      ...nodeBotConfig,
      nodeType: "source",
      [dim + "X"]: controlBot.tags[dim + "X"] + 12,
      [dim + "Y"]: controlBot.tags[dim + "Y"] - i * 2,
      data: uidData[i],
      label,
      type: controlBot.tags.type,
    });
    ids.push(locationBot.tags.id);
    if (!controlBot.tags.eventBot) {
      shout("convertToAi", { node: locationBot });
    }
  }

  setTagMask(controlBot, "lineTo", [...ids], "tempLocal");
  controlBot.masks.color = "#0091EA";
  globalThis.eventDataLoading = false;
  os.toast("Data loaded!");
  shout("makeHideTool", { botId: controlBot.tags.id, toolName: "hideTool" });
};

const convertDataToNodes = async (botRef) => {
  if (botRef.tags.nodeType === "source") {
    await createExpanseBot(botRef);
  } else if (botRef.tags.nodeType === "expanse") {
    await createSoureBot({ botRef: botRef });
  }
};

const getGradientColor = (value) => {
  // Red color values
  // rgb(0,176,255)
  const greenRGB = [29, 233, 182];
  // Blue color values
  const blueRGB = [0, 176, 255];

  if (value === 0) {
    // Return blue for value 0
    return `rgb(${blueRGB.join(", ")})`;
  } else if (value >= 30) {
    // Return red for value above 30
    return `rgb(${greenRGB.join(", ")})`;
  } else {
    // Calculate gradient color leaning towards red for higher values and towards blue for lower values
    const red =
      Math.round((greenRGB[0] * value) / 30) +
      Math.round((blueRGB[0] * (30 - value)) / 30);
    const green =
      Math.round((greenRGB[1] * value) / 30) +
      Math.round((blueRGB[1] * (30 - value)) / 30);
    const blue =
      Math.round((greenRGB[2] * value) / 30) +
      Math.round((blueRGB[2] * (30 - value)) / 30);
    return `rgb(${red}, ${green}, ${blue})`;
  }
};

const lerpColor = () => {
  let i = 0;
  let forward = true;
  return setInterval(() => {
    if (forward) {
      controlBot.masks.color = getGradientColor(i);
      i++;
      if (i >= 30) {
        forward = !forward;
      }
    } else {
      controlBot.masks.color = getGradientColor(i);
      i--;
      if (i <= 0) {
        forward = !forward;
      }
    }
  }, 20);
};

let lerp = lerpColor();

await convertDataToNodes(controlBot);

clearInterval(lerp);
