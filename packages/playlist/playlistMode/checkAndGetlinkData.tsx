// Map of book abbreviations to full names
const booksMap = thisBot.tags.abbrevations;

// Normalize ordinals like "1st", "first" to "1"
const normalizeOrdinals = (input) => {
    return input.replace(/\b(first|1st)\b/i, "1")
        .replace(/\b(second|2nd)\b/i, "2")
        .replace(/\b(third|3rd)\b/i, "3")
        .replace(/\b(fourth|4th)\b/i, "4")
        .replace(/\b(fifth|5th)\b/i, "5")
        .replace(/\b(sixth|6th)\b/i, "6")
        .replace(/\b(seventh|7th)\b/i, "7")
        .replace(/\b(eighth|8th)\b/i, "8")
        .replace(/\b(ninth|9th)\b/i, "9")
        .replace(/\b(tenth|10th)\b/i, "10");
};

// Check if a string is a valid number
const isNumeric = (str) => !isNaN(str);

// Valid file extensions
const validExtensions = [".mp3", ".txt"];

// Function to remove the file extension
const getNameWithoutExtension = (filename) => {
    const regex = new RegExp(`(${validExtensions.map(ext => `\\${ext}`).join("|")})$`);
    return filename.replace(regex, "");
};

// Function to parse the filename
function parseBibleReference(filename) {
    const result = [];

    // Remove file extension
    const nameWithoutExt = getNameWithoutExtension(filename);

    // Normalize ordinals in the book name
    const normalizedFilename = normalizeOrdinals(nameWithoutExt);

    // Split by commas for multiple books
    const parts = normalizedFilename.split(",");

    parts.forEach((part) => {
        // Handle multiple possible separators: . (dot), _ (underscore), : (colon), space
        let spaceParts = part.trim().split(/[\s\._:]+/); // Allows any of the separators to act

        let bookPart = spaceParts[0].toLowerCase();
        let chapterPart = spaceParts[1] ? spaceParts[1].trim() : null;
        let versePart = spaceParts[2] ? spaceParts[2].trim() : null;

        // If the first part is numeric, it's likely an ordinal book (e.g., "1 John")
        if (isNumeric(bookPart) && spaceParts[1]) {
            bookPart += " " + spaceParts[1].toLowerCase();
            chapterPart = spaceParts[2] ? spaceParts[2].trim() : null;
            versePart = spaceParts[3] ? spaceParts[3].trim() : null;
        } else if (!chapterPart && isNumeric(spaceParts[1])) {
            // If the second part is numeric, it’s likely a chapter number (e.g., "1st John 1")
            chapterPart = spaceParts[1];
        }

        // Match book abbreviation/full name to booksMap
        let bookName = booksMap[bookPart] || booksMap[bookPart.replace(/\s+/g, "")];

        if (!bookName) return null;

        // Handle testaments and sections
        const testaments = ["old testament", "new testament"];
        const sections = ["law", "history", "wisdom", "prophets", "gospels", "paul letters", "letters"];

        if (testaments.includes(bookName)) {
            return;
            result.push({ type: "testament", testament: bookName, shortAbr: bookPart });
        }

        if (sections.includes(bookName)) {
            return;
            result.push({ type: "section", section: bookName, shortAbr: bookPart });
        }

        // Handle chapters and verses
        if (chapterPart) {

            const chapter = chapterPart.split("-");


            let tempBookName = false;

            if (bookName.includes("psalms")) {
                tempBookName = getPsalmsBookName(chapter || 1).toLocaleLowerCase();
                bookName = 'psalms';
            }

            const chapterStart = parseInt(chapter[0], 10);
            const chapterEnd = chapter.length > 1 ? parseInt(chapter[1], 10) : chapterStart;
            const chapters = Array.from({ length: chapterEnd - chapterStart + 1 }, (v, i) => chapterStart + i);

            // Handle verse part: treat it as a range if provided
            if (versePart) {
                const verseRange = versePart.split("-");
                const verseStart = parseInt(verseRange[0], 10);
                const verseEnd = verseRange.length > 1 ? parseInt(verseRange[1], 10) : verseStart;
                const verses = Array.from({ length: verseEnd - verseStart + 1 }, (v, i) => verseStart + i);

                result.push({
                    type: "verse",
                    book: bookName,
                    chapter: chapters[0],  // Only first chapter when there's a single chapter
                    verse: verses,
                    shortAbr: bookPart,
                    totalVerseInChapter: thisBot.tags.verseChapterBookMap[tempBookName || bookName][chapters[0]]
                });
            } else {
                // If no verse part, return chapters
                result.push({ type: "chapter", book: bookName, chapter: chapters, shortAbr: bookPart });
            }
        } else {
            // If no chapter part, treat as book only
            result.push({ type: "book", book: bookName, shortAbr: bookPart });
        }
    });

    return result;
}

// Example Usage
const parsedData = parseBibleReference(that.fileName || "first john");

return parsedData;