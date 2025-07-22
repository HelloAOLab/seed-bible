const text = that.text;
const promptSystem = that.prompt || null;

const prompt = `${promptSystem || globalThis.SYSTEM_PROMPT}`.replace(/\$text\$/g, text) + `
---

📌 Playlist must begin with 4 metadata items:
1. { "type": "playlist-name", "content": "Your Playlist Title" }
2. { "type": "playlist-color", "content": "#D364338A" } // Choose from: ['#FFFFFF', '#D9D9D9', '#D364338A', '#13998196', '#9B44F326', '#97B197']
3. { "type": "playlist-icon", "content": "video_library" } // Choose from: ['subscriptions', 'smart_display', 'video_library', 'slow_motion_video', 'play_lesson', 'auto_read_play']
4. { "type": "playlist-description", "content": "A short description of the playlist" }

---

`;

function extractJsonFromString(inputString, tries = 1) {
    // Use regex to find JSON array in the input string
    const jsonTakenOut = inputString.match(/\[\s*\{[\s\S]*\}\s*\]/);

    const jsonMatch = tries === 2 ? [inputString] : jsonTakenOut?.[0] ? jsonTakenOut : [inputString];

    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]); // Parse and return JSON object
        } catch (error) {
            if (tries === 1) {
                console.log("FAILED: RETRYING", jsonMatch);
                return extractJsonFromString(JSON.stringify(jsonMatch[0]), 2);
            }
            console.error("Invalid JSON format:", error);
            return null;
        }
    } else {
        console.error("No JSON found in the input string.");
        return null;
    }
};


console.log("CALLING GPT4", text);
let myChat = await ai.chat(prompt, { preferredModel: 'gpt-4o' });
console.log("myChat", myChat);
const results = extractJsonFromString(myChat);

console.log("CALLING GPT4 SUCCESS", results);


const booksObject = globalThis.BOOKID_DATA.reduce((acc, book) => {
    acc[book.name.toLowerCase()] = { ...book };
    return acc;
}, {});

if (!Array.isArray(results)) {
    throw new Error("Result JSON was not able to convert to array!");
}

// Generate me Playlist of roman roads and add some links and required heading too from articles online or youtube.

let suggestedName = null;
let suggestedIcon = null;
let suggestedColor = null;
let suggestedDescription = null;

const { allItems, badData } = thisBot.ConvertDataType({ results });

if (badData) {
    console.error("Founded wrong format! Send Logs to Kushagra!");
    os.toast("Founded wrong format! Send Logs to Kushagra!");
}

console.log("allItems", allItems);

return {
    suggestedName,
    allItems,
    suggestedColor,
    suggestedIcon,
    suggestedDescription
};