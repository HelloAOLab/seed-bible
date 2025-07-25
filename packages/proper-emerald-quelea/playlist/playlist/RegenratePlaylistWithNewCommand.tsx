const command = that.command;
const oldData = that.oldData;

const prompt = `
    Use The Old Data Reference Below
    '''
    OLD DATA BELOW
    ${oldData}
    OLD DATA ENDED
    '''

    VALID JSON TYPE REFERENCES

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

    Use the command below to Regenrate The Playlist again according to USERINPUT

    USERINPUT = ${command}

    🧠 Notes:
        - Old Data Type is processed Data Type must be Converted to valid JSON types in response.
        - Do not try to Change Formats VALID JSON FORMAT The Received and defined ones are the only one valids.
        - Try to use Old Data and USERINPUT to generate new playlist for user
        - Use UUID for all IDs.
        - Use only valid JSON.
        - Always return a JSON array []
        - Always Include heading, External Articles, YouTube Videos Whenever Required.
`

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


console.log("CALLING GPT4", command);
let myChat = await ai.chat(prompt, { preferredModel: 'gpt-4o' });
console.log("myChat", myChat);
const results = extractJsonFromString(myChat);
console.log("CALLING GPT4 SUCCESS", results);

if (!Array.isArray(results)) {
    throw new Error("Result JSON was not able to convert to array!");
}

const { badData, allItems } = thisBot.ConvertDataType({ results });


if (badData) {
    console.error("Founded wrong format! Send Logs to Kushagra!");
    os.toast("Founded wrong format! Send Logs to Kushagra!");
}

console.log("allItems", allItems);

return {
    allItems,
};
