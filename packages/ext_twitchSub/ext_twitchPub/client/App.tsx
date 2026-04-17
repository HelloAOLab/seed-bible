import DraggableContainer from "ext_twitchPub.client.DraggableContainer";
import TwitchSettings from "ext_twitchPub.client.TwitchSettings";
const style = thisBot.tags["App.css"];

const { useState, useEffect } = os.appHooks;

function App() {
  const [translationEnabled, setTranslationEnabled] = useState(
    masks?.translationEnabled || true
  );
  const [highlightEnabled, setHighlightEnabled] = useState(
    masks?.highlightEnabled || true
  );
  const [chapterFollowEnabled, setChapterFollowEnabled] = useState(
    masks?.chapterFollowEnabled || true
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
