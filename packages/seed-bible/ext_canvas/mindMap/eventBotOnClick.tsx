let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));

os.unregisterApp('eventTab')
await os.registerApp('eventTab', thisBot);

const { useEffect,useState, useRef } = os.appHooks;

function App() {
  return (
    <>
      <div class="App"
        id="main"
        onClick={(e) => {
          if (e.currentTarget.id == "main"){
              os.unregisterApp('eventTab');
          }
        }}
      >
        <div class='dialog'
          id="app-container"
          onPointerEnter={() => gridPortalBot.tags.portalZoomable = false}
          onPointerLeave={(e) => {
              if (e.currentTarget.id == "app-container"){
                  gridPortalBot.tags.portalZoomable = true
              }
          }}
        >
            <div class="header">
              <span class='title'>Bible</span>
              <div class="close" onClick={() => {
                gridPortalBot.tags.portalZoomable = true;
                os.unregisterApp('eventTab')
                }}>
                <img
                src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/2e401ba80eecd125c7b4eaf997e2222b6526bd270391df125adebeaf0fbe0d73.png"
                height="20"
                width="20"
                />
              </div>
            </div>
            <div class='description'>
              <p>
              The Bible (from Koine Greek τὰ βιβλία, tà biblía, 'the books') is a collection of religious texts or scriptures, some, all, or a variant of which, are held to be sacred in Christianity, Judaism, Samaritanism, Islam, Baha'i'ism and many other religions. The Bible is an anthology, a compilation of texts of a variety of forms, originally written in Hebrew, Aramaic, and Koine Greek. These texts include instructions, stories, poetry, and prophecies, and other genres. The collection of materials that are accepted as part of the Bible by a particular religious tradition or community is called a biblical canon. Believers in the Bible generally consider it to be a product of divine inspiration, but the way they understand what that means and interpret the text varies.
              The Bible (from Koine Greek τὰ βιβλία, tà biblía, 'the books') is a collection of religious texts or scriptures, some, all, or a variant of which, are held to be sacred in Christianity, Judaism, Samaritanism, Islam, Baha'i'ism and many other religions. The Bible is an anthology, a compilation of texts of a variety of forms, originally written in Hebrew, Aramaic, and Koine Greek. These texts include instructions, stories, poetry, and prophecies, and other genres. The collection of materials that are accepted as part of the Bible by a particular religious tradition or community is called a biblical canon. Believers in the Bible generally consider it to be a product of divine inspiration, but the way they understand what that means and interpret the text varies.
              </p>
            </div>
        </div>
        </div>
      <style>{typingTool.tags["Event.css"]}</style>
    </>
  );
}

os.compileApp('eventTab',<App />)