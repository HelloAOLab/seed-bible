async function fetchDataFromGoogleSheet(sheetLink) {
    // Extract the sheet ID from the URL
    const sheetID = extractSheetID(sheetLink);

    // Construct the URL to fetch the CSV
    const csvURL = `https://docs.google.com/spreadsheets/d/${sheetID}/export?format=csv`;

    try {
        // Fetch the CSV data
        const response = await web.get(csvURL);
        return parseCSVToArray(response.data)
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function parseCSVToArray(csvData) {
    // Split CSV data into rows
    const rows = csvData.split('\n');

    // Initialize array to store parsed data
    const dataArray = [];

    // Iterate over rows
    rows.forEach(row => {
        // Split row into columns
        const columns = row.split(',');

        // Add columns to data array
        dataArray.push(columns);
    });

    return dataArray;
}

function parseBibleReference(reference) {
    const parts = reference.split(" ");
    const book = parts[0];
    const chapterVerse = parts[1].split(":");
    const chapter = parseInt(chapterVerse[0]);
    const verses = chapterVerse[1].split("-");
    const startVerse = parseInt(verses[0]);
    const endVerse = verses.length > 1 ? parseInt(verses[1]) : startVerse;

    return {
        book: book,
        chapter: chapter,
        startVerse: startVerse,
        endVerse: endVerse
    };
}

function extractSheetID(sheetLink) {
    // Extract the sheet ID from the link
    const match = sheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    } else {
        throw new Error('Invalid Google Sheet link');
    }
}

// Usage
const googleSheetLink = "https://docs.google.com/spreadsheets/d/1ipQNHrwBCuNYqc_0LXmjuz9PggVcxmhz/edit#gid=1465603282";
return fetchDataFromGoogleSheet(googleSheetLink);
