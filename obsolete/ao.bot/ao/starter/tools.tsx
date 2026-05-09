const tools = [
  {
    type: "function",
    name: "openSeedBible",
    description:
      "a function takes whatever user needs to open book/chapter /specific translation specific verse ",
    parameters: {
      type: "object",
      properties: {
        book: {
          type: "string",
          description: "the book that user want or the refrence book",
        },
        chapter: {
          type: "string",
          description: "the chapter that user want or the refrence chapter",
        },
        translation: {
          type: "string",
          description:
            "the translation that user want or the refrence translation",
        },
        verse: {
          type: "string",
          description:
            "retun this if u have a speific verese to give to user as refrence",
        },
      },
      //   required: ["sign"],
    },
  },
];

return tools;
