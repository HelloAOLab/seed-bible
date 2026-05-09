const { useRef, useEffect } = os.appHooks;
const self = thisBot;
if (!this.tags.unregister) {
  const ChapterPreview = () => {
    const coverRef = useRef(null);

    useEffect(() => {
      if (!this.tags.opened) {
        this.tags.opened = true;
        console.log("first time, openings");
        coverRef.current.style.height = "600px";
      } else {
        console.log("already opened");
      }
    }, [coverRef]);

    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />

        <div
          style={{
            position: "absolute",
            width: "500px",
            height: `${this.tags.opened ? "600px" : "50px"}`,
            backgroundColor: "white",
            bottom: 0,
            right: 80,
            borderRadius: "20px",
            transition: "all .5s",
            fontFamily: "Libre Caslon Text",
          }}
          ref={coverRef}
        >
          <div
            id="contents"
            style={{
              position: "relative",
              width: "90%",
              height: "90%",
              backgroundColor: "white",
              margin: "auto",
              textAlign: "center",
              alignItems: "center",
              justifyContent: "center",
              color: "#202020",
            }}
          >
            <h1
              style={{ fontWeight: 400, fontSize: "35px", marginTop: "20px" }}
            >
              {self.tags.fetchBook}
            </h1>

            <div
              style={{
                position: "relative",
                width: "96%",
                height: "90%",
                margin: "auto",
                textAlign: "left",
                overflowX: "hidden",
                overflowY: "scroll",
                paddingBottom: "90px",
              }}
            >
              {self.tags.chapterData.data.chapter.content.map((verse, i) => {
                if (verse.type == "verse") {
                  return (
                    <span key={i} style={{ display: "inline-block" }}>
                      {verse.number}
                      {verse.content.map((m, ii) => {
                        if (typeof m === "string") {
                          return (
                            <p
                              key={ii}
                              style={{
                                display: "block",
                                textAlign: "center",
                                marginTop: "-2px",
                              }}
                            >
                              {m}
                            </p>
                          );
                        } else if (typeof m == "object" && m.text) {
                          return (
                            <p
                              key={ii}
                              style={{
                                display: "block",
                                textAlign: "center",
                                marginTop: "-2px",
                              }}
                            >
                              {m.text}
                            </p>
                          );
                        }
                      })}
                    </span>
                  );
                } else if (verse.type == "heading") {
                  return (
                    <h3 style={{ fontWeight: 400, textAlign: "center" }}>
                      {verse.content}
                    </h3>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  await os.registerApp("chapterPreview", thisBot);
  os.compileApp("chapterPreview", <ChapterPreview />);
} else {
  this.tags.opened = false;
  await os.unregisterApp("chapterPreview");
}
