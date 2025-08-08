// scannedURL = new URL(that);
// let targetRecord = scannedURL.searchParams.get("inst");

globalThis.MOBILE_VIEWPORT_THRESHOLD = 600;
globalThis.makingPlaylist = false;

setTimeout(() => {
  globalThis.DragDrop = thisBot.DragDropWithGrouping();
}, 100)

globalThis.ButtonStyle = {
  cursor: "pointer",
  border: "1px solid grey",
  borderRadius: "40px",
  padding: "6px",
  fontSize: "14px",
  marginLeft: "4px"
}

globalThis.CurrentViewerID = null;

globalThis.Playlist = thisBot;

let recored = getBot("system", 'main.Recorder')

function getBooksDataForMenu(booksLink = false) {
  let formMenuBot = getBot('system', 'baseElements.formMenu');
  if (booksLink) {
    formMenuBot.tags['booksLink'] = booksLink
  }
  let bookPromise = formMenuBot.bookData();
  Promise.resolve(bookPromise).then((data) => {
    recored.tags.menuData = [...data]
    globalThis.BOOKID_DATA = data;
  }).catch((e) => {
    // os.toast("something went wrong");
    if (recored.tags.menuData) {
      globalThis.BOOKID_DATA = recored.tags.menuData
    }
  });
}

getBooksDataForMenu();

function findNameRank(book1, book2, returnRanks = false, isFindByRank = false) {
  const nameRanks = {};

  let totalBooksCount = 0;
  let totalSectionCount = 0;

  // Iterate over each testament
  thisBot.tags.bibleArrangementsArray[0].forEach(testament => {
    // Iterate over sections in the testament
    const sectionKeys = Object.keys(testament.sections);
    totalSectionCount += sectionKeys.length;
    Object.values(testament.sections).forEach((section, sectionIndex) => {
      totalBooksCount += section.length;
      // Iterate over books in the section
      section.forEach((book, index) => {
        const commonName = book.commonName;
        // Check if the book's common name matches either of the provided names
        // if (commonName.toLowerCase() === book1.toLowerCase() || commonName.toLowerCase() === book2.toLowerCase()) {
        // Calculate the rank relative to the entire list of books
        const rank = totalBooksCount - (section.length - index);
        // Update rank and testament information for the matching name
        const key = isFindByRank ? rank : commonName;
        if (!nameRanks[key]) {
          nameRanks[key] = { rank: 0, testament: [], sectionRank: 0, section: "" };
        }
        nameRanks[key].rank = rank;
        nameRanks[key].commonName = commonName;
        nameRanks[key].testament = testament.name;
        nameRanks[key].sectionRank = totalSectionCount - (sectionKeys.length - sectionIndex);
        nameRanks[key].section = sectionKeys[sectionIndex];
        nameRanks[key].chapters = book.numberOfChapters;
        nameRanks[key].startingIndex = book.startingIndex;
        // }
      });
    });
  });

  if (returnRanks) return nameRanks;

  if (!book2) {
    return {
      rank: nameRanks[book1].rank,
      testament: nameRanks[book1].testament,
      section: nameRanks[book1].section,
      chapters: nameRanks[book1].chapters
    };
  }
  return {
    [book1]: {
      rank: nameRanks[book1].rank,
      testament: nameRanks[book1].testament,
      chapters: nameRanks[book1].chapters
    },
    [book2]: {
      rank: nameRanks[book2].rank,
      testament: nameRanks[book2].testament,
      chapters: nameRanks[book2].chapters
    }
  }
}

globalThis.findNameRank = findNameRank;


function getSectionRanking() {
  const nameRanks = {};

  let totalSectionCount = 0;

  // Iterate over each testament
  thisBot.tags.bibleArrangementsArray[0].forEach(testament => {
    // Iterate over sections in the testament
    const sectionKeys = Object.keys(testament.sections);
    totalSectionCount += sectionKeys.length;

    Object.values(testament.sections).forEach((section, sectionIndex) => {
      const sectionName = sectionKeys[sectionIndex];
      if (!nameRanks[sectionName]) {
        nameRanks[sectionName] = { sectionRank: 0, section: "" };
      }
      nameRanks[sectionName].sectionRank = totalSectionCount - (sectionKeys.length - sectionIndex);
      nameRanks[sectionName].section = sectionName;
      nameRanks[sectionName].testament = testament.name;
    });

  });

  return nameRanks;
}
globalThis.getSectionRanking = getSectionRanking;



const SELECTIONTYPE = {
  "TESTAMENT": "TESTAMENT",
  "SECTION": "SECTION",
  "BOOK": "BOOK"
}
globalThis.SELECTIONTYPE = SELECTIONTYPE;


function getSectionBookRage(sectionRank) {
  let startIdx = 0;
  let endIdx = 0;
  let totalBooks = 0;

  let totalSectionCount = 0;

  // Iterate over each testament
  thisBot.tags.bibleArrangementsArray[0].forEach(testament => {
    // Iterate over sections in the testament
    const sectionKeys = Object.keys(testament.sections);
    totalSectionCount += sectionKeys.length;
    Object.values(testament.sections).forEach((section, sectionIndex) => {
      const rank = totalSectionCount - (sectionKeys.length - sectionIndex);
      if (sectionRank === rank) {
        startIdx = totalBooks;
        endIdx = totalBooks + section.length - 1;
      }
      totalBooks += section.length;
    });

  });

  return [startIdx, endIdx];
}

globalThis.getSectionBookRage = getSectionBookRage;


globalThis.IMGS = {
  AOLABSRC: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/dc29f5accefe0b99744180cce15d27f2aadb4953f75912e736501bb632e64845.png"
}

globalThis.CONSTANTS = {
  YT_PREFIX: "https://www.youtube.com/embed",
  BOT_TYPE: {
    TESTAMENT: "testament",
    SECTION: "section",
    BOOK: "book",
  }
}


globalThis.objectComparator = (firstData, secondData, keysComparator = []) => {
  if (!secondData) return false;
  if (!!keysComparator) {
    return keysComparator.some(key => {
      return firstData[key] === secondData[key];
    })
  }
  let isSame = true;
  Object.keys(firstData).forEach(key => {
    if (typeof firstData[key] !== "object") {
      isSame = (isSame && firstData[key] === secondData[key])
    } else {
      isSame = objectComparator(firstData[key], secondData[key])
    }
  })
  return isSame;
}

globalThis.createUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

globalThis.pseudoIndentifier = `pseudo-`;

globalThis.playListDB = [];

// Regex Testing
globalThis.isValidGoogleSheetsUrl = (url) => {
  const regex = /https:\/\/docs\.google\.com\/spreadsheets\/(?:u\/\d\/)?d\/[a-zA-Z0-9-_]+\/(?:edit|htmlview)(?:\?[^#]*)?(?:#gid=\d+)?$/;
  return regex.test(url);
}


globalThis.extractIdFromUrl = (url) => {
  const regex = /https:\/\/docs\.google\.com\/spreadsheets(?:\/u\/\d+)?\/d\/([^\/]+)\/(?:edit|htmlview)/;
  const match = url.match(regex);
  return match && match[1];
}

globalThis.validateUrl = (url) => {
  const videoRegex = /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/)/;
  const ytShortsRegex = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;
  const iframeRegex = /^https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/?.*/;

  try {
    const parsedUrl = new URL(url);

    // YouTube watch?v= case
    if (parsedUrl.hostname.includes('youtube.com') && parsedUrl.pathname === '/watch') {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) {
        return { isValid: true, type: 'youtube', videoId };
      }
    }

    // YouTube Shorts
    const ytShortsMatch = ytShortsRegex.exec(url);
    if (ytShortsMatch) {
      return { isValid: true, type: 'youtube', videoId: ytShortsMatch[1] };
    }

    // Vimeo
    if (videoRegex.test(url)) {
      return { isValid: true, type: 'video' };
    }

    // Generic iframe
    if (iframeRegex.test(url)) {
      return { isValid: true, type: 'iframe' };
    }
  } catch (err) {
    // Invalid URL
  }

  return { isValid: false, type: null };
};

globalThis.getPsalmsBookName = (chapter) => {
  // const psalmsDivision = [0, 41 , 72, 89, 106, 150];

  let BookNumber = 1;
  if (chapter > 106) {
    BookNumber = 5;
  } else if (chapter > 89) {
    BookNumber = 4;
  } else if (chapter > 72) {
    BookNumber = 3;
  } else if (chapter > 41) {
    BookNumber = 2;
  } else {
    BookNumber = 1;
  }
  return `${BookNumber} Psalms`;
}

globalThis.getPsalmsBookData = (chapter) => {
  // const psalmsDivision = [0, 41 , 72, 89, 106, 150];
  // Define the divisions of the Psalms books and their total verses
  const psalmsBooks = [
    { start: 1, end: 41, totalVerse: 1013 },   // Book 1
    { start: 42, end: 72, totalVerse: 986 },   // Book 2
    { start: 73, end: 89, totalVerse: 478 },   // Book 3
    { start: 90, end: 106, totalVerse: 425 },  // Book 4
    { start: 107, end: 150, totalVerse: 2461 } // Book 5
  ];

  // Determine the book based on the chapter
  const book = psalmsBooks.find((b) => chapter >= b.start && chapter <= b.end);

  // If no book is found (invalid chapter), return null or throw an error
  if (!book) {
    return null; // or throw new Error("Invalid chapter number");
  }

  // Generate API links
  const firstChapterApiLink = `/api/BSB/PSA/${book.start}.json`;
  const lastChapterApiLink = `/api/BSB/PSA/${book.end}.json`;

  // Return the result object
  return {
    startChapter: book.start,
    numberOfChapters: (book.end - book.start + 1),
    totalVerse: book.totalVerse,
    firstChapterApiLink,
    lastChapterApiLink
  };
}

const COPY_OBJECT = (value, seen = new Map()) => {
  // Check for non-objects and null
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Handle Date
  if (value instanceof Date) {
    return new Date(value);
  }

  // Handle RegExp
  if (value instanceof RegExp) {
    return new RegExp(value);
  }

  // Handle Map
  if (value instanceof Map) {
    const copy = new Map();
    value.forEach((val, key) => {
      copy.set(COPY_OBJECT(key, seen), COPY_OBJECT(val, seen));
    });
    return copy;
  }

  // Handle Set
  if (value instanceof Set) {
    const copy = new Set();
    value.forEach((val) => {
      copy.add(COPY_OBJECT(val, seen));
    });
    return copy;
  }

  // Handle circular references
  if (seen.has(value)) {
    return seen.get(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    value.forEach((item, index) => {
      copy[index] = COPY_OBJECT(item, seen);
    });
    return copy;
  }

  // Handle objects
  const copy = {};
  seen.set(value, copy);
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      copy[key] = COPY_OBJECT(value[key], seen);
    }
  }

  return copy;
}

globalThis.CLONE_DATA = COPY_OBJECT;

globalThis.FORMAT_DATE = function formatDate(dateInput, format = "DEFAULT") {
  const monthsFull = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthsShort = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Ensure the input is a valid date string in the format YYYY-MM-DD
  const [yearr, monthh, dayy] = dateInput.split('-').map(ele => Number(ele));
  // const utcTimestamp = Date.UTC(yearr, monthh - 1, dayy); // Month is 0-based
  // const date = new Date(utcTimestamp);
  if (isNaN(dayy)) {
    throw new Error("Invalid date provided.");
  }
  const day = String(dayy).padStart(2, "0"); // Ensures day is two digits
  const month = String(monthh).padStart(2, "0"); // Month is zero-based
  const year = yearr;
  const monthShort = monthsShort[monthh - 1];
  const monthFull = monthsFull[monthh - 1];

  const formats = {
    "DEFAULT": `${monthShort} - ${day} - ${year}`, // Default format
    "YYYY-MM-DD": `${year}-${month}-${day}`,
    "DD-MM-YYYY": `${day}-${month}-${year}`,
    "MM-DD-YYYY": `${month}-${day}-${year}`,
    "YYYY/MM/DD": `${year}/${month}/${day}`,
    "DD/MM/YYYY": `${day}/${month}/${year}`,
    "MM/DD/YYYY": `${month}/${day}/${year}`,
    "YYYY.MM.DD": `${year}.${month}.${day}`,
    "DD.MM.YYYY": `${day}.${month}.${year}`,
    "MM.DD.YYYY": `${month}.${day}.${year}`,
    "MMMM DD, YYYY": `${monthFull} ${day}, ${year}`,
    "DD MMMM YYYY": `${day} ${monthFull} ${year}`,
    "MMM DD, YYYY": `${monthShort} ${day}, ${year}`,
    "DD MMM YYYY": `${day} ${monthShort} ${year}`,
    "YYYYMMDD": `${year}${month}${day}`,
    "DDMMYYYY": `${day}${month}${year}`,
    "MMDDYYYY": `${month}${day}${year}`,
    "MMMM DD": `${monthFull} ${day}`, // Ex: January 15
    "DD MMMM": `${day} ${monthFull}`, // Ex: 15 January
    "MMM DD": `${monthShort} ${day}`, // Ex: Jan 15
    "DD MMM": `${day} ${monthShort}`  // Ex: 15 Jan
  };

  return formats[format] || formats["DEFAULT"];
};

globalThis.FORMAT_YYYY_MM_DD = function formatDateToYYYYMMDD(dateInput) {
  let year, month, day;

  if (dateInput instanceof Date) {
    // If the input is a Date object, extract year, month, and day in UTC
    year = dateInput.getUTCFullYear();
    month = String(dateInput.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-based
    day = String(dateInput.getUTCDate()).padStart(2, "0");
  } else if (typeof dateInput === "string") {
    // If the input is a string, assume it's in YYYY-MM-DD format
    const [yearStr, monthStr, dayStr] = dateInput.split('-');
    year = Number(yearStr);
    month = String(Number(monthStr)).padStart(2, "0"); // Ensure two digits
    day = String(Number(dayStr)).padStart(2, "0"); // Ensure two digits

    // Validate the parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error("Invalid date input: String must be in YYYY-MM-DD format.");
    }
  } else {
    throw new Error("Invalid date input: Expected a Date object or a string in YYYY-MM-DD format.");
  }

  // Return the formatted date
  return `${year}-${month}-${day}`;
};


const prompt = `You are a Bible study assistant. Generate a JSON array representing a Bible playlist based on the theme: $text$. Output only valid JSON. No explanation, no extra text.

📖 Supported content types:

// Verses Single or range
{ "type": "verse", "book": "john", "chapter": 3, "verse": [16], "totalVersesInChapter": 36 }
🧠 Notes:
  - Type Verse Should Always have single chapter + verse property (can be single or array)
// Chapters Single or range
{ "type": "chapter", "book": "psalms", "chapter": [23, 24] }
  - Type chapter Should Always have chapter property can be single or array

// Headings
{
  "type": "heading",
  "content": "Section Title",
}

// External Articles
{
  "type": "iframe"
  "content": "Article Title",
  "link": "https://..."
}

// YouTube Videos
{
  "type": "youtube",
  "content": "Video Title",
 "link": "https://..."
}

✅ Only use realistic, not made-up, links from well-known sources aligned with Protestant Christian orthodoxy (e.g. BibleProject.com, DesiringGod.org, Ligonier.org, TheGospelCoalition.org). Do not invent links. If unsure, omit the link.

---

📅 Reading Plan (ONLY if the prompt mentions a reading plan):
- Add one "type": "date" item for each reading day.
- Start from User Current date if no start date is mentioned.
- If no duration is mentioned, default to 7 days.
- According to Duration The Date Should be Inserted if 10 Days are asked then There should be 10 dates Which is occruing in even order of the content in playlist.

Date format example when asked a reading plan:
{
  "type": "date",
  "date": "2025-04-03"
}

---

🧠 Notes:
- Use UUID for all IDs.
- Use only valid JSON.
- Always return a JSON array []
- Do not include extra text.
- Use correct keys and structure.
- Do NOT include dates unless the prompt asks for a reading plan.
- Include both literal and symbolic references to $text$
- Add Links of youtube or articles when required.
- All Objects i.e. date, links, verse, chapter should be in meaningful order means they should be in order in the array.
- All Links should be valid and replace the link-to texts with valid links.
- Reading plan means having date between the items so delcaring how much content i have to read date wise example: [date-1,verse1,verse2,date-2,verse3,chapter5, ...continued].
- IMPORTANT - If no Starting date is mentioned take Your Current date (Time you are TODAY ) as starting date
- If no end or timeline is mentioned take 7 days as default for reading plan.
- IMPORTANT - Starting TODAY means you need to fetch Your Current date (Time you are TODAY ) and use it instead of any random Date
- IMPORTANT - If in $text$ the reading plan is not mentioned do not include date data types.

Now generate the playlist JSON and include helpful headings and a brief playlist description. REMEMBER TODAY value is ${FORMAT_DATE(FORMAT_YYYY_MM_DD(new Date()))}.`;

globalThis.SYSTEM_PROMPT = prompt;