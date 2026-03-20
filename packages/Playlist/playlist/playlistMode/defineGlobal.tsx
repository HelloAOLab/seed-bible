// scannedURL = new URL(that);
// let targetRecord = scannedURL.searchParams.get("inst");
import { MenuIcon } from "app.components.icons";

const G = globalThis as any;
os.hideLoadingScreen();

const DEV_ENV =
  configBot.tags.pattern === "SeedBibleDev" || !configBot.tags.pattern;

G.DEV_ENV = DEV_ENV;
G.PROD_ENV = !DEV_ENV;

G.MOBILE_VIEWPORT_THRESHOLD = 600;
G.makingPlaylist = false;

G.LoadedPlaylistAnnotations = {};

const storageBot = getBot("system", "storage.tempStorageBot");
if (storageBot) {
  storageBot.defineGlobals();
}

G.ValidTypes = {
  verse: true,
  chapter: true,
  "verse-range": true,
  "chapter-range": true,
  "verse-grouped": true,
  "chapter-grouped": true,
};

setTimeout(async () => {
  const DragDrop = await thisBot.DragDropWithGrouping();
  G.DragDrop = DragDrop;
}, 100);

G.PlaylistModeTypes = {
  playlist: "Playlist",
  annotations: "Annotations",
  project: "Project",
  readingPlan: "ReadingPlan",
};

G.ReadingPlanTypes = {
  DAY: "DAY",
  DATE: "DATE",
};

G.ButtonStyle = {
  cursor: "pointer",
  border: "1px solid grey",
  borderRadius: "40px",
  padding: "6px",
  fontSize: "14px",
  marginLeft: "4px",
};

G.Settings_Icon =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5a87cdff4617c9047e44ec47ddd8a101aa317e2223d83dd40f615e3f9740f03a.svg";

G.CurrentViewerID = null;

G.CheckMultiFuntionHold = () =>
  G?.KEY_HOLD?.["shift"] || G?.KEY_HOLD?.["control"] || G?.KEY_HOLD?.["meta"];

G.Playlist = thisBot;

const bookmarks = await thisBot.getBookmarks();

G.AnnotationsData = {};

thisBot.fetchAnnotationsData({ ...G.CurrentBookData });

let recored = getBot("system", "main.Recorder");

function getBooksDataForMenu(booksLink = false) {
  let formMenuBot = getBot("system", "baseElements.formMenu");
  if (booksLink) {
    formMenuBot.tags["booksLink"] = booksLink;
  }
  let bookPromise = formMenuBot.bookData();
  Promise.resolve(bookPromise)
    .then((data) => {
      if (recored?.tags) {
        recored.tags.menuData = [...data];
      }
      G.BOOKID_DATA = data;
    })
    .catch((e) => {
      // os.toast("something went wrong");
      if (recored?.tags?.menuData) {
        G.BOOKID_DATA = recored.tags.menuData;
      }
    });
}

getBooksDataForMenu();

function findNameRank(
  book1: string,
  book2: string,
  returnRanks = false,
  isFindByRank = false
) {
  const nameRanks: any = {};

  let totalBooksCount = 0;
  let totalSectionCount = 0;

  // Iterate over each testament
  thisBot.tags.bibleArrangementsArray[0].forEach((testament: any) => {
    // Iterate over sections in the testament
    const sectionKeys = Object.keys(testament.sections);
    totalSectionCount += sectionKeys.length;
    Object.values(testament.sections).forEach(
      (section: any, sectionIndex: number) => {
        totalBooksCount += section.length;
        // Iterate over books in the section
        section.forEach((book: any, index: number) => {
          const commonName = book.commonName;
          // Check if the book's common name matches either of the provided names
          // if (commonName.toLowerCase() === book1.toLowerCase() || commonName.toLowerCase() === book2.toLowerCase()) {
          // Calculate the rank relative to the entire list of books
          const rank = totalBooksCount - (section.length - index);
          // Update rank and testament information for the matching name
          const key = isFindByRank ? rank : commonName;
          if (!nameRanks[key]) {
            nameRanks[key] = {
              rank: 0,
              testament: [],
              sectionRank: 0,
              section: "",
            };
          }
          nameRanks[key].rank = rank;
          nameRanks[key].commonName = commonName;
          nameRanks[key].testament = testament.name;
          nameRanks[key].sectionRank =
            totalSectionCount - (sectionKeys.length - sectionIndex);
          nameRanks[key].section = sectionKeys[sectionIndex];
          nameRanks[key].chapters = book.numberOfChapters;
          nameRanks[key].startingIndex = book.startingIndex;
          // }
        });
      }
    );
  });

  if (returnRanks) return nameRanks;

  if (!book2) {
    return {
      rank: nameRanks[book1]?.rank,
      testament: nameRanks[book1]?.testament,
      section: nameRanks[book1]?.section,
      chapters: nameRanks[book1]?.chapters,
    };
  }
  return {
    [book1]: {
      rank: nameRanks[book1]?.rank,
      testament: nameRanks[book1]?.testament,
      chapters: nameRanks[book1]?.chapters,
    },
    [book2]: {
      rank: nameRanks[book2]?.rank,
      testament: nameRanks[book2]?.testament,
      chapters: nameRanks[book2]?.chapters,
    },
  };
}

G.findNameRank = findNameRank;

function getSectionRanking() {
  const nameRanks: any = {};

  let totalSectionCount = 0;

  // Iterate over each testament
  thisBot.tags.bibleArrangementsArray[0].forEach((testament: any) => {
    // Iterate over sections in the testament
    const sectionKeys = Object.keys(testament.sections);
    totalSectionCount += sectionKeys.length;

    Object.values(testament.sections).forEach(
      (section: any, sectionIndex: number) => {
        const sectionName: any = sectionKeys[sectionIndex];
        if (!nameRanks[sectionName]) {
          nameRanks[sectionName] = { sectionRank: 0, section: "" };
        }
        nameRanks[sectionName].sectionRank =
          totalSectionCount - (sectionKeys.length - sectionIndex);
        nameRanks[sectionName].section = sectionName;
        nameRanks[sectionName].testament = testament.name;
      }
    );
  });

  return nameRanks;
}
G.getSectionRanking = getSectionRanking;

const SELECTIONTYPE = {
  TESTAMENT: "TESTAMENT",
  SECTION: "SECTION",
  BOOK: "BOOK",
};
G.SELECTIONTYPE = SELECTIONTYPE;

function getSectionBookRage(sectionRank: number) {
  let startIdx = 0;
  let endIdx = 0;
  let totalBooks = 0;

  let totalSectionCount = 0;

  // Iterate over each testament
  thisBot.tags.bibleArrangementsArray[0].forEach((testament: any) => {
    // Iterate over sections in the testament
    const sectionKeys = Object.keys(testament.sections);
    totalSectionCount += sectionKeys.length;
    Object.values(testament.sections).forEach(
      (section: any, sectionIndex: number) => {
        const rank = totalSectionCount - (sectionKeys.length - sectionIndex);
        if (sectionRank === rank) {
          startIdx = totalBooks;
          endIdx = totalBooks + section.length - 1;
        }
        totalBooks += section.length;
      }
    );
  });

  return [startIdx, endIdx];
}

G.getSectionBookRage = getSectionBookRage;

G.IMGS = {
  AOLABSRC:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/dc29f5accefe0b99744180cce15d27f2aadb4953f75912e736501bb632e64845.png",
};

G.CONSTANTS = {
  YT_PREFIX: "https://www.youtube.com/embed",
  BOT_TYPE: {
    TESTAMENT: "testament",
    SECTION: "section",
    BOOK: "book",
  },
};

G.objectComparator = (
  firstData: any,
  secondData: any,
  keysComparator: string[] = []
) => {
  if (!secondData) return false;
  if (keysComparator.length > 0) {
    return keysComparator.some((key) => {
      return firstData[key] === secondData[key];
    });
  }
  let isSame = true;
  Object.keys(firstData).forEach((key) => {
    if (typeof firstData[key] !== "object") {
      isSame = isSame && firstData[key] === secondData[key];
    } else {
      isSame = G.objectComparator(firstData[key], secondData[key]);
    }
  });
  if (isSame) {
    console.log("Last item was somehow same!");
  }
  return isSame;
};

G.createUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

G.pseudoIndentifier = `pseudo-`;

G.playListDB = [];

// Regex Testing
G.isValidGoogleSheetsUrl = (url: string) => {
  const regex =
    /https:\/\/docs\.google\.com\/spreadsheets\/(?:u\/\d\/)?d\/[a-zA-Z0-9-_]+\/(?:edit|htmlview)(?:\?[^#]*)?(?:#gid=\d+)?$/;
  return regex.test(url);
};

G.extractIdFromUrl = (url: string) => {
  const regex =
    /https:\/\/docs\.google\.com\/spreadsheets(?:\/u\/\d+)?\/d\/([^\/]+)\/(?:edit|htmlview)/;
  const match = url.match(regex);
  return match && match[1];
};

G.validateUrl = (url: string) => {
  const videoRegex =
    /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/)|https?:\/\/.*\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv|m4v)(?:\?|$)/i;
  const ytShortsRegex =
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;
  const iframeRegex = /^https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/?.*/;
  const youtubeRegex =
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i;

  try {
    const parsedUrl = new URL(url);

    // YouTube watch?v= case
    if (
      parsedUrl.hostname.includes("youtube.com") &&
      parsedUrl.pathname === "/watch"
    ) {
      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return { isValid: true, type: "youtube", videoId };
      }
    }

    const match = youtubeRegex.exec(url);
    if (match) {
      return {
        isValid: true,
        type: "youtube",
        videoId: match[1],
      };
    }

    // YouTube Shorts
    const ytShortsMatch = ytShortsRegex.exec(url);
    if (ytShortsMatch) {
      return { isValid: true, type: "youtube", videoId: ytShortsMatch[1] };
    }

    // Vimeo
    if (videoRegex.test(url)) {
      return { isValid: true, type: "video" };
    }

    // Generic iframe
    if (iframeRegex.test(url)) {
      return { isValid: true, type: "externalLink" };
    }
  } catch (err) {
    // Invalid URL
  }

  return { isValid: false, type: null };
};

G.validateImage = (url: string) => {
  const imageRegex =
    /^https?:\/\/.*\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff?|ico)(?:\?|#|$)/i;

  try {
    const match: any = imageRegex.exec(url);
    if (match) {
      return {
        isValid: true,
        type: "image",
        extension: match[1].toLowerCase(),
      };
    }
  } catch (err) {
    // invalid URL
  }

  return { isValid: false, type: null };
};

G.generateEmbedFromUrl = (url: string, name: string = "") => {
  if (!url) return null;

  const result = G.validateUrl(url); // your global function

  if (!result.isValid) {
    const imageResult = G.validateImage(url);
    if (imageResult.isValid) {
      return `
        <img src="${url}" alt="${name}" />
      `;
    }
    return null;
  }

  // ✅ YouTube embed
  if (result.type === "youtube") {
    const videoId = result.videoId;

    return `<iframe
          src="${G.CONSTANTS.YT_PREFIX}/${videoId}"
          style="max-width: 100%;"
          height="auto"
          title="${name}"
          allow="accelerometer;encrypted-media;gyroscope;"
        ></iframe>`;
  }

  // ✅ Vimeo or generic video
  if (result.type === "video") {
    return `
      <video 
        src="${url}" 
        title="${name}"
        controls 
        height="100%"
        style="max-width: 100%;"
      ></video>
    `;
  }

  // ✅ External link (open in new tab)
  if (result.type === "externalLink") {
    return `
      <a 
        href="${url}" 
        target="_blank" 
        rel="noopener noreferrer"
        style="color: blue; text-decoration: underline; cursor: pointer;"
      >
        ${name || url}
      </a>
    `;
  }

  return null;
};

G.appendImageToEditorHTML = function appendImageToEditorHTML(fileObject: any) {
  const imageExtensions = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;

  const link = fileObject?.additionalInfo?.link;
  const filename = fileObject?.content;

  // If not a valid image file, return original HTML
  if (!link || !imageExtensions.test(filename)) {
    return `File ref: <a href="${link}" target="_blank" rel="noopener noreferrer">${filename}</a>`;
  }

  // Create image HTML
  const imageHTML = `
    <img 
      src="${link}" 
      alt="${filename}" 
      class="sre-image"
    />
  `;

  return imageHTML;
};

G.uploadFilesReusable = async function uploadFilesReusable(params: any) {
  const { files } = params;
  const filesPromises: any[] = [];

  files.forEach((file: any) => {
    filesPromises.push(
      os.recordFile(G.RECORD_STOREKEY, file, {
        name: file.name,
        mimeType: file.mimeType,
      })
    );
  });

  try {
    let failCount = 0;
    const fileSave = await Promise.all(filesPromises);
    const filesResult: any[] = [];

    fileSave.forEach(({ success, url, existingFileUrl, errorCode }, index) => {
      if (!success && errorCode !== "file_already_exists") {
        failCount++;
        return;
      }

      filesResult.push({
        content: files[index].name,
        id: G.createUUID(),
        additionalInfo: {
          link: url || existingFileUrl,
          mimeType: files[index].mimeType,
          type: "file",
          isValid: true,
        },
        type: "attachment-link",
      });
    });

    if (failCount > 0) {
      ShowNotification({
        message: "Failed to upload some Files!",
        severity: "error",
      });
    }

    return filesResult;
  } catch (error) {
    console.log(error);

    ShowNotification({
      message: "File upload failed!",
      severity: "error",
    });

    return [];
  }
};

G.getPsalmsBookName = (chapter: number) => {
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
};

G.getPsalmsBookData = (chapter: number) => {
  // const psalmsDivision = [0, 41 , 72, 89, 106, 150];
  // Define the divisions of the Psalms books and their total verses
  const psalmsBooks = [
    { start: 1, end: 41, totalVerse: 1013 }, // Book 1
    { start: 42, end: 72, totalVerse: 986 }, // Book 2
    { start: 73, end: 89, totalVerse: 478 }, // Book 3
    { start: 90, end: 106, totalVerse: 425 }, // Book 4
    { start: 107, end: 150, totalVerse: 2461 }, // Book 5
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
    numberOfChapters: book.end - book.start + 1,
    totalVerse: book.totalVerse,
    firstChapterApiLink,
    lastChapterApiLink,
  };
};

const COPY_OBJECT = (value: any, seen: Map<any, any> = new Map()) => {
  // Check for non-objects and null
  if (value === null || typeof value !== "object") {
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
    const copy: any[] = [];
    seen.set(value, copy);
    value.forEach((item, index) => {
      copy[index] = COPY_OBJECT(item, seen);
    });
    return copy;
  }

  // Handle objects
  const copy: any = {};
  seen.set(value, copy);
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      copy[key] = COPY_OBJECT(value[key], seen);
    }
  }

  return copy;
};

G.CLONE_DATA = COPY_OBJECT;

G.FORMAT_DATE = function formatDate(
  dateInput: string,
  format = "DEFAULT",
  inputFormat = "YYYY-MM-DD"
) {
  const monthsFull = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthsShort = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Ensure the input is a valid date string in the format YYYY-MM-DD
  let [yearr, monthh, dayy]: any = dateInput
    .split("-")
    .map((ele: string) => Number(ele));

  if (inputFormat === "MM-DD-YYYY") {
    [monthh, dayy, yearr] = dateInput
      .split("-")
      .map((ele: string) => Number(ele));
  }
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

  const formats: any = {
    DEFAULT: `${monthShort} - ${day} - ${year}`, // Default format
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
    YYYYMMDD: `${year}${month}${day}`,
    DDMMYYYY: `${day}${month}${year}`,
    MMDDYYYY: `${month}${day}${year}`,
    "MMMM DD": `${monthFull} ${day}`, // Ex: January 15
    "DD MMMM": `${day} ${monthFull}`, // Ex: 15 January
    "MMM DD": `${monthShort} ${day}`, // Ex: Jan 15
    "DD MMM": `${day} ${monthShort}`, // Ex: 15 Jan
  };

  return formats[format] || formats["DEFAULT"];
};

G.FORMAT_YYYY_MM_DD = function formatDateToYYYYMMDD(dateInput: any) {
  let year: any, month: any, day: any;

  if (dateInput instanceof Date) {
    // If the input is a Date object, extract year, month, and day in UTC
    year = dateInput.getUTCFullYear();
    month = String(dateInput.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-based
    day = String(dateInput.getUTCDate()).padStart(2, "0");
  } else if (typeof dateInput === "string") {
    // If the input is a string, assume it's in YYYY-MM-DD format
    const [yearStr, monthStr, dayStr] = dateInput.split("-");
    year = Number(yearStr);
    month = String(Number(monthStr)).padStart(2, "0"); // Ensure two digits
    day = String(Number(dayStr)).padStart(2, "0"); // Ensure two digits

    // Validate the parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error(
        "Invalid date input: String must be in YYYY-MM-DD format."
      );
    }
  } else {
    throw new Error(
      "Invalid date input: Expected a Date object or a string in YYYY-MM-DD format."
    );
  }

  // Return the formatted date
  return `${year}-${month}-${day}`;
};

const prompt = `
  You are generating a Bible playlist for a user who is already inside the Seed Bible running within CasualOS. The playlist JSON will be consumed by the app to:
  - navigate directly to scripture (book / chapter / verse or ranges),
  - open videos/articles in a modal above the scripture view,
  - optionally schedule a day-by-day reading plan.

  OUTPUT RULES
  - Output ONLY a valid JSON array (no extra text).
  - Every item MUST include a unique "id" (UUID v4).
  - Use ONLY the allowed object types and shapes below.
  - Use lowercase book names.
  - Maintain the array’s reading order; dates (if any) interleave with content items.
  - Never include keys not defined here.

  ALLOWED ITEM TYPES
  1) Verse (single chapter only; verse may be single or array; include totalVersesInChapter ONLY if certain)
  {
    "id": "uuid",
    "type": "verse",
    "book": "john",
    "chapter": 3,
    "verse": [16],
    "totalVersesInChapter": 36
  }

  2) Chapter (single chapter or array range)
  {
    "id": "uuid",
    "type": "chapter",
    "book": "psalms",
    "chapter": [23, 24]
  }

  3) Heading
  {
    "id": "uuid",
    "type": "heading",
    "content": "Section Title"
  }

  4) External Article
  {
    "id": "uuid",
    "type": "iframe",
    "content": "Article Title",
    "link": "https://..."
  }

  5) YouTube Video
  {
    "id": "uuid",
    "type": "youtube",
    "content": "Video Title",
    "link": "https://..."
  }

  LINK VALIDITY RULES
  - Never invent or guess a URL. 
  - Only include links if you are certain they are real and stable.
  - YouTube links must include a valid 11-character video ID. Do not fabricate IDs.
  - Articles must be from trustworthy, orthodox-aligned Christian sources (affirming Jesus is God, the authority of Scripture, and creation of humanity male and female).
  - If you are unsure about a link, omit it entirely.
  - Do not use placeholder links (e.g., “link-to”), shortened links, or non-existent pages.

  MEDIA PRIORITY
  - Scripture + headings must form the backbone of the playlist, guiding the user step by step. 
  - After Scripture, include YouTube videos where appropriate. 
  - Use videos sparingly, since they are prone to invalid URLs. Only include them if you are confident the link is correct. 
  - Articles are a last resort, used only if a video is not available or does not cover the point concisely.

  HEADING + SCRIPTURE RULES
  - Headings must never appear consecutively.
  - Each heading must introduce a meaningful section by being followed immediately by:
    (a) at least 2–3 verse items, OR
    (b) a single passage range of 5 or more verses.
  - Headings without substantive Scripture beneath them are invalid.
  - Scripture and headings together form the backbone of the playlist.

  SCRIPTURE DENSITY AND FLOW
  - Scripture should do the primary work of answering the theme.
  - Each heading section must normally contain 2–4 Scripture items (or one extended passage of 5+ verses).
  - Aim for playlists that are about 50% longer than a minimal outline, using more Scripture to reinforce the theme without drifting into unrelated material.
  - Structure the playlist as a logical train of thought: each heading introduces a key point, and the verses beneath reinforce that point. The user should be able to follow the flow of Scripture to reach reflection and conclusion.
  - External media (videos, then articles) may supplement but must remain clearly secondary to Scripture.

  SCRIPTURE BREADTH
  - Include passages from both Old and New Testaments when they naturally reinforce the theme.
  - Do not force OT/NT balance if the question context clearly points to one Testament.

  READING PLAN (ONLY IF REQUESTED IN THE THEME TEXT)
  - If the user mentions a reading plan, add one object with "type":"date" for EACH day.
  - Date format: "YYYY-MM-DD".
  - Start on $today if no start date is provided.
  - If no duration is given, default to 7 days.
  - Dates must interleave with content in chronological order, e.g. [date-1, item-1, item-2, date-2, item-3, ...].
  Example:
  { "id": "uuid", "type": "date", "date": "2025-09-30" }

  VALIDATION CHECKLIST
  - JSON array [] only.
  - All objects have "id" (UUID v4) and valid "type".
  - For "verse": single chapter, valid verse(s).
  - For "chapter": valid chapter number(s).
  - For "youtube"/"iframe": links only if real, valid, and orthodox-aligned.
  - No consecutive headings.
  - Each heading must be followed by 2–3 verses or a passage range of 5+ verses.
  - Playlists should be ~50% longer than minimal outlines by including additional reinforcing Scripture.
  - No commentary outside JSON.

  RUNTIME CONTEXT VARIABLES
  - $today = "2025-09-30"  ← use this when a reading plan is requested and no start date is given.

  NOW DO THIS
  Generate the playlist JSON array for the theme "$text". Include:
  - a heading with the playlist title,
  - a heading with a one-sentence description,
  - then scripture and items,
  - and, IF AND ONLY IF a reading plan is mentioned in $text, interleave date items per the rules above starting on $today (or the provided start date).

  Only valid JSON. No explanation.
  REMEMBER TODAY value is ${G.FORMAT_DATE(G.FORMAT_YYYY_MM_DD(new Date()))}.
`;

G.SYSTEM_PROMPT = prompt;

const getPosition = () => {
  if (G.LastClickX) {
    const left = G.LastClickX;
    const top = G.LastClickY;
    G.LastClickX = null;
    G.LastClickY = null;
    return {
      left: 0,
      transform: "translate(40px, 0px)",
      top,
    };
  }

  const pointerX = gridPortalBot.tags.pointerPixelX;
  const pointerY = gridPortalBot.tags.pointerPixelY;
  const height = gridPortalBot.tags.pixelHeight;
  const width = window?.innerWidth || gridPortalBot.tags.pixelWidth;

  const edgeThreshold = 200; // Distance from edges to adjust position
  const safeMargin = "2rem"; // Fixed margin when near edges

  let position: any = {};

  // Horizontal positioning
  if (width - pointerX < edgeThreshold) {
    position.right = `-11rem`;
  } else if (pointerX < edgeThreshold) {
    position.left = "2rem";
  } else {
    position.left = `16rem`;
  }

  // Vertical positioning
  if (height - pointerY < edgeThreshold) {
    position.bottom = `5rem`;
  } else if (pointerY < edgeThreshold) {
    position.top = safeMargin;
  } else {
    position.top = `${parseInt(pointerY) - 80}px`;
  }

  return position;
};

const SIMPLE_FILE =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/e5ed7d7a064b801e4954efa40ad5929ee771614fc5cd4d71c9dd8669c77bdb25.png";
const PDF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5eedb987a0d26a60527854460e67bb0762de152f45b5be580de5aa21e524d309.png";
const MUSIC =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/77bf95a198202b6ba29fb46b377212904ae4b16d4a988bce238645e662e08d83.png";
const VIDEO =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/6f842b8a792a1588d7b96c9c406c2bfff36aec7fdab2519eebb7b08bd3dc427a.png";

function getFileIconByMimeType(mimeType: string) {
  if (!mimeType || typeof mimeType !== "string") return SIMPLE_FILE;

  if (mimeType === "application/pdf") return PDF;
  if (mimeType.startsWith("audio/")) return MUSIC;
  if (mimeType.startsWith("video/") || mimeType.startsWith("image/"))
    return VIDEO;

  return SIMPLE_FILE;
}

function getExtensionFromMimeType(mimeType: string) {
  const mimeMap: any = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/zip": "zip",
    "application/json": "json",
    "text/plain": "txt",
    "text/html": "html",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "video/x-msvideo": "avi",
    // Add more as needed
  };

  return mimeMap[mimeType] || "file";
}

G.getFileIconByMimeType = getFileIconByMimeType;
G.getExtensionFromMimeType = getExtensionFromMimeType;

G.getPosition = getPosition;

const getColor = (index: number, total: number) => {
  const startColor = [255, 0, 127]; // Pink
  const endColor: any = [255, 165, 0]; // Orange

  const interpolate = (start: number, end: number, factor: number) =>
    Math.round(start + (end - start) * factor);

  const factor = index / (total - 1);
  const color = startColor.map((start, i) =>
    interpolate(start, endColor[i], factor)
  );

  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
};

G.GetColor = getColor;

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v|mkv|avi|wmv|flv)$/i.test(url);
}

const videoTypes: any = {
  "video-recording": true,
  youtube: true,
  Video: true,
  video: true,
};

function isVideoAttachment(dataitem: any) {
  let isVideoType = false;
  if (!dataitem?.additionalInfo) return isVideoType;

  const link = dataitem.additionalInfo.link;
  if (videoTypes[dataitem.additionalInfo.type]) {
    isVideoType = true;
  }
  if (dataitem.additionalInfo.type === "iframe") {
    const isVideo = G.IsVideoUrl(link);
    isVideoType = isVideo;
  }
  return isVideoType;
}

G.IsVideoAttachment = isVideoAttachment;

G.IsVideoUrl = isVideoUrl;

function formatRelativeTime(date: any) {
  let dateObj = date;
  if (!dateObj) return "";
  if (typeof dateObj === "number") {
    dateObj = new Date(dateObj);
  }
  if (typeof dateObj === "string") {
    dateObj = new Date(dateObj);
  }
  const now: any = new Date();
  const diffMs: any = now - dateObj;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  // Just now (less than 60 sec)
  if (diffSec < 60) {
    return diffSec <= 5 ? "just now" : `${diffSec} sec ago`;
  }

  // Few minutes ago (< 5 min)
  if (diffMin < 5) {
    return "few mins ago";
  }

  // Within the hour
  if (diffMin < 60) {
    return `${diffMin} mins ago`;
  }

  // Same day (show "X hrs ago" if today)
  if (
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear()
  ) {
    return `${diffHrs} hrs ago`;
  }

  // Yesterday
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  ) {
    return `yesterday ${dateObj.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  // Older → show like "Sep/9 6:55 AM"
  return dateObj.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

G.FormatRelativeTime = formatRelativeTime;

const AnnotationIcon = ({ className = "img-icon-secondary" }) => {
  return (
    <MenuIcon
      size={16}
      className={className}
      name="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/5ea6369f9a126d9dd02e97b915f210ee6f421fdeb47b143d5fc359ee17131ea5.svg"
    />
  );
};

const PlaylistIcon = ({ className = "img-icon-secondary" }) => {
  return (
    <MenuIcon
      size={16}
      className={className}
      name="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/72d4f7e1cb9d646e08c96c9752de4914840e40b85e23d879658286a2a685d595.svg"
    />
  );
};

const ReadingPlanIcon = ({ className = "img-icon" }) => {
  return (
    <MenuIcon
      size={16}
      className={className}
      name="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/1a434287-4a50-4122-a7e9-f3c02382f7a6/bdff110837660763e5be50768941d4ef9a40c9995457d5c4556001d824332871.png"
    />
  );
};

G.AnnotationIcon = AnnotationIcon;
G.PlaylistIcon = PlaylistIcon;
G.ReadingPlanIcon = ReadingPlanIcon;

const getVerseSummaryHeading = (verses: number[]) => {
  const ranges = [];
  let start = verses[0];
  let end: any = verses[0];

  if (verses.length > 1) {
    for (let i = 1; i < verses.length; i++) {
      if (verses[i] === end + 1) {
        end = verses[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = verses[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  } else {
    ranges.push(verses[0]);
  }
  return ranges;
};

G.GetVerseSummaryHeading = getVerseSummaryHeading;

thisBot.getLabel();

function sanitizeString(str: string) {
  // console.log("SANITIZE DONE", str);
  // Remove control characters (U+0000 to U+001F, excluding \t, \n, \r)
  if (typeof str === "string") {
    return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  }
  return str;
}

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj && typeof obj === "object") {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      acc[key] = sanitizeObject(obj[key]);
      return acc;
    }, {});
  }
  return obj; // Return other types (numbers, booleans, etc.) unchanged
}

G.sanitizeObject = sanitizeObject;

G.RECORD_SEPARATOR = "^_^";

const sortFunc = (a: any, b: any) => {
  const parseHeading = (heading = "") => {
    // 1️⃣ Chapter always first
    if (heading.startsWith("Chapter")) {
      return { group: 0, start: 0, length: heading.length };
    }

    // 2️⃣ Verse logic
    const match = heading.match(/Verse\s*(\d+)/);
    if (match) {
      return {
        group: 1,
        start: Number(match[1]), // starting verse
        length: heading.length,
      };
    }

    // 3️⃣ Everything else
    return {
      group: 2,
      start: Infinity,
      length: heading.length,
    };
  };

  const A = parseHeading(a.heading);
  const B = parseHeading(b.heading);

  // Group order: Chapter → Verse → Others
  if (A.group !== B.group) {
    return A.group - B.group;
  }

  // Verse number comparison
  if (A.start !== B.start) {
    return A.start - B.start;
  }

  // Length comparison (shorter first)
  if (A.length !== B.length) {
    return B.length - A.length;
  }

  // Final fallback
  return a.heading.localeCompare(b.heading);
};

G.AnnotationSortFunction = sortFunc;

G.FloatBarStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  backgroundColor: "var(--panelBackground)",
  padding: "0.5rem",
};

G.PlayingPlaylistCheckedItems = {};

const updateCheckedItemsPlayingPlaylist = async (
  checkedItems: any,
  id: string
) => {
  if (!G.PlayingPlaylistCheckedItems) {
    G.PlayingPlaylistCheckedItems = {};
  }
  if (!G.PlayingPlaylistCheckedItems[id]) {
    G.PlayingPlaylistCheckedItems[id] = {};
  }
  if (!id) {
    return;
  }
  G.PlayingPlaylistCheckedItems[id] = { ...checkedItems };
  if (authBot?.id) {
    await os.recordData(
      authBot.id,
      "userCheckedItems",
      { userCheckedItems: { ...G.PlayingPlaylistCheckedItems } },
      {
        marker: "userCheckedItems",
      }
    );
  }
};

const userCheckedItems: any = authBot?.id
  ? await os.getData(authBot.id, "userCheckedItems")
  : {};
G.PlayingPlaylistCheckedItems = {
  ...(userCheckedItems?.data?.userCheckedItems || {}),
};

G.UpdateCheckedItemsPlayingPlaylist = updateCheckedItemsPlayingPlaylist;
