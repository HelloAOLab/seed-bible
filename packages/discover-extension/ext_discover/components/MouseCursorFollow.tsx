import type { MouseCursorFollowProps } from "ext_discover.interfaces.components.MouseCursorFollow";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function MouseCursorFollow({ manager }: MouseCursorFollowProps) {
  const pointer = manager.pointer.value;
  const icon = manager.icon.value;
  const bot = getPlaylistBot();
  const stylesCss = bot.tags?.["Styles.css"] ?? "";
  const panalCss = bot.tags?.["panal.css"] ?? "";

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
      <div
        style={{
          position: "absolute",
          left: pointer.x + 5,
          top: pointer.y - 15,
          backgroundColor: "transparent",
          zIndex: "200002",
        }}
      >
        <div
          style={{
            width: "fit-content",
            zIndex: 200002,
            userSelect: "none",
            color: "black",
            background: "transparent",
          }}
        >
          <span class="material-symbols-outlined unfollow"> {icon} </span>
          <span style={{ fontSize: "10px" }}>Drop To Link</span>
        </div>
      </div>
      {stylesCss ? <style>{stylesCss}</style> : null}
      {panalCss ? <style>{panalCss}</style> : null}
    </>
  );
}
