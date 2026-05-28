import DraggableContainer from "ext_twitchPub.client.DraggableContainer";
import TwitchSettings from "ext_twitchPub.client.TwitchSettings";
const style = thisBot.tags["App.css"];

const { useState, useEffect } = os.appHooks;

function getBooleanMaskValue(value: unknown, defaultValue: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return defaultValue;
}

function App() {
  const [translationEnabled, setTranslationEnabled] = useState(
    getBooleanMaskValue(masks?.translationEnabled, true)
  );
  const [highlightEnabled, setHighlightEnabled] = useState(
    getBooleanMaskValue(masks?.highlightEnabled, true)
  );
  const [chapterFollowEnabled, setChapterFollowEnabled] = useState(
    getBooleanMaskValue(masks?.chapterFollowEnabled, true)
  );

  useEffect(() => {
    setTagMask(
      thisBot,
      "translationEnabled",
      translationEnabled ? true : false,
      "local"
    );
  }, [translationEnabled]);

  useEffect(() => {
    setTagMask(
      thisBot,
      "highlightEnabled",
      highlightEnabled ? true : false,
      "local"
    );
  }, [highlightEnabled]);

  useEffect(() => {
    setTagMask(
      thisBot,
      "chapterFollowEnabled",
      chapterFollowEnabled ? true : false,
      "local"
    );
  }, [chapterFollowEnabled]);

  return (
    <>
      <style>{style}</style>
      <DraggableContainer>
        <div className="twitchPub-container">
          <TwitchSettings
            translationEnabled={translationEnabled}
            highlightEnabled={highlightEnabled}
            setTranslationEnabled={setTranslationEnabled}
            setHighlightEnabled={setHighlightEnabled}
            chapterFollowEnabled={chapterFollowEnabled}
            setChapterFollowEnabled={setChapterFollowEnabled}
          />
        </div>
      </DraggableContainer>
    </>
  );
}

export default App;
