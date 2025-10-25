// TableTalkEmbed.jsx
const { useState } = os.appHooks;
const getStyleOf = await thisBot.GetStyle();

const TT_URL = "https://tabletalkmagazine.com/";

/**
 * Props:
 *  - height?: string (CSS size, default "70vh")
 *  - className?: string
 */
function TableTalkEmbed({ height = "70vh", className = "" }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`tt-frameWrap ${className}`}>
      <div className={`tt-iframeBox ${loaded ? "is-loaded" : ""}`}>
        <div className="tt-loader" aria-hidden={loaded}>
          <div className="tt-spinner" />
        </div>

        <iframe
          src={TT_URL}
          title="Tabletalk Magazine"
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <style>{getStyleOf("tableTalk.css")}</style>
    </div>
  );
}

globalThis.TableTalkEmbed = TableTalkEmbed;

return TableTalkEmbed;
