const PROMPT = `I will provide you with a Bible reference string, and you will return an array of structured JSON objects following these parsing rules:
Book, Chapter, and Verse Identification:

"John.1", "jhn 1", or "jon_1" → { type: 'chapter', book: 'john', chapter: 1 }
"John.2.2" or "jhn_2:2" → { type: 'verse', book: 'john', chapter: 2, verse: 2 }
"John" → { type: 'book', book: 'john' }
Handling Ranges and Lists:

"Jhn.1-5" → { type: 'chapter', book: 'john', chapter: [1, 2, 3, 4, 5] }
"Jhn.1-5,song.2.3" →

[
  { "type": "chapter", "book": "john", "chapter": [1, 2, 3, 4, 5] },
  { "type": "verse", "book": "song of songs", "chapter": 2, "verse": 3,totalVerseInChapter: 17 }
]

In Case of Verse only you will also provide me the totalVerseInChapter cause in verse array object chapter will be one only.

Delimiter Equivalence:

".", "_", " ", and ":" are interchangeable.
Example: "jhn_2:2" is equivalent to "jhn.2.2".
Range Handling:

The "-" character represents a numeric range and should be expanded into an array.
Example: "Jhn.1-3" → { type: 'chapter', book: 'john', chapter: [1, 2, 3] }.
Multiple Books Handling:

The "," character separates multiple book references.
Example: "Jhn.1-5,song.2.3" should return an array of objects.
Book Name Normalization:

"jhn", "jon", "john" → "john"
"song", "sos" → "song of songs"
Now, provide a Bible reference string, and I will return the parsed JSON array.

Give the JSON for Below ${that.query || "no books"}
`

function extractJsonFromString(inputString) {
    // Use regex to find JSON array in the input string
    const jsonMatch = inputString.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]); // Parse and return JSON object
        } catch (error) {
            console.error("Invalid JSON format:", error);
            return null;
        }
    } else {
        console.error("No JSON found in the input string.");
        return null;
    }
};


let myChat = await ai.chat(PROMPT, { preferredModel: "claude-3-5-sonnet-20240620" });

const value = extractJsonFromString(myChat);

return value;