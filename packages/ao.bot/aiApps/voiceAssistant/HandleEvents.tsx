import { captureElement } from "aiApps.voiceAssistant.Utils";

const getTranslationData = async ({ language = "english" }) => {
  let available_translations_req = await web.get(
    "https://vmfnri.helloao.org/api/available_translations.json"
  );
  let translationId;
  for (
    let i = 0;
    i < available_translations_req.data.translations.length;
    i++
  ) {
    let translation = available_translations_req.data.translations[i];
    if (
      language.toLowerCase() === translation?.languageEnglishName?.toLowerCase()
    ) {
      translationId = translation.id;
      break;
    }
  }
  console.log(translationId, language, "translationId");
  let translationReq = await web.get(
    `https://vmfnri.helloao.org/api/${translationId}/books.json`
  );
  return { ...translationReq.data };
};

const addTranslationId = (translationData: any, url: any, translationPass) => {
  console.log(translationData, "translationData");
  if (translationData.translation.id) {
    translationPass = translationData.translation.id;
    return `${url}&translation=${translationData.translation.id}`;
  } else {
    return url;
  }
};
const addBookIdandChapter = (
  translationData: any,
  url: any,
  bookId: any,
  chapter: any,
  bookPass,
  chapterPass
) => {
  let tempUrl = "";
  for (let i = 0; i < translationData.books.length; i++) {
    if (translationData.books[i].id.toLowerCase() === bookId?.toLowerCase()) {
      bookPass = translationData.books[i].id;
      tempUrl = `${url}&book=${translationData.books[i].id}`;
      if (chapter <= translationData.books[i].numberOfChapters) {
        chapterPass = chapter;
        tempUrl = `${tempUrl}&chapter=${chapter}`;
      }
      return tempUrl;
    }
  }
  return url;
};
const verifyVerse = async (
  url: any,
  translationPass: any,
  bookPass: any,
  chapterPass,
  verse,
  versePass
) => {
  let chapterReq = await web.get(
    `https://vmfnri.helloao.org/api/${translationPass}/${bookPass}/${chapterPass}.json`
  );
  let chapterData = { ...chapterReq.data };
  if (verse <= chapterData.numberOfVerses) {
    versePass = verse;
    return `${url}&verse${verse}`;
  } else {
    return url;
  }
};

const handleUrls = async ({
  config,
  colaborativeId,
  dc,
  uid,
  isCollaborative,
}) => {
  let url = `https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true`;
  let { language, bookId, chapter, verse } = config;
  let translationPass = false;
  let bookPass = false;
  let chapterPass = false;
  let versePass = false;

  let translationData = await getTranslationData({
    language: language || "english",
  });

  url = addTranslationId(translationData, url, translationPass);
  url = addBookIdandChapter(
    translationData,
    url,
    bookId,
    chapter,
    bookPass,
    chapterPass
  );
  url = `${url}&verse=${verse || 1}`;

  if (isCollaborative) {
    url = `${url}&inst=${colaborativeId}&bios=free`;
  }
  if (uid) {
    url = `${url}&chatUid=${uid}`;
  }
  dc.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "input_text",
            text: `url (always include chatUid in the url and don't skip it): ${url}`,
          },
        ],
      },
    })
  );
  return url;
};

const saveChat = async () => {
  const chatMessages = { ...masks.chatMessages };
  const itemArray = [...masks.itemArray];
  let res = await web.get(
    `https://aolab-bible-api.netlify.app/api/ai/saveMessages?chatMessages=${encodeURIComponent(JSON.stringify(chatMessages))}&itemArray=${JSON.stringify(itemArray)}`
  );
  return res.data.uid;
};
const HandleEvents = async ({ dc, data }) => {
  console.log(data, "eventat datat");
  switch (data.name) {
    case "displaySeedBibleUrl": {
      const { bibleUrlData, isCollaborative } = JSON.parse(
        data.arguments || "{}"
      );
      const colaborativeId = uuid();
      console.log(bibleUrlData);
      const uid = await saveChat();
      console.log(uid, "uid");

      let promises = [];
      if (bibleUrlData && Array.isArray(bibleUrlData)) {
        bibleUrlData.map((config) => {
          promises.push(
            handleUrls({ config, colaborativeId, dc, uid, isCollaborative })
          );
        });
      }

      let urls = await Promise.all(promises);

      console.log(urls, "urls");

      let urlmsgUid = uuid();

      setTagMask(
        thisBot,
        "chatMessages",
        {
          ...masks.chatMessages,
          [`${urlmsgUid}`]: {
            message: `${urls.join(",\n")}`,
            role: "assistant",
          },
        },
        "tempLocal"
      );

      setTagMask(
        thisBot,
        "itemArray",
        [...masks.itemArray, urlmsgUid],
        "tempLocal"
      );

      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `url displayed`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
  }
};

export default HandleEvents;
