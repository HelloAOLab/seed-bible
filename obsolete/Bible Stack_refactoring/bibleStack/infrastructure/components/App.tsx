import { useApp } from "bibleStack.hooks.useApp";

export const App = () => {
  useApp();

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        className="mainCanvas"
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid black",
          overflow: "auto",
        }}
      ></div>
    </div>
  );
};
