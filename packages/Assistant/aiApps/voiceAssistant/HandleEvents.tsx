import { captureElement } from "aiApps.voiceAssistant.Utils";

const HandleEvents = async ({ dc, data }) => {
  console.log(data);
  switch (data.name) {
    case "getTime": {
      const now = new Date().toLocaleTimeString();
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: now,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "analyzeScreen": {
      (async () => {
        try {
          const { userSpecification } = JSON.parse(data.arguments || "{}");
          const imageBase64 = await captureElement();

          dc.send(
            JSON.stringify({
              type: "response.create",
            })
          );

          const response = await ai.chat(
            {
              role: "user",
              content: [
                {
                  base64: imageBase64,
                  mimeType: "image/png",
                },
                {
                  text: userSpecification || "please describe the image",
                },
              ],
            },
            {
              preferredModel: "gpt-4o",
            }
          );

          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: data.call_id,
                output: response.content,
              },
            })
          );

          dc.send(JSON.stringify({ type: "response.create" }));
        } catch (err) {
          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: data.call_id,
                output: err.message,
              },
            })
          );
          dc.send(JSON.stringify({ type: "response.create" }));
        }
      })();
      break;
    }
    case "getCurrentChapterDetail": {
      let chapterContent = `${BibleData.book}-${BibleData.chapter} \n`;
      for (let i = 0; i < BibleData.content.length; i++) {
        chapterContent += `${BibleData.content[i].heading} \n`;
        let verses = BibleData.content[i].verses;
        for (let j = 0; j < verses.length; j++) {
          chapterContent += `${verses[j].verseNumber} ${verses[j].text} \n`;
        }
      }
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: chapterContent,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "openChapter": {
      let { bookId, chapter } = JSON.parse(data.arguments || "{}");

      let searchBar = getBot("system", "introduction.searchBar");
      let booksData = [...searchBar.tags.booksData];
      let correctId;
      chapter = Number(chapter);
      for (let book of booksData) {
        if (
          book.name.toLowerCase() === bookId.toLowerCase() ||
          book.commonName.toLowerCase() === bookId.toLowerCase()
        ) {
          if (chapter <= book.numberOfChapters) {
            correctId = book.id;
          }
        }
      }

      console.log(bookId, chapter, correctId);

      if (correctId) {
        globalThis.Open(correctId, chapter);
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `opened chapter ${chapter} of ${bookId}`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      } else {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `unable to open it`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      break;
    }
    case "openPreviousChapter": {
      let searchBar = getBot("system", "introduction.searchBar");
      let booksData = [...searchBar.tags.booksData];
      let bookName, chapterNo;
      for (let i = 0; i < booksData.length; i++) {
        let book = booksData[i];
        if (
          globalThis.BibleData.bookId === book.id &&
          globalThis.BibleData.chapter > 1
        ) {
          bookName = book.name;
          chapterNo = globalThis.BibleData.chapter - 1;
          break;
        } else if (
          globalThis.BibleData.bookId === book.id &&
          globalThis.BibleData.chapter === 1 &&
          i > 0
        ) {
          bookName = booksData[i - 1].name;
          chapterNo = booksData[i - 1].numberOfChapters;
          break;
        }
      }
      console.log(
        bookName,
        chapterNo,
        globalThis.BibleData.bookId,
        globalThis.BibleData.chapter,
        booksData
      );

      if (bookName && chapterNo) {
        globalThis.NavFunctions.openPrevChapter();
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `opened chapter ${chapterNo} of ${bookName}`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      } else {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `unable to open it`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      break;
    }
    case "openNextChapter": {
      console.log(BibleData, "BibleData");
      let searchBar = getBot("system", "introduction.searchBar");
      let booksData = [...searchBar.tags.booksData];
      let bookName, chapterNo;
      for (let i = 0; i < booksData.length; i++) {
        let book = booksData[i];
        console.log(book);
        if (
          globalThis.BibleData.bookId === book.id &&
          globalThis.BibleData.chapter < book.numberOfChapters
        ) {
          bookName = book.name;
          chapterNo = globalThis.BibleData.chapter + 1;
          console.log("match");
          break;
        } else if (
          globalThis.BibleData.bookId === book.id &&
          globalThis.BibleData.chapter >= book.numberOfChapters &&
          i < booksData.length
        ) {
          bookName = booksData[i + 1].name;
          chapterNo = 1;
          console.log("match");
          break;
        }
      }

      if (bookName && chapterNo) {
        globalThis.NavFunctions.openNextChapter();
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `opened chapter ${chapterNo} of ${bookName}`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      } else {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `unable to open it`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      break;
    }
    case "highlight": {
      (async () => {
        try {
          let { highlightWord, highlightVerse, color } = JSON.parse(
            data.arguments || "{}"
          );
          highlightVerse = Number(highlightVerse);

          if (highlightVerse) {
            let verse;
            for (let i = 0; i < BibleData.content.length; i++) {
              let verses = BibleData.content[i].verses;
              for (let j = 0; j < verses.length; j++) {
                if (highlightVerse === verses[j].verseNumber) {
                  verse = verses[j].text;
                  break;
                }
                if (verse) break;
              }
            }
            HighlightWords({
              words: [verse],
              color: "#000", // text color
              backgroundColor: globalThis.HIGHLIGHT_BG_COLOR || "#ffeb3b", // highlight color
              createAttributes: (book, chapter, verse) => {
                return {
                  style: {
                    backgroundColor: color || "lightblue",
                  },
                };
              },
            });

            console.log(verse, highlightVerse, typeof highlightVerse, "verse");

            dc.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: data.call_id,
                  output: `verse ${verse} highlighted`,
                },
              })
            );
          } else {
            HighlightWords({
              words: [highlightWord],
              color: "#000", // text color
              backgroundColor: globalThis.HIGHLIGHT_BG_COLOR || "#ffeb3b", // highlight color
              createAttributes: (book, chapter, verse) => {
                return {
                  style: {
                    backgroundColor: color || "lightblue",
                  },
                };
              },
            });

            dc.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: data.call_id,
                  output: `${highlightWord} highlighted`,
                },
              })
            );
          }

          dc.send(JSON.stringify({ type: "response.create" }));
        } catch (err) {
          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: data.call_id,
                output: err.message,
              },
            })
          );
          dc.send(JSON.stringify({ type: "response.create" }));
        }
      })();
      break;
    }
    case "clearHighlight": {
      globalThis.ClearAllWordHighlights();
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: "cleared highlighted words",
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "highlightVerses": {
      let { verses } = JSON.parse(data.arguments || "{}");
      if (verses && Array.isArray(verses)) {
        HighlightVerse([...verses]);
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: "highlighted words",
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      console.log(verses, "verses");
      break;
    }
    case "unHighlightVerses": {
      let { verses } = JSON.parse(data.arguments || "{}");
      if (verses && Array.isArray(verses)) {
        UnHighlightVerse([...verses]);
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: "unhighlighted verses",
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      console.log(verses, "verses");
      break;
    }
    case "changeHighlightColor": {
      // Mkae this according to new highlight
      let { color } = JSON.parse(data.arguments || "{}");
      // SetWordHighlightsBC(color)
      // dc.send(JSON.stringify({
      //         type: "conversation.item.create",
      //         item: {
      //             type: "function_call_output",
      //             call_id: data.call_id,
      //             output: "highlight color changed"
      //         }
      //     }));
      //     dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "changeHighlightTextColor": {
      let { color } = JSON.parse(data.arguments || "{}");
      SetWordHighlightsTC(color);
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: "highlight text color changed",
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "highlightLocation": {
      let { color } = JSON.parse(data.arguments || "{}");
      let searchBar = getBot("system", "introduction.searchBar");
      let locations = searchBar.tags["places-new"];
      let locationsArr = [];

      for (let i = 0; i < BibleData.content.length; i++) {
        let verses = BibleData.content[i].verses;
        for (let j = 0; j < verses.length; j++) {
          let verse = verses[j].text.split(" ");
          for (let word of verse) {
            if (locations[word.replace(/[^a-zA-Z]/g, "").toLowerCase()]) {
              locationsArr.push(word.replace(/[^a-zA-Z]/g, "").toLowerCase());
            }
          }
        }
      }

      console.log(locationsArr);

      if (locationsArr.length > 0) {
        HighlightWords({
          words: locationsArr,
          color: "#000", // text color
          backgroundColor: globalThis.HIGHLIGHT_BG_COLOR || "#ffeb3b", // highlight color
          createAttributes: (book, chapter, verse) => {
            return {
              onMouseEnter: async (e) => {
                e.target.style.color = "#0D47A1";
                e.target.style.fontWeight = "400";
              },
              onMouseLeave: async (e) => {
                setTimeout(() => {
                  e.target.style.color = "";
                  e.target.style.fontWeight = "";
                  e.target.style.fontStyle = "";
                }, 2000);
              },
              onContextMenu: async (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log(book, chapter, verse);
                shout("onVeresRightClick", {
                  verseNumber: verse.verseNumber,
                  text: verse.text,
                  chapter,
                  book,
                  highlighted: true,
                  extraContext: [
                    {
                      address: "Locations",
                      label: "Locations",
                      items: [
                        {
                          icon: (
                            <span class="material-symbols-outlined">
                              location_on
                            </span>
                          ),
                          title: () => "Open Location",
                          onClick: async () => {
                            globalThis.AddFloatingApp({
                              App: (
                                <div
                                  className="mainCanvas"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    "border-radius": "16px",
                                  }}
                                ></div>
                              ),
                              title: `Canvas`,
                              position: { x: 200, y: 150 },
                              size: { width: 300, height: 150 },
                            });
                            let geoJson;
                            console.log(verse, "verse");
                            let placeData =
                              tags.locations[verse.text.toLowerCase()];
                            if (placeData.place === placeData.geojson) {
                              geoJson = await web.get(
                                `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${placeData.geojson}.geojson`
                              );
                            } else {
                              geoJson = await web.get(
                                `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${placeData.geojson}.geojson`
                              );
                            }
                            if (geoJson.status === 200) {
                              whisper(
                                getBot("system", "ext_geoImporter.importer"),
                                "loadMap",
                                {
                                  file: geoJson.data,
                                  loadGame: BibleData?.loadGame ? true : false,
                                  openOverlay: true,
                                }
                              );
                            } else {
                              os.toast(
                                "Something went wrong while retrieving the data"
                              );
                            }
                          },
                        },
                      ],
                    },
                  ],
                });
              },
              style: { backgroundColor: color || "lightblue" },
            };
          },
        });
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `Highlighted ${
                locationsArr.length
              } locations present in this chapter namely ${locationsArr.join(
                " "
              )}`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      } else {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: "no locations found on this chapter",
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      break;
    }
    case "getChapterContext": {
      let chapterContent = `${BibleData.book}-${BibleData.chapter} \n`;
      for (let i = 0; i < BibleData.content.length; i++) {
        chapterContent += `${BibleData.content[i].heading} \n`;
        let verses = BibleData.content[i].verses;
        for (let j = 0; j < verses.length; j++) {
          chapterContent += `${verses[j].verseNumber} ${verses[j].text} \n`;
        }
      }
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `${chapterContent}`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "getTranslations": {
      let { language } = JSON.parse(data.arguments || "{}");
      console.log(language, "language");
      let available_translations_req = await web.get(
        "https://bible.helloao.org/api/available_translations.json"
      );
      let translationOptions = [];
      available_translations_req.data.translations.map((translation) => {
        if (
          language.toLowerCase() ===
          translation?.languageEnglishName?.toLowerCase()
        ) {
          translationOptions.push(translation.id);
        }
      });
      console.log(translationOptions, "translationOptions");
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `available translation options are ${translationOptions.join(
              ", "
            )}`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "changeTranslation": {
      let { translation } = JSON.parse(data.arguments || "{}");
      let translationReq = await web.get(
        `https://bible.helloao.org/api/${translation}/books.json`
      );
      let translationData = { ...translationReq.data };
      ChangeTranslation(
        translationData.translation.id,
        translationData.books,
        "https://bible.helloao.org"
      );
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `Translation changes to ${translationData.translation.englishName}`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "checkInstallablePackages": {
      let packageManager = getBot("system", "app.packager");
      let installedPackages = packageManager.masks.installedPackages;
      let installablePackages = packageManager.tags.availablePackages.map(
        (availablePackage) => {
          if (installedPackages.includes(availablePackage.name)) {
            return null;
          } else {
            return availablePackage.name;
          }
        }
      );
      installablePackages = installablePackages.filter((item) => item);
      console.log(installablePackages, "installablePackages");
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `installable packages are ${installablePackages.join(
              ", "
            )}`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "checkInstalledPackages": {
      let packageManager = getBot("system", "app.packager");
      let installedPackages = packageManager.masks.installedPackages;
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `installable packages are ${installedPackages.join(", ")}`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "installPackage": {
      let { packages } = JSON.parse(data.arguments || "{}");
      let packageManager = getBot("system", "app.packager");
      packages.map((packageName) => {
        whisper(packageManager, "installPackage", { name: packageName });
      });
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: `packages ${packages.join(
              ", "
            )} are being installed and will be available shortly!`,
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      break;
    }
    case "uninstallPackage": {
      let { packages, confirmation } = JSON.parse(data.arguments || "{}");
      let packageManager = getBot("system", "app.packager");
      packages.map((packageName) => {
        if (packageName === "Assistant" && confirmation) {
          whisper(packageManager, "uninstallPackage", { address: packageName });
        } else {
          whisper(packageManager, "uninstallPackage", { address: packageName });
        }
      });
      if (packages.includes("Assistant") && confirmation) {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `packages ${packages.join(
                ", "
              )} are uninstalled and say a goodbye as assistant is being uninstalled!`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      } else if (packages.includes("Assistant") && !confirmation) {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `all the packages are being uninstalled except for assistant`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      } else {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: `packages ${packages.join(", ")} are being uninstalled!`,
            },
          })
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
      break;
    }
    case "close": {
      dc.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions: "You are being closed! say goodbye to the user.",
          },
        })
      );
      await os.sleep(3000);
      whisper(thisBot, "toggleVoiceAssistant");
    }
  }
};

export default HandleEvents;
