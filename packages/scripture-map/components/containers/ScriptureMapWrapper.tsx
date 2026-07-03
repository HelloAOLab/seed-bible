import { Container } from "./Container";
import { Settings } from "./Settings";
import { Controls } from "./Controls";
import { useScriptureMapWrapper } from "../../hooks/useScriptureMapWrapper";

export const ScriptureMapWrapper = () => {
  const { style } = useScriptureMapWrapper();

  return (
    <div className="scripture-map-wrapper" style={style}>
      <Settings />
      <Container />
      <Controls />
    </div>
  );
};
