const PlaylistMedia = ({ type, content, link, videoId }) => {
  switch (type) {
    case "a":
      return <a href={"#"}> {content} </a>;
    case "img":
      return <img src={link} alt="content" />;
    case "para":
      return (
        <p>
          <b>"" THIS IS DEMO TEXT "</b> {content}
        </p>
      );
    case "iframe":
      return (
        <>
          <iframe
            className="item-need-full-height"
            style={{ height: "100%" }}
            src={link}
            width="100%"
            height="100%"
            title={content}
          ></iframe>
          <a href={link} target="_blank">
            {" "}
            {content}{" "}
          </a>
        </>
      );
    case "video":
    case "video-recording":
      return (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          <video
            autoplay
            className="item-need-full-height"
            width="auto"
            style={{ margin: "auto", height: "100%" }}
            height="100%"
            src={link}
            controls
          />
        </div>
      );
    case "audio":
      return (
        <audio style={{ height: "60px" }} controls src={link}>
          {" "}
        </audio>
      );
    case "youtube":
      return (
        <>
          <iframe
            className="item-need-full-height"
            src={`${globalThis.CONSTANTS.YT_PREFIX}/${videoId}`}
            style={{ borderRadius: "16px", width: "100%", height: "100%" }}
            title={content}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; autoplay;"
            allowFullScreen
          />
        </>
      );
    default:
      return <p>{content}</p>;
  }
};

return PlaylistMedia;

//  case "ol":
// return <ol>
//     {content.map(({ type, content, link }, index) => <li key={index}> <LoreCardContentRen content={content} type={type} link={link} /> </li>)}
// </ol>;
//         case "ul":
// return <ul>
//     {content.map(({ type, content, link }, index) => <li key={index}> <LoreCardContentRen content={content} type={type} link={link} /> </li>)}
// </ul>;
