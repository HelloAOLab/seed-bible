import { LocationIcon } from "app.components.icons";
await os.sleep(200);
if (!that?.content) return;

const locations = tags.locations;

const locationsArr = [];

const locationOptionsConfig = {};

const makeLocationOptions = ({ location }) => {
  return {
    icon: <span class="material-symbols-outlined">location_on</span>,
    title: `${location}`,
    onClick: async () => {
      if (!masks?.appId) {
        const appId = globalThis.AddFloatingApp({
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
          size: { width: 350, height: 200 },
          type: "canvas",
        });
        setTagMask(thisBot, "appId", appId, "tempLocal");
      }
      let geoJson;
      const locationBot = getBot("system", "ext_canvas.highlight_locations");
      const placeData = locationBot.tags.locations[location.toLowerCase()];
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
        whisper(getBot("system", "ext_geoImporter.importer"), "loadMap", {
          file: geoJson.data,
          loadGame: that?.loadGame ? true : false,
          openOverlay: true,
        });
      } else {
        os.toast("Something went wrong while retrieving the data");
      }
    },
  };
};

for (let i = 0; i < that.content.length; i++) {
  const verse = that.content[i].verses;
  for (let j = 0; j < verse.length; j++) {
    const verseArray = verse[j].text.split(" ");
    for (const word of verseArray) {
      if (locations[word.replace(/[^a-zA-Z]/g, "").toLowerCase()]) {
        locationsArr.push(word.replace(/[^a-zA-Z]/g, "").toLowerCase());
        if (
          locationOptionsConfig[
            `${that.book}-${that.chapter}-${verse[j].verseNumber}`
          ]
        ) {
          locationOptionsConfig[
            `${that.book}-${that.chapter}-${verse[j].verseNumber}`
          ].items.push(
            makeLocationOptions({ location: word.replace(/[^a-zA-Z]/g, "") })
          );
        } else {
          locationOptionsConfig[
            `${that.book}-${that.chapter}-${verse[j].verseNumber}`
          ] = {
            icon: <LocationIcon />,
            title: "Locations",
            items: [
              makeLocationOptions({ location: word.replace(/[^a-zA-Z]/g, "") }),
            ],
          };
        }
      }
    }
  }
}

if (!globalThis?.VerseContextMenuOptions) {
  globalThis.VerseContextMenuOptions = {};
}
for (const key of Object.keys(locationOptionsConfig)) {
  let options = [];
  if (globalThis?.VerseContextMenuOptions?.[key]) {
    options = [
      ...globalThis.VerseContextMenuOptions[key],
      locationOptionsConfig[key],
    ];
  } else {
    options = [locationOptionsConfig[key]];
  }
  const uniqueOptions = [...new Set(options)];
  globalThis.VerseContextMenuOptions[key] = uniqueOptions;
}
