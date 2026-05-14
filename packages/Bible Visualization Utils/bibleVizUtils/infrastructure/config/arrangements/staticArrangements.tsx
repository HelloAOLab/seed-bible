import type { ArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";

export const staticArrangements: ArrangementInfo[] = [
  {
    name: "traditional",
    testaments: [
      {
        name: "New Testament",
        translationKey: "new-testament",
        sections: [
          {
            name: "Apocalypse",
            translationKey: "apocalypse",
            color: "#B1B2FF",
            books: [{ commonName: "Revelation" }],
          },
          {
            name: "Letters",
            translationKey: "letters",
            color: "#AAC4FF",
            customExplodedViewScaleFactor: 8,
            customColorRange: 120,
            books: [
              {
                commonName: "Jude",
                explodedViewPosition: { x: 0, y: 0, z: 0 },
              },
              {
                commonName: "3 John",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.1 },
                group: 1,
              },
              {
                commonName: "2 John",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.1 },
                group: 1,
              },
              {
                commonName: "1 John",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.1 },
                group: 1,
              },
              {
                commonName: "2 Peter",
                explodedViewCustomScale: { x: 0.75, y: 0.2625 },
                explodedViewPosition: { x: 0.1, y: 0.268, z: 0.19 },
                group: 2,
              },
              {
                commonName: "1 Peter",
                explodedViewCustomScale: { x: 0.75, y: 0.4375 },
                explodedViewPosition: { x: -0.1, y: -0.181, z: 0.19 },
                group: 2,
              },
              {
                commonName: "James",
                explodedViewPosition: { x: 0, y: 0, z: 0.29 },
              },
              {
                commonName: "Hebrews",
                explodedViewPosition: { x: 0, y: 0, z: 0.333 },
              },
              {
                commonName: "Philemon",
                explodedViewPosition: { x: 0, y: 0, z: 0.376 },
              },
              {
                commonName: "Titus",
                explodedViewPosition: { x: 0, y: 0, z: 0.42 },
              },
              {
                commonName: "2 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.51 },
                group: 3,
              },
              {
                commonName: "1 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.51 },
                group: 3,
              },
              {
                commonName: "2 Thessalonians",
                explodedViewCustomScale: { x: 0.35, y: 0.6 },
                explodedViewPosition: { x: 0.225, y: 0.05, z: 0.59 },
                group: 4,
              },
              {
                commonName: "1 Thessalonians",
                explodedViewCustomScale: { x: 0.35, y: 0.6 },
                explodedViewPosition: { x: -0.225, y: -0.05, z: 0.59 },
                group: 4,
              },
              {
                commonName: "Colossians",
                explodedViewPosition: { x: 0, y: 0, z: 0.69 },
              },
              {
                commonName: "Philippians",
                explodedViewPosition: { x: 0, y: 0, z: 0.733 },
              },
              {
                commonName: "Ephesians",
                explodedViewPosition: { x: 0, y: 0, z: 0.776 },
              },
              {
                commonName: "Galatians",
                explodedViewPosition: { x: 0, y: 0, z: 0.82 },
              },
              {
                commonName: "2 Corinthians",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.91 },
                group: 5,
              },
              {
                commonName: "1 Corinthians",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.91 },
                group: 5,
              },
              {
                commonName: "Romans",
                explodedViewPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
          {
            name: "History",
            translationKey: "history",
            color: "#a0aeeb",
            books: [{ commonName: "Acts" }],
          },
          {
            name: "Gospels",
            translationKey: "gospels",
            color: "#a4accf",
            customExplodedViewScaleFactor: 3,
            books: [
              {
                commonName: "John",
                explodedViewPosition: { x: 0.3, y: 0, z: 0.1 },
              },
              {
                commonName: "Luke",
                explodedViewPosition: { x: 0, y: -0.3, z: 0.36 },
              },
              {
                commonName: "Mark",
                explodedViewPosition: { x: -0.3, y: 0, z: 0.632 },
              },
              {
                commonName: "Matthew",
                explodedViewPosition: { x: 0, y: 0.3, z: 0.9 },
              },
            ],
          },
        ],
      },
      {
        name: "Old Testament",
        translationKey: "old-testament",
        sections: [
          {
            name: "Prophets",
            translationKey: "prophets",
            color: "#EF9595",
            customExplodedViewScaleFactor: 3,
            customColorRange: 80,
            books: [
              {
                commonName: "Malachi",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0 },
              },
              {
                commonName: "Zechariah",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: 0.175, y: -0.125, z: 0 },
              },
              {
                commonName: "Haggai",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: -0.325, y: -0.125, z: 0 },
              },
              {
                commonName: "Zephaniah",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.12 },
              },
              {
                commonName: "Habakkuk",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.12 },
              },
              {
                commonName: "Nahum",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.12 },
              },
              {
                commonName: "Micah",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: -0.375, z: 0.24 },
              },
              {
                commonName: "Jonah",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: 0.125, z: 0.24 },
              },
              {
                commonName: "Obadiah",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: 0.125, z: 0.24 },
              },
              {
                commonName: "Amos",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: -0.375, z: 0.36 },
              },
              {
                commonName: "Joel",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: 0.175, y: 0.125, z: 0.36 },
              },
              {
                commonName: "Hosea",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: -0.325, y: 0.125, z: 0.36 },
              },
              {
                commonName: "Daniel",
                explodedViewPosition: { x: 0, y: 0, z: 0.55 },
              },
              {
                commonName: "Ezekiel",
                explodedViewPosition: { x: 0, y: 0, z: 0.65 },
              },
              {
                commonName: "Lamentations",
                explodedViewCustomScale: { x: 0.4, y: 0.6 },
                explodedViewPosition: { x: 0.25, y: 0.05, z: 0.77 },
              },
              {
                commonName: "Jeremiah",
                explodedViewCustomScale: { x: 0.4, y: 0.6 },
                explodedViewPosition: { x: -0.25, y: -0.05, z: 0.79 },
              },
              {
                commonName: "Isaiah",
                explodedViewPosition: { x: 0, y: 0, z: 0.95 },
              },
            ],
          },
          {
            name: "Wisdom",
            translationKey: "wisdom",
            color: "#EFB495",
            customExplodedViewScaleFactor: 2.5,
            customColorRange: 80,
            books: [
              {
                commonName: "Song of Songs",
                explodedViewCustomScale: { x: 0.7, y: 0.9 },
                explodedViewPosition: { x: 0.15, y: 0, z: 0 },
              },
              {
                commonName: "Ecclesiastes",
                explodedViewCustomScale: { x: 0.7, y: 0.9 },
                explodedViewPosition: { x: 0, y: 0, z: 0.075 },
              },
              {
                commonName: "Proverbs",
                explodedViewCustomScale: { x: 0.7, y: 0.9 },
                explodedViewPosition: { x: -0.15, y: 0, z: 0.1875 },
              },
              {
                commonName: "5 Psalms",
                explodedViewPosition: { x: -0.3, y: -0.35, z: 0.42 },
                group: 4,
              },
              {
                commonName: "4 Psalms",
                explodedViewPosition: { x: 0.3, y: -0.35, z: 0.46 },
                group: 4,
              },
              {
                commonName: "3 Psalms",
                explodedViewPosition: { x: 0.5, y: 0.25, z: 0.5 },
                group: 4,
              },
              {
                commonName: "2 Psalms",
                explodedViewPosition: { x: 0, y: 0.35, z: 0.54 },
                group: 4,
              },
              {
                commonName: "1 Psalms",
                explodedViewPosition: { x: -0.5, y: 0.25, z: 0.58 },
                group: 4,
              },
              {
                commonName: "Job",
                explodedViewPosition: { x: 0, y: 0, z: 0.9 },
              },
            ],
          },
          {
            name: "History",
            translationKey: "history",
            color: "#EFD595",
            customExplodedViewScaleFactor: 2.5,
            customColorRange: 80,
            books: [
              {
                commonName: "Esther",
                explodedViewPosition: { x: 0, y: 0, z: 0 },
              },
              {
                commonName: "Nehemiah",
                explodedViewCustomScale: { x: 1.1, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: -0.2, z: 0.14 },
              },
              {
                commonName: "Ezra",
                explodedViewCustomScale: { x: 1.1, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: 0.2, z: 0.16 },
              },
              {
                commonName: "2 Chronicles",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.37 },
                group: 3,
              },
              {
                commonName: "1 Chronicles",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.39 },
                group: 3,
              },
              {
                commonName: "2 Kings",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.49 },
                group: 2,
              },
              {
                commonName: "1 Kings",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.51 },
                group: 2,
              },
              {
                commonName: "2 Samuel",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.61 },
                group: 1,
              },
              {
                commonName: "1 Samuel",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.63 },
                group: 1,
              },
              {
                commonName: "Ruth",
                explodedViewPosition: { x: 0, y: 0, z: 0.8 },
              },
              {
                commonName: "Judges",
                explodedViewPosition: { x: 0, y: 0, z: 0.9 },
              },
              {
                commonName: "Joshua",
                explodedViewPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
          {
            name: "Law",
            translationKey: "law",
            color: "#E5E67E",
            customExplodedViewScaleFactor: 2.5,
            books: [
              {
                commonName: "Deuteronomy",
                explodedViewPosition: { x: 0.4, y: 0.4, z: 0 },
              },
              {
                commonName: "Numbers",
                explodedViewPosition: { x: 0, y: 0, z: 0.25 },
              },
              {
                commonName: "Leviticus",
                explodedViewPosition: { x: -0.4, y: -0.4, z: 0.5 },
              },
              {
                commonName: "Exodus",
                explodedViewPosition: { x: 0, y: 0, z: 0.75 },
              },
              {
                commonName: "Genesis",
                explodedViewPosition: { x: 0.4, y: 0.4, z: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "tanak",
    testaments: [
      {
        name: "New Testament",
        translationKey: "new-testament",
        sections: [
          {
            name: "Apocalypse",
            translationKey: "apocalypse",
            color: "#B1B2FF",
            books: [
              {
                commonName: "Revelation",
              },
            ],
          },
          {
            name: "Letters",
            translationKey: "letters",
            color: "#AAC4FF",
            customExplodedViewScaleFactor: 8,
            customColorRange: 120,
            books: [
              {
                commonName: "Jude",
                explodedViewPosition: { x: 0, y: 0, z: 0 },
              },
              {
                commonName: "3 John",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.1 },
                group: 1,
              },
              {
                commonName: "2 John",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.1 },
                group: 1,
              },
              {
                commonName: "1 John",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.1 },
                group: 1,
              },
              {
                commonName: "2 Peter",
                explodedViewCustomScale: { x: 0.75, y: 0.2625 },
                explodedViewPosition: { x: 0.1, y: 0.268, z: 0.19 },
                group: 2,
              },
              {
                commonName: "1 Peter",
                explodedViewCustomScale: { x: 0.75, y: 0.4375 },
                explodedViewPosition: { x: -0.1, y: -0.181, z: 0.19 },
                group: 2,
              },
              {
                commonName: "James",
                explodedViewPosition: { x: 0, y: 0, z: 0.29 },
              },
              {
                commonName: "Hebrews",
                explodedViewPosition: { x: 0, y: 0, z: 0.333 },
              },
              {
                commonName: "Philemon",
                explodedViewPosition: { x: 0, y: 0, z: 0.376 },
              },
              {
                commonName: "Titus",
                explodedViewPosition: { x: 0, y: 0, z: 0.42 },
              },
              {
                commonName: "2 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.51 },
                group: 3,
              },
              {
                commonName: "1 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.51 },
                group: 3,
              },
              {
                commonName: "2 Thessalonians",
                explodedViewCustomScale: { x: 0.35, y: 0.6 },
                explodedViewPosition: { x: 0.225, y: 0.05, z: 0.59 },
                group: 4,
              },
              {
                commonName: "1 Thessalonians",
                explodedViewCustomScale: { x: 0.35, y: 0.6 },
                explodedViewPosition: { x: -0.225, y: -0.05, z: 0.59 },
                group: 4,
              },
              {
                commonName: "Colossians",
                explodedViewPosition: { x: 0, y: 0, z: 0.69 },
              },
              {
                commonName: "Philippians",
                explodedViewPosition: { x: 0, y: 0, z: 0.733 },
              },
              {
                commonName: "Ephesians",
                explodedViewPosition: { x: 0, y: 0, z: 0.776 },
              },
              {
                commonName: "Galatians",
                explodedViewPosition: { x: 0, y: 0, z: 0.82 },
              },
              {
                commonName: "2 Corinthians",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.91 },
                group: 5,
              },
              {
                commonName: "1 Corinthians",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.91 },
                group: 5,
              },
              {
                commonName: "Romans",
                explodedViewPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
          {
            name: "History",
            translationKey: "history",
            color: "#a0aeeb",
            books: [
              {
                commonName: "Acts",
              },
            ],
          },
          {
            name: "Gospels",
            translationKey: "gospels",
            color: "#a4accf",
            customExplodedViewScaleFactor: 3,
            books: [
              {
                commonName: "John",
                explodedViewPosition: { x: 0.3, y: 0, z: 0.1 },
              },
              {
                commonName: "Luke",
                explodedViewPosition: { x: 0, y: -0.3, z: 0.36 },
              },
              {
                commonName: "Mark",
                explodedViewPosition: { x: -0.3, y: 0, z: 0.632 },
              },
              {
                commonName: "Matthew",
                explodedViewPosition: { x: 0, y: 0.3, z: 0.9 },
              },
            ],
          },
        ],
      },
      {
        name: "Old Testament",
        translationKey: "old-testament",
        sections: [
          {
            name: "Writings",
            translationKey: "writings",
            color: "#708871",
            customExplodedViewScaleFactor: 3,
            customColorRange: 80,
            books: [
              {
                commonName: "2 Chronicles",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.01 },
                group: 3,
              },
              {
                commonName: "1 Chronicles",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.01 },
                group: 3,
              },
              {
                commonName: "Nehemiah",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.1 },
                group: 2,
              },
              {
                commonName: "Ezra",
                group: 2,
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.1 },
              },
              {
                commonName: "Daniel",

                explodedViewPosition: { x: 0, y: 0, z: 0.22 },
              },
              {
                commonName: "Esther",

                explodedViewPosition: { x: 0, y: 0, z: 0.28 },
              },
              {
                commonName: "Ecclesiastes",

                explodedViewPosition: { x: 0, y: 0, z: 0.34 },
              },
              {
                commonName: "Lamentations",

                explodedViewPosition: { x: 0, y: -0, z: 0.39 },
              },
              {
                commonName: "Ruth",

                explodedViewPosition: { x: 0, y: 0, z: 0.44 },
              },
              {
                commonName: "Song of Songs",

                explodedViewPosition: { x: 0, y: 0, z: 0.5 },
              },
              {
                commonName: "Job",

                explodedViewPosition: { x: 0, y: 0, z: 0.56 },
              },
              {
                commonName: "Proverbs",

                explodedViewPosition: { x: 0, y: 0, z: 0.63 },
              },
              {
                commonName: "5 Psalms",
                explodedViewPosition: { x: -0.3, y: -0.35, z: 0.79 },
                group: 4,
              },
              {
                commonName: "4 Psalms",
                explodedViewPosition: { x: 0.3, y: -0.35, z: 0.82 },
                group: 4,
              },
              {
                commonName: "3 Psalms",
                explodedViewPosition: { x: 0.5, y: 0.25, z: 0.83 },
                group: 4,
              },
              {
                commonName: "2 Psalms",
                explodedViewPosition: { x: 0, y: 0.35, z: 0.85 },
                group: 4,
              },
              {
                commonName: "1 Psalms",
                explodedViewPosition: { x: -0.5, y: 0.25, z: 0.89 },
                group: 4,
              },
            ],
          },
          {
            name: "Prophets",
            translationKey: "prophets",
            color: "#bec6a0",
            customExplodedViewScaleFactor: 2.5,
            customColorRange: 80,
            books: [
              {
                commonName: "Malachi",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.02 },
              },
              {
                commonName: "Zechariah",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: 0.175, y: -0.125, z: 0.02 },
              },
              {
                commonName: "Haggai",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: -0.325, y: -0.125, z: 0.02 },
              },
              {
                commonName: "Zephaniah",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.09 },
              },
              {
                commonName: "Habakkuk",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.09 },
              },
              {
                commonName: "Nahum",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.09 },
              },
              {
                commonName: "Micah",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: -0.375, z: 0.16 },
              },
              {
                commonName: "Jonah",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: 0.125, z: 0.16 },
              },
              {
                commonName: "Obadiah",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: 0.125, z: 0.16 },
              },
              {
                commonName: "Amos",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: -0.375, z: 0.23 },
              },
              {
                commonName: "Joel",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: 0.175, y: 0.125, z: 0.23 },
              },
              {
                commonName: "Hosea",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: -0.325, y: 0.125, z: 0.23 },
              },

              {
                commonName: "Ezekiel",
                explodedViewPosition: { x: 0, y: 0, z: 0.33 },
              },
              {
                commonName: "Jeremiah",

                explodedViewPosition: { x: 0, y: 0, z: 0.43 },
              },
              {
                commonName: "Isaiah",
                explodedViewPosition: { x: 0, y: 0, z: 0.56 },
              },
              {
                commonName: "2 Kings",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.68 },
                group: 2,
              },
              {
                commonName: "1 Kings",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.68 },
                group: 2,
              },
              {
                commonName: "2 Samuel",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.78 },
                group: 1,
              },
              {
                commonName: "1 Samuel",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.78 },
                group: 1,
              },
              {
                commonName: "Judges",
                explodedViewPosition: { x: 0, y: 0, z: 0.89 },
              },
              {
                commonName: "Joshua",
                explodedViewPosition: { x: 0, y: 0, z: 0.98 },
              },
            ],
          },
          {
            name: "Torah",
            translationKey: "torah",
            color: "#fef3e2",
            customExplodedViewScaleFactor: 2.5,
            books: [
              {
                commonName: "Deuteronomy",
                explodedViewPosition: { x: 0.4, y: 0.4, z: 0 },
              },
              {
                commonName: "Numbers",
                explodedViewPosition: { x: 0, y: 0, z: 0.25 },
              },
              {
                commonName: "Leviticus",
                explodedViewPosition: { x: -0.4, y: -0.4, z: 0.5 },
              },
              {
                commonName: "Exodus",
                explodedViewPosition: { x: 0, y: 0, z: 0.75 },
              },
              {
                commonName: "Genesis",
                explodedViewPosition: { x: 0.4, y: 0.4, z: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Chronological",
    testaments: [
      {
        name: "New Testament",
        translationKey: "new-testament",
        sections: [
          {
            name: "Chronological NT",
            translationKey: "chronological-nt",
            color: "#d5d5d5",
            customExplodedViewScaleFactor: 4.9,
            customColorRange: 80,
            books: [
              {
                commonName: "Revelation",
                explodedViewPosition: { x: 0, y: 0, z: -0.03 },
                customColor: "#8DC53E",
              },
              {
                commonName: "3 John",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.02 },
                group: 1,
                customColor: "#8DC53E",
              },
              {
                commonName: "2 John",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.02 },
                group: 1,
                customColor: "#8DC53E",
              },
              {
                commonName: "1 John",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.02 },
                group: 1,
                customColor: "#8DC53E",
              },
              {
                commonName: "Jude",
                explodedViewPosition: { x: 0, y: 0, z: 0.08 },
                customColor: "#8DC53E",
              },
              {
                commonName: "2 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.1 },

                customColor: "#FEDF01",
              },
              {
                commonName: "Titus",
                explodedViewPosition: { x: 0, y: 0, z: 0.15 },
                customColor: "#FEDF01",
              },
              {
                commonName: "1 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.2 },

                customColor: "#FEDF01",
              },
              {
                commonName: "Hebrews",
                explodedViewPosition: { x: 0, y: 0, z: 0.25 },
                customColor: "#8DC53E",
              },
              {
                commonName: "2 Peter",
                explodedViewCustomScale: { x: 1, y: 0.35 },
                explodedViewPosition: { x: 0, y: 0.35, z: 0.3 },
                group: 2,
                customColor: "#8DC53E",
              },
              {
                commonName: "1 Peter",
                explodedViewCustomScale: { x: 1, y: 0.35 },
                explodedViewPosition: { x: 0, y: -0.2, z: 0.3 },
                group: 2,
                customColor: "#8DC53E",
              },
              {
                commonName: "Philippians",
                explodedViewPosition: { x: 0, y: 0, z: 0.35 },
                customColor: "#FFDE00",
              },
              {
                commonName: "Ephesians",

                explodedViewPosition: { x: 0, y: -0, z: 0.4 },

                customColor: "#FFDE00",
              },
              {
                commonName: "Philemon",

                explodedViewPosition: { x: 0, y: 0, z: 0.45 },

                customColor: "#FFDE00",
              },
              {
                commonName: "Colossians",

                explodedViewPosition: { x: -0, y: 0, z: 0.5 },

                customColor: "#FFDE00",
              },
              {
                commonName: "James",

                explodedViewPosition: { x: 0, y: 0, z: 0.55 },

                customColor: "#8DC53E",
              },
              {
                commonName: "Romans",

                explodedViewPosition: { x: 0, y: 0, z: 0.6 },

                customColor: "#FFDE00",
              },
              {
                commonName: "Galatians",

                explodedViewPosition: { x: 0, y: 0, z: 0.65 },

                customColor: "#FFDE00",
              },
              {
                commonName: "2 Corinthians",
                explodedViewPosition: { x: 0, y: 0.35, z: 0.7 },
                group: 5,

                explodedViewCustomScale: { x: 1, y: 0.35 },
                customColor: "#FFDE00",
              },
              {
                commonName: "1 Corinthians",
                explodedViewCustomScale: { x: 1, y: 0.35 },
                explodedViewPosition: { x: 0, y: -0.15, z: 0.7 },
                group: 5,
                customColor: "#FFDE00",
              },
              {
                commonName: "2 Thessalonians",
                explodedViewCustomScale: { x: 0.45, y: 1 },
                explodedViewPosition: { x: 0.5, y: 0, z: 0.75 },
                group: 4,
                customColor: "#FFDE00",
              },
              {
                commonName: "1 Thessalonians",
                group: 4,
                explodedViewPosition: { x: -0, y: 0, z: 0.75 },
                explodedViewCustomScale: { x: 0.45, y: 1 },
                customColor: "#FFDE00",
              },
              {
                commonName: "Acts",
                explodedViewPosition: { x: 0.2, y: 0, z: 0.8 },
                customColor: "#FAA51A",
              },
              {
                commonName: "John",
                explodedViewPosition: { x: 0.2, y: 0, z: 0.85 },
                customColor: "#FAA51A",
              },
              {
                commonName: "Luke",
                explodedViewPosition: { x: 0, y: -0.1, z: 0.9 },
                customColor: "#FAA51A",
              },
              {
                commonName: "Mark",
                explodedViewPosition: { x: -0.1, y: -0.01, z: 0.95 },
                customColor: "#FAA51A",
              },
              {
                commonName: "Matthew",
                explodedViewPosition: { x: 0.2, y: 0.2, z: 1 },
                customColor: "#FAA51A",
              },
            ],
          },
        ],
      },
      {
        name: "Old Testament",
        translationKey: "old-testament",
        sections: [
          {
            name: "Chronological OT",
            translationKey: "chronological-ot",
            color: "#d5d5d5",
            customExplodedViewScaleFactor: 2.8,
            customColorRange: 80,
            books: [
              {
                commonName: "Malachi",
                explodedViewCustomScale: { x: 1.2, y: 0.25 },
                explodedViewPosition: { x: 0, y: -0.475, z: -0.01 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Zechariah",
                explodedViewCustomScale: { x: 0.65, y: 0.75 },
                explodedViewPosition: { x: 0.275, y: 0.225, z: -0.01 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Haggai",
                explodedViewCustomScale: { x: 0.35, y: 0.75 },
                explodedViewPosition: { x: -0.425, y: 0.225, z: -0.01 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Nehemiah",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: -0, z: 0.02 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Esther",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: 0, z: 0.05 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Ezra",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: -0, y: 0, z: 0.09 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Daniel",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: 0, z: 0.12 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Ezekiel",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: 0, z: 0.15 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Zephaniah",
                explodedViewCustomScale: { x: 1, y: 0.25 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.18 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Habakkuk",
                explodedViewCustomScale: { x: 0.28, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.225, z: 0.18 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Nahum",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.32, y: -0.225, z: 0.18 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Micah",
                explodedViewCustomScale: { x: 1.2, y: 0.25 },
                explodedViewPosition: { x: 0, y: -0.475, z: 0.22 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Jonah",
                explodedViewCustomScale: { x: 0.35, y: 0.75 },
                explodedViewPosition: { x: 0.39, y: 0.125, z: 0.22 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Obadiah",
                explodedViewCustomScale: { x: 0.65, y: 0.75 },
                explodedViewPosition: { x: -0.275, y: 0.125, z: 0.22 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Amos",
                explodedViewCustomScale: { x: 1.2, y: 0.25 },
                explodedViewPosition: { x: 0, y: -0.475, z: 0.26 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Joel",
                explodedViewCustomScale: { x: 0.65, y: 0.75 },
                explodedViewPosition: { x: 0.275, y: 0.225, z: 0.26 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Hosea",
                explodedViewCustomScale: { x: 0.35, y: 0.75 },
                explodedViewPosition: { x: -0.425, y: 0.225, z: 0.26 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Lamentations",
                explodedViewCustomScale: { x: 1.2, y: 1.2, z: 1.7 },
                explodedViewPosition: { x: 0, y: 0, z: 0.3 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Jeremiah",
                explodedViewCustomScale: { x: 1.2, y: 1.2, z: 1.7 },
                explodedViewPosition: { x: -0, y: -0, z: 0.33 },
                customColor: "#8FABDD",
              },
              {
                commonName: "Isaiah",
                explodedViewCustomScale: { x: 1.2, y: 1.2, z: 1.7 },
                explodedViewPosition: { x: -0, y: -0, z: 0.36 },
                customColor: "#8FABDD",
              },
              {
                commonName: "2 Chronicles",
                explodedViewPosition: { x: 0.55, y: 0.05, z: 0.42 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "2 Kings",
                explodedViewCustomScale: { x: 0.7, y: 1, z: 1.7 },
                explodedViewPosition: { x: 0.5, y: 0.05, z: 0.45 },
                group: 2,
                customColor: "#DAE3F4",
              },
              {
                commonName: "1 Kings",
                explodedViewCustomScale: { x: 0.7, y: 1, z: 1.7 },
                explodedViewPosition: { x: -0.6, y: -0, z: 0.45 },
                group: 2,
                customColor: "#DAE3F4",
              },
              {
                commonName: "Ecclesiastes",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                customColor: "#BEC6A0",
                explodedViewPosition: { x: 0, y: 0, z: 0.49 },
              },
              {
                commonName: "Proverbs",
                customColor: "#BEC6A0",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.52 },
              },
              {
                commonName: "Song of Songs",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.55 },
                customColor: "#BEC6A0",
              },
              {
                commonName: "5 Psalms",
                explodedViewPosition: { x: -0.8, y: -0.2, z: 0.6 },
                group: 4,
                customColor: "#BEC6A0",
              },
              {
                commonName: "4 Psalms",
                explodedViewPosition: { x: 0.3, y: -0.35, z: 0.61 },
                group: 4,
                customColor: "#BEC6A0",
              },
              {
                commonName: "3 Psalms",
                explodedViewPosition: { x: 1, y: 0, z: 0.62 },
                group: 4,
                customColor: "#BEC6A0",
              },
              {
                commonName: "2 Psalms",
                explodedViewPosition: { x: 0.3, y: 0.35, z: 0.63 },
                group: 4,
                customColor: "#BEC6A0",
              },
              {
                commonName: "1 Psalms",
                explodedViewPosition: { x: -0.5, y: 0.25, z: 0.64 },
                group: 4,
                customColor: "#BEC6A0",
              },
              {
                commonName: "1 Chronicles",
                explodedViewPosition: { x: -0.55, y: -0.05, z: 0.69 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "2 Samuel",
                explodedViewCustomScale: { x: 0.7, y: 1, z: 1.7 },
                explodedViewPosition: { x: 0.55, y: 0.05, z: 0.72 },
                group: 1,
                customColor: "#DAE3F4",
              },
              {
                commonName: "1 Samuel",
                explodedViewCustomScale: { x: 0.7, y: 1 },
                explodedViewPosition: { x: -0.55, y: -0.05, z: 0.72 },
                group: 1,
                customColor: "#DAE3F4",
              },
              {
                commonName: "Ruth",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.75 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Judges",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.77 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Joshua",
                explodedViewCustomScale: { x: 1.4, y: 1.4, z: 1 },
                explodedViewPosition: { x: 0, y: 0, z: 0.8 },
                customColor: "#DAE3F4",
              },
              {
                commonName: "Deuteronomy",
                explodedViewPosition: { x: -0.35, y: 0.8, z: 0.837 },
                customColor: "#FEE799",
              },
              {
                commonName: "Numbers",
                explodedViewPosition: { x: -0.6, y: 0.1, z: 0.867 },
                customColor: "#FEE799",
              },
              {
                commonName: "Leviticus",
                explodedViewPosition: { x: -0.4, y: -0.4, z: 0.91 },
                customColor: "#FEE799",
              },
              {
                commonName: "Exodus",
                explodedViewPosition: { x: -0.3, y: -0.3, z: 0.94 },
                customColor: "#FEE799",
              },
              {
                commonName: "Job",
                customColor: "#BEC6A0",
                explodedViewPosition: { x: 0.6, y: 0.4, z: 0.97 },
              },
              {
                commonName: "Genesis",

                explodedViewPosition: { x: 0.2, y: 0.4, z: 1 },
                customColor: "#FEE799",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Chronological Alternative",
    testaments: [
      {
        name: "New Testament",
        translationKey: "new-testament",
        sections: [
          {
            name: "Chronological NT",
            translationKey: "chronological-nt",
            color: "#2596be",
            customExplodedViewScaleFactor: 4.9,
            customColorRange: 80,
            books: [
              {
                commonName: "Revelation",
                explodedViewPosition: { x: 0, y: 0, z: -0.03 },
              },
              {
                commonName: "3 John",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.02 },
                group: 1,
              },
              {
                commonName: "2 John",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.02 },
                group: 1,
              },
              {
                commonName: "1 John",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.02 },
                group: 1,
              },
              {
                commonName: "Jude",
                explodedViewPosition: { x: 0, y: 0, z: 0.08 },
              },
              {
                commonName: "2 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.1 },
              },
              {
                commonName: "Titus",
                explodedViewPosition: { x: 0, y: 0, z: 0.15 },
              },
              {
                commonName: "1 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.2 },
              },
              {
                commonName: "Hebrews",
                explodedViewPosition: { x: 0, y: 0, z: 0.25 },
              },
              {
                commonName: "2 Peter",
                explodedViewCustomScale: { x: 1, y: 0.35 },
                explodedViewPosition: { x: 0, y: 0.35, z: 0.3 },
                group: 2,
              },
              {
                commonName: "1 Peter",
                explodedViewCustomScale: { x: 1, y: 0.35 },
                explodedViewPosition: { x: 0, y: -0.2, z: 0.3 },
                group: 2,
              },
              {
                commonName: "Philippians",
                explodedViewPosition: { x: 0, y: 0, z: 0.35 },
              },
              {
                commonName: "Ephesians",

                explodedViewPosition: { x: 0, y: -0, z: 0.4 },
              },
              {
                commonName: "Philemon",

                explodedViewPosition: { x: 0, y: 0, z: 0.45 },
              },
              {
                commonName: "Colossians",

                explodedViewPosition: { x: -0, y: 0, z: 0.5 },
              },
              {
                commonName: "James",

                explodedViewPosition: { x: 0, y: 0, z: 0.55 },
              },
              {
                commonName: "Romans",

                explodedViewPosition: { x: 0, y: 0, z: 0.6 },
              },
              {
                commonName: "Galatians",

                explodedViewPosition: { x: 0, y: 0, z: 0.65 },
              },
              {
                commonName: "2 Corinthians",
                explodedViewPosition: { x: 0, y: 0.35, z: 0.7 },
                group: 5,

                explodedViewCustomScale: { x: 1, y: 0.35 },
              },
              {
                commonName: "1 Corinthians",
                explodedViewCustomScale: { x: 1, y: 0.35 },
                explodedViewPosition: { x: 0, y: -0.15, z: 0.7 },
                group: 5,
              },
              {
                commonName: "2 Thessalonians",
                explodedViewCustomScale: { x: 0.45, y: 1 },
                explodedViewPosition: { x: 0.5, y: 0, z: 0.75 },
                group: 4,
              },
              {
                commonName: "1 Thessalonians",
                group: 4,
                explodedViewPosition: { x: -0, y: 0, z: 0.75 },
                explodedViewCustomScale: { x: 0.45, y: 1 },
              },
              {
                commonName: "Acts",
                explodedViewPosition: { x: 0.2, y: 0, z: 0.8 },
              },
              {
                commonName: "John",
                explodedViewPosition: { x: 0.2, y: 0, z: 0.85 },
              },
              {
                commonName: "Luke",
                explodedViewPosition: { x: 0, y: -0.1, z: 0.9 },
              },
              {
                commonName: "Mark",
                explodedViewPosition: { x: -0.1, y: -0.01, z: 0.95 },
              },
              {
                commonName: "Matthew",
                explodedViewPosition: { x: 0.2, y: 0.2, z: 1 },
              },
            ],
          },
        ],
      },
      {
        name: "Old Testament",
        translationKey: "old-testament",
        sections: [
          {
            name: "Chronological OT",
            translationKey: "chronological-ot",
            color: "#708871",
            customExplodedViewScaleFactor: 2.8,
            customColorRange: 80,
            books: [
              {
                commonName: "Malachi",
                explodedViewCustomScale: { x: 1.2, y: 0.25 },
                explodedViewPosition: { x: 0, y: -0.475, z: -0.01 },
              },
              {
                commonName: "Zechariah",
                explodedViewCustomScale: { x: 0.65, y: 0.75 },
                explodedViewPosition: { x: 0.275, y: 0.225, z: -0.01 },
              },
              {
                commonName: "Haggai",
                explodedViewCustomScale: { x: 0.35, y: 0.75 },
                explodedViewPosition: { x: -0.425, y: 0.225, z: -0.01 },
              },
              {
                commonName: "Nehemiah",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: -0, z: 0.02 },
              },
              {
                commonName: "Esther",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: 0, z: 0.05 },
              },
              {
                commonName: "Ezra",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: -0, y: 0, z: 0.09 },
              },
              {
                commonName: "Daniel",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: 0, z: 0.12 },
              },
              {
                commonName: "Ezekiel",
                explodedViewCustomScale: { x: 1.3, y: 1.3 },
                explodedViewPosition: { x: 0, y: 0, z: 0.15 },
              },
              {
                commonName: "Zephaniah",
                explodedViewCustomScale: { x: 1, y: 0.25 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.18 },
              },
              {
                commonName: "Habakkuk",
                explodedViewCustomScale: { x: 0.28, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.225, z: 0.18 },
              },
              {
                commonName: "Nahum",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.32, y: -0.225, z: 0.18 },
              },
              {
                commonName: "Micah",
                explodedViewCustomScale: { x: 1.2, y: 0.25 },
                explodedViewPosition: { x: 0, y: -0.475, z: 0.22 },
              },
              {
                commonName: "Jonah",
                explodedViewCustomScale: { x: 0.35, y: 0.75 },
                explodedViewPosition: { x: 0.39, y: 0.125, z: 0.22 },
              },
              {
                commonName: "Obadiah",
                explodedViewCustomScale: { x: 0.65, y: 0.75 },
                explodedViewPosition: { x: -0.275, y: 0.125, z: 0.22 },
              },
              {
                commonName: "Amos",
                explodedViewCustomScale: { x: 1.2, y: 0.25 },
                explodedViewPosition: { x: 0, y: -0.475, z: 0.26 },
              },
              {
                commonName: "Joel",
                explodedViewCustomScale: { x: 0.65, y: 0.75 },
                explodedViewPosition: { x: 0.275, y: 0.225, z: 0.26 },
              },
              {
                commonName: "Hosea",
                explodedViewCustomScale: { x: 0.35, y: 0.75 },
                explodedViewPosition: { x: -0.425, y: 0.225, z: 0.26 },
              },
              {
                commonName: "Lamentations",
                explodedViewCustomScale: { x: 1.2, y: 1.2, z: 1.7 },
                explodedViewPosition: { x: 0, y: 0, z: 0.3 },
              },
              {
                commonName: "Jeremiah",
                explodedViewCustomScale: { x: 1.2, y: 1.2, z: 1.7 },
                explodedViewPosition: { x: -0, y: -0, z: 0.33 },
              },
              {
                commonName: "Isaiah",
                explodedViewCustomScale: { x: 1.2, y: 1.2, z: 1.7 },
                explodedViewPosition: { x: -0, y: -0, z: 0.36 },
              },
              {
                commonName: "2 Chronicles",
                explodedViewPosition: { x: 0.55, y: 0.05, z: 0.42 },
              },
              {
                commonName: "2 Kings",
                explodedViewCustomScale: { x: 0.7, y: 1, z: 1.7 },
                explodedViewPosition: { x: 0.5, y: 0.05, z: 0.45 },
                group: 2,
              },
              {
                commonName: "1 Kings",
                explodedViewCustomScale: { x: 0.7, y: 1, z: 1.7 },
                explodedViewPosition: { x: -0.6, y: -0, z: 0.45 },
                group: 2,
              },
              {
                commonName: "Ecclesiastes",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.49 },
              },
              {
                commonName: "Proverbs",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.52 },
              },
              {
                commonName: "Song of Songs",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.55 },
              },
              {
                commonName: "5 Psalms",
                explodedViewPosition: { x: -0.8, y: -0.2, z: 0.6 },
                group: 4,
              },
              {
                commonName: "4 Psalms",
                explodedViewPosition: { x: 0.3, y: -0.35, z: 0.61 },
                group: 4,
              },
              {
                commonName: "3 Psalms",
                explodedViewPosition: { x: 1, y: 0, z: 0.62 },
                group: 4,
              },
              {
                commonName: "2 Psalms",
                explodedViewPosition: { x: 0.3, y: 0.35, z: 0.63 },
                group: 4,
              },
              {
                commonName: "1 Psalms",
                explodedViewPosition: { x: -0.5, y: 0.25, z: 0.64 },
                group: 4,
              },
              {
                commonName: "1 Chronicles",
                explodedViewPosition: { x: -0.55, y: -0.05, z: 0.69 },
              },
              {
                commonName: "2 Samuel",
                explodedViewCustomScale: { x: 0.7, y: 1, z: 1.7 },
                explodedViewPosition: { x: 0.55, y: 0.05, z: 0.72 },
                group: 1,
              },
              {
                commonName: "1 Samuel",
                explodedViewCustomScale: { x: 0.7, y: 1 },
                explodedViewPosition: { x: -0.55, y: -0.05, z: 0.72 },
                group: 1,
              },
              {
                commonName: "Ruth",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.75 },
              },
              {
                commonName: "Judges",
                explodedViewCustomScale: { x: 1.4, y: 1.4 },
                explodedViewPosition: { x: 0, y: 0, z: 0.77 },
              },
              {
                commonName: "Joshua",
                explodedViewCustomScale: { x: 1.4, y: 1.4, z: 1 },
                explodedViewPosition: { x: 0, y: 0, z: 0.8 },
              },
              {
                commonName: "Deuteronomy",
                explodedViewPosition: { x: -0.35, y: 0.8, z: 0.837 },
              },
              {
                commonName: "Numbers",
                explodedViewPosition: { x: -0.6, y: 0.1, z: 0.867 },
              },
              {
                commonName: "Leviticus",
                explodedViewPosition: { x: -0.4, y: -0.4, z: 0.91 },
              },
              {
                commonName: "Exodus",
                explodedViewPosition: { x: -0.3, y: -0.3, z: 0.94 },
              },
              {
                commonName: "Job",

                explodedViewPosition: { x: 0.6, y: 0.4, z: 0.97 },
              },
              {
                commonName: "Genesis",

                explodedViewPosition: { x: 0.2, y: 0.4, z: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "PlatformerGame",
    testaments: [
      {
        name: "New Testament",
        translationKey: "new-testament",
        sections: [
          {
            name: "Apocalypse",
            translationKey: "apocalypse",
            color: "#B1B2FF",
            books: [
              {
                commonName: "Revelation",
              },
            ],
          },
          {
            name: "Letters",
            translationKey: "letters",
            color: "#AAC4FF",
            customExplodedViewScaleFactor: 8,
            customColorRange: 120,
            books: [
              {
                commonName: "Jude",
                explodedViewPosition: { x: 0, y: 0, z: 0 },
              },
              {
                commonName: "3 John",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.1 },
                group: 1,
              },
              {
                commonName: "2 John",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.1 },
                group: 1,
              },
              {
                commonName: "1 John",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.1 },
                group: 1,
              },
              {
                commonName: "2 Peter",
                explodedViewCustomScale: { x: 0.75, y: 0.2625 },
                explodedViewPosition: { x: 0.1, y: 0.268, z: 0.19 },
                group: 2,
              },
              {
                commonName: "1 Peter",
                explodedViewCustomScale: { x: 0.75, y: 0.4375 },
                explodedViewPosition: { x: -0.1, y: -0.181, z: 0.19 },
                group: 2,
              },
              {
                commonName: "James",
                explodedViewPosition: { x: 0, y: 0, z: 0.29 },
              },
              {
                commonName: "Hebrews",
                explodedViewPosition: { x: 0, y: 0, z: 0.333 },
              },
              {
                commonName: "Philemon",
                explodedViewPosition: { x: 0, y: 0, z: 0.376 },
              },
              {
                commonName: "Titus",
                explodedViewPosition: { x: 0, y: 0, z: 0.42 },
              },
              {
                commonName: "2 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.51 },
                group: 3,
              },
              {
                commonName: "1 Timothy",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.51 },
                group: 3,
              },
              {
                commonName: "2 Thessalonians",
                explodedViewCustomScale: { x: 0.35, y: 0.6 },
                explodedViewPosition: { x: 0.225, y: 0.05, z: 0.59 },
                group: 4,
              },
              {
                commonName: "1 Thessalonians",
                explodedViewCustomScale: { x: 0.35, y: 0.6 },
                explodedViewPosition: { x: -0.225, y: -0.05, z: 0.59 },
                group: 4,
              },
              {
                commonName: "Colossians",
                explodedViewPosition: { x: 0, y: 0, z: 0.69 },
              },
              {
                commonName: "Philippians",
                explodedViewPosition: { x: 0, y: 0, z: 0.733 },
              },
              {
                commonName: "Ephesians",
                explodedViewPosition: { x: 0, y: 0, z: 0.776 },
              },
              {
                commonName: "Galatians",
                explodedViewPosition: { x: 0, y: 0, z: 0.82 },
              },
              {
                commonName: "2 Corinthians",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: 0.225, z: 0.91 },
                group: 5,
              },
              {
                commonName: "1 Corinthians",
                explodedViewCustomScale: { x: 0.7, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: -0.225, z: 0.91 },
                group: 5,
              },
              {
                commonName: "Romans",
                explodedViewPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
          {
            name: "History",
            translationKey: "history",
            color: "#a0aeeb",
            books: [
              {
                commonName: "Acts",
              },
            ],
          },
          {
            name: "Gospels",
            translationKey: "gospels",
            color: "#a4accf",
            customExplodedViewScaleFactor: 3,
            books: [
              {
                commonName: "John",
                explodedViewPosition: { x: 0.3, y: 0, z: 0.1 },
              },
              {
                commonName: "Luke",
                explodedViewPosition: { x: 0, y: -0.3, z: 0.36 },
              },
              {
                commonName: "Mark",
                explodedViewPosition: { x: -0.3, y: 0, z: 0.632 },
              },
              {
                commonName: "Matthew",
                explodedViewPosition: { x: 0, y: 0.3, z: 0.9 },
                isCheckpoint: true,
              },
            ],
          },
        ],
      },
      {
        name: "Old Testament",
        translationKey: "old-testament",
        sections: [
          {
            name: "Prophets",
            translationKey: "prophets",
            color: "#EF9595",
            customExplodedViewScaleFactor: 3,
            customColorRange: 80,
            books: [
              {
                commonName: "Malachi",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0 },
              },
              {
                commonName: "Zechariah",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: 0.175, y: -0.125, z: 0 },
              },
              {
                commonName: "Haggai",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: -0.325, y: -0.125, z: 0 },
              },
              {
                commonName: "Zephaniah",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: 0.375, z: 0.12 },
              },
              {
                commonName: "Habakkuk",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: -0.125, z: 0.12 },
              },
              {
                commonName: "Nahum",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: -0.125, z: 0.12 },
              },
              {
                commonName: "Micah",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: -0.375, z: 0.24 },
              },
              {
                commonName: "Jonah",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: 0.325, y: 0.125, z: 0.24 },
              },
              {
                commonName: "Obadiah",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: -0.175, y: 0.125, z: 0.24 },
              },
              {
                commonName: "Amos",
                explodedViewCustomScale: { x: 0.9, y: 0.15 },
                explodedViewPosition: { x: 0, y: -0.375, z: 0.36 },
              },
              {
                commonName: "Joel",
                explodedViewCustomScale: { x: 0.55, y: 0.65 },
                explodedViewPosition: { x: 0.175, y: 0.125, z: 0.36 },
              },
              {
                commonName: "Hosea",
                explodedViewCustomScale: { x: 0.25, y: 0.65 },
                explodedViewPosition: { x: -0.325, y: 0.125, z: 0.36 },
              },
              {
                commonName: "Daniel",
                explodedViewPosition: { x: 0, y: 0, z: 0.55 },
              },
              {
                commonName: "Ezekiel",
                explodedViewPosition: { x: 0, y: 0, z: 0.65 },
              },
              {
                commonName: "Lamentations",
                explodedViewCustomScale: { x: 0.4, y: 0.6 },
                explodedViewPosition: { x: 0.25, y: 0.05, z: 0.77 },
              },
              {
                commonName: "Jeremiah",
                explodedViewCustomScale: { x: 0.4, y: 0.6 },
                explodedViewPosition: { x: -0.25, y: -0.05, z: 0.79 },
              },
              {
                commonName: "Isaiah",
                explodedViewPosition: { x: 0, y: 0, z: 0.95 },
              },
            ],
          },
          {
            name: "Wisdom",
            translationKey: "wisdom",
            color: "#EFB495",
            customExplodedViewScaleFactor: 2.5,
            customColorRange: 80,
            books: [
              {
                commonName: "Song of Songs",
                explodedViewCustomScale: { x: 0.7, y: 0.9 },
                explodedViewPosition: { x: 0.15, y: 0, z: 0 },
              },
              {
                commonName: "Ecclesiastes",
                explodedViewCustomScale: { x: 0.7, y: 0.9 },
                explodedViewPosition: { x: 0, y: 0, z: 0.075 },
              },
              {
                commonName: "Proverbs",
                explodedViewCustomScale: { x: 0.7, y: 0.9 },
                explodedViewPosition: { x: -0.15, y: 0, z: 0.1875 },
              },
              {
                commonName: "5 Psalms",
                explodedViewPosition: { x: -0.3, y: -0.35, z: 0.42 },
                group: 4,
              },
              {
                commonName: "4 Psalms",
                explodedViewPosition: { x: 0.3, y: -0.35, z: 0.46 },
                group: 4,
              },
              {
                commonName: "3 Psalms",
                explodedViewPosition: { x: 0.5, y: 0.25, z: 0.5 },
                group: 4,
              },
              {
                commonName: "2 Psalms",
                explodedViewPosition: { x: 0, y: 0.35, z: 0.54 },
                group: 4,
              },
              {
                commonName: "1 Psalms",
                explodedViewPosition: { x: -0.5, y: 0.25, z: 0.58 },
                group: 4,
              },
              {
                commonName: "Job",
                explodedViewPosition: { x: 0, y: 0, z: 0.9 },
                isCheckpoint: true,
              },
            ],
          },
          {
            name: "History",
            translationKey: "history",
            color: "#EFD595",
            customExplodedViewScaleFactor: 2.5,
            customColorRange: 80,
            books: [
              {
                commonName: "Esther",
                explodedViewPosition: { x: 0, y: 0, z: 0 },
              },
              {
                commonName: "Nehemiah",
                explodedViewCustomScale: { x: 1.1, y: 0.35 },
                explodedViewPosition: { x: 0.1, y: -0.2, z: 0.14 },
              },
              {
                commonName: "Ezra",
                explodedViewCustomScale: { x: 1.1, y: 0.35 },
                explodedViewPosition: { x: -0.1, y: 0.2, z: 0.16 },
              },
              {
                commonName: "2 Chronicles",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.37 },
                group: 3,
              },
              {
                commonName: "1 Chronicles",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.39 },
                group: 3,
              },
              {
                commonName: "2 Kings",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.49 },
                group: 2,
              },
              {
                commonName: "1 Kings",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.51 },
                group: 2,
              },
              {
                commonName: "2 Samuel",
                explodedViewPosition: { x: 0.35, y: 0.05, z: 0.61 },
                group: 1,
              },
              {
                commonName: "1 Samuel",
                explodedViewPosition: { x: -0.35, y: -0.05, z: 0.63 },
                group: 1,
              },
              {
                commonName: "Ruth",
                explodedViewPosition: { x: 0, y: 0, z: 0.8 },
              },
              {
                commonName: "Judges",
                explodedViewPosition: { x: 0, y: 0, z: 0.9 },
              },
              {
                commonName: "Joshua",
                explodedViewPosition: { x: 0, y: 0, z: 1 },
              },
            ],
          },
          {
            name: "Law",
            translationKey: "law",
            color: "#E5E67E",
            customExplodedViewScaleFactor: 2.5,
            books: [
              {
                commonName: "Deuteronomy",
                explodedViewPosition: { x: 0.4, y: 0.4, z: 0 },
              },
              {
                commonName: "Numbers",
                explodedViewPosition: { x: 0, y: 0, z: 0.25 },
              },
              {
                commonName: "Leviticus",
                explodedViewPosition: { x: -0.4, y: -0.4, z: 0.5 },
              },
              {
                commonName: "Exodus",
                explodedViewPosition: { x: 0, y: 0, z: 0.75 },
              },
              {
                commonName: "Genesis",
                explodedViewPosition: { x: 0.4, y: 0.4, z: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
] as const;
