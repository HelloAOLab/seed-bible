const dimension = os.getCurrentDimension()
const testInput = {
  readingTime: 5000,
  readingHistory: ["John 1:1"]
}
const promptSeed = Math.floor(Math.random() * 100)
const chatPrompt = `You are the manager of a 3D environment called The Seed Bible, where users experience the Bible through 2D and 3D visualizations. Within The Seed Bible, there is a special section called the Garden where users can see a visual representation of their recent activity and the current state of their environment, symbolized by a growing seed.
You will receive user data in the form of a JSON object to analyze and use to adjust the environment and create content based on the user's recent activity and environment state. Analyze the data provided, including the user’s overall time spent reading the Bible and their reading history, to produce a JSON object with the following parameters:

"backgroundColor": The background color of the environment in 6-digit hex format (e.g., #000000), derived from the analyzed user data.
"seedPrompt": A prompt to generate an image of a tree that visually represents the user's Bible-reading journey. Specify the growth stage, species, size, trunk color, leaf color, setting, mood, type of the image and style determined by the analyzed data. Make sure the color palette is related to the background color.

The user data object will follow the next JSON Schema:
{
  title: "User activity",
  description: "The user recent activity and current environment state",
  type: "object",
  properties: {
    readingTime: {
      description: "The total amount of time reading the Bible spent by the user measured in milliseconds",
      type: "integer"
    },
    readingHistory: {
      description: "The list of passages the user has read",
      type: "array",
      items: {
        type: "string"
      },
      minItems: 1
    }
  },
  "required": [ "readingTime", "readingHistory" ]
}`

const seedSchema = {
  title: "Garden",
  description: "Garden's data to represent users journey",
  type: "object",
  properties: {
    backgroundColor: {
      description: "A hex color code for the background",
      type: "string"
    },
    seedPrompt: {
      description: "A prompt to generate an image of the seed",
      type: "string"
    }
  },
  required: [ "backgroundColor", "seedPrompt"],
  additionalProperties: false
}

const chatResponse = await OpenAI.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
        { 
            role: "system", 
            content: chatPrompt 
        },
        {
            role: "user",
            content: JSON.stringify(testInput),
        },
    ],
    response_format: {
        type: "json_schema",
        json_schema: {
            name: "seedSchema",
            schema: seedSchema,
            strict: true
        }
    },
    seed: promptSeed
});

const imageResponse = await OpenAI.images.generate({
  model: "dall-e-3",
  prompt: JSON.parse(chatResponse.choices[0].message.content).seedPrompt,
  n: 1,
  size: "1024x1024",
  response_format: "b64_json"
});

const blob = bytes.fromBase64String(imageResponse.data[0].b64_json);
const recordKey = await os.getPublicRecordKey('Canvas');

if (recordKey.success) 
{
  const result = await os.recordFile(recordKey.recordKey, blob);
  if (result.success) { 
    setTagMask(links.mainTree, "formAddress", result.url)
    setTagMask(thisBot, "seedImageUrl", result.url)
  }
}

setTagMask(links.mainTree, "garden", true)
setTagMask(thisBot, "gardenBackgroundColor", JSON.parse(chatResponse.choices[0].message.content).backgroundColor)

if(dimension == "garden") 
{
  gridPortalBot.tags.portalBackgroundAddress = null;
  gridPortalBot.tags.portalColor = JSON.parse(chatResponse.choices[0].message.content).backgroundColor
}