import { Container } from "scriptureMap.components.containers.Container";
import { Settings } from "scriptureMap.components.containers.Settings";
import { Controls } from "scriptureMap.components.containers.Controls";
import { useScriptureMapWrapper } from "scriptureMap.hooks.useScriptureMapWrapper";

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
