await os.sleep(200);
if (!that?.content) return;

const locations = tags.locations;

const locationsArr = [];

const verseContextMenuOptions = {};

const makeLocationOptions = ({ location }) => {
  return {
    icon: (
      <span class="material-symbols-outlined">location_on</span>
    ),
    title: `${location}`,
    onClick: async () => {
      if (!globalThis.activeCanvasId) {
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
          size: { width: 525, height: 300 },
        });
      }
      let geoJson;
      let locationBot = getBot(
        "system",
        "ext_canvas.highlight_locations"
      );
      let placeData =
        locationBot.tags.locations[location.toLowerCase()];
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
            loadGame: that?.loadGame ? true : false,
            openOverlay: true,
          }
        );
      } else {
        os.toast(
          "Something went wrong while retrieving the data"
        );
      }
    },
  }
}

for (let i = 0; i < that.content.length; i++) {
  const verse = that.content[i].verses;
  for (let j = 0; j < verse.length; j++) {
    const verseArray = verse[j].text.split(" ");
    for (let word of verseArray) {
      if (locations[word.replace(/[^a-zA-Z]/g, "").toLowerCase()]) {
        locationsArr.push(word.replace(/[^a-zA-Z]/g, "").toLowerCase());
        if (verseContextMenuOptions[`${that.book}-${verse[j].verseNumber}`]) {
          verseContextMenuOptions[`${that.book}-${verse[j].verseNumber}`] = [
            ...verseContextMenuOptions[`${that.book}-${verse[j].verseNumber}`],
            makeLocationOptions({location: word.replace(/[^a-zA-Z]/g, "")})
          ]
        } else {
          verseContextMenuOptions[`${that.book}-${verse[j].verseNumber}`] = [
            makeLocationOptions({location: word.replace(/[^a-zA-Z]/g, "")})
          ]
        }
      }
    }
  }
}

globalThis.VerseContextMenuOptions = verseContextMenuOptions;

HighlightWords({
  words: [...locationsArr],
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
                    <span class="material-symbols-outlined">location_on</span>
                  ),
                  title: `Locate ${verse.text}`,
                  onClick: async () => {
                    if (!globalThis.activeCanvasId) {
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
                        size: { width: 525, height: 300 },
                      });
                    }
                    let geoJson;
                    let locationBot = getBot(
                      "system",
                      "ext_canvas.highlight_locations"
                    );
                    let placeData =
                      locationBot.tags.locations[verse.text.toLowerCase()];
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
                          loadGame: that?.loadGame ? true : false,
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
      style: () => {
        return {
          backgroundColor: "transparent",
        };
      },
    };
  },
});
